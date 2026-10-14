import { trackDataSince } from 'kitshelf-ui/backup/state.ts'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KIT } from '../kit.ts'
import { today } from '../money/dates.ts'
import { stampMovement, withMovement } from '../money/movements.ts'
import { latestRecord } from '../money/prices.ts'
import type { Movement, Overrides, PriceRecord, PricedKind, Settings } from '../money/types.ts'
import {
  blockedByAnotherTab,
  deleteMovement as removeMovement,
  loadAll,
  requestPersistentStorage,
  saveMovement as storeMovement,
  saveOverrides,
  savePrices,
  saveSettings as storeSettings,
  type Stored,
} from '../storage/db.ts'
import { fetchDay, fetchLatest, missingMonthEnds, stale } from '../prices/service.ts'
import { AppDataContext } from './appData.ts'
import styles from './AppDataProvider.module.css'

// The provider is mounted once, so module-level state is enough: the data as it is right now,
// which two changes in a row build on rather than on the last render.
let current: Stored = { movements: [], overrides: {}, prices: [] }
let askingLatest = false
let askingHistory = false // the chart's months can take minutes; today's prices never wait for them

/** Loads everything from IndexedDB once, then keeps it in memory and writes every change back. */
export default function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [priceStatus, setPriceStatus] = useState({ refreshing: false, failed: false })
  const priceFailed = priceStatus.failed

  const apply = useCallback((next: Stored) => {
    current = next
    // The backup reminder's clock starts with the first movement and stops when the last one is deleted.
    trackDataSince(KIT, next.movements.length > 0, new Date())
    setData(next)
  }, [])

  const report = useCallback((error: unknown) => {
    console.error(error)
    setSaveFailed(true)
  }, [])

  const addPrices = useCallback(
    (records: PriceRecord[]) => {
      const kept = current.prices.filter((old) => !records.some((record) => record.date === old.date))
      apply({ ...current, prices: [...kept, ...records] })
      savePrices(records).catch(report)
    },
    [apply, report],
  )

  const askLatest = useCallback(async () => {
    if (askingLatest || !navigator.onLine) return
    askingLatest = true
    setPriceStatus({ refreshing: true, failed: false })
    let failed = true
    try {
      const result = await fetchLatest(latestRecord(current.prices))
      if (result.kind === 'record') {
        addPrices([result.record])
        failed = false
      }
    } finally {
      askingLatest = false
      setPriceStatus({ refreshing: false, failed })
    }
  }, [addPrices])

  // The chart's month ends, one at a time.
  const askHistory = useCallback(async () => {
    if (askingHistory || !navigator.onLine) return
    askingHistory = true
    try {
      for (const day of missingMonthEnds(current.movements, today(), current.prices)) {
        const record = await fetchDay(day)
        if (record) addPrices([record])
      }
    } finally {
      askingHistory = false
    }
  }, [addPrices])

  const askPrices = useCallback(
    (latestToo: boolean) => {
      if (latestToo) void askLatest()
      void askHistory()
    },
    [askLatest, askHistory],
  )

  const refreshPrices = useCallback(() => askPrices(true), [askPrices])
  const loadHistory = useCallback(() => askPrices(false), [askPrices])

  useEffect(() => {
    let active = true
    requestPersistentStorage()
    loadAll()
      .then((stored) => {
        if (!active) return
        apply(stored)
        askPrices(stale(latestRecord(stored.prices), new Date()))
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [apply, askPrices])

  // Back online: ask again if today's prices are old or the last ask failed, and fill the chart's gaps.
  useEffect(() => {
    const retry = () => askPrices(priceFailed || stale(latestRecord(current.prices), new Date()))
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [askPrices, priceFailed])

  // A restore writes straight to IndexedDB; memory follows by reading it back, and the chart's month ends download.
  const reload = useCallback(
    () =>
      loadAll().then((stored) => {
        apply(stored)
        void askPrices(false)
      }),
    [apply, askPrices],
  )

  // Opening takes a moment; if it takes this long, something is in the way and the user should know.
  useEffect(() => {
    if (data) return undefined
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [data])

  const saveMovement = useCallback(
    (changed: Movement) => {
      const movement = stampMovement(changed, new Date())
      apply({ ...current, movements: withMovement(current.movements, movement) })
      storeMovement(movement).catch(report)
    },
    [apply, report],
  )

  const deleteMovement = useCallback(
    (movementId: string) => {
      apply({ ...current, movements: current.movements.filter((movement) => movement.id !== movementId) })
      removeMovement(movementId).catch(report)
    },
    [apply, report],
  )

  const saveSettings = useCallback(
    (settings: Settings) => {
      apply({ ...current, settings })
      storeSettings(settings).catch(report)
    },
    [apply, report],
  )

  const setOverride = useCallback(
    (kind: PricedKind, priceTRY: number | undefined) => {
      const { [kind]: _old, ...others } = current.overrides
      const overrides: Overrides =
        priceTRY === undefined ? others : { ...others, [kind]: { kind, priceTRY, setAt: new Date().toISOString() } }
      apply({ ...current, overrides })
      saveOverrides(overrides).catch(report)
    },
    [apply, report],
  )

  const value = useMemo(
    () => data && { ...data, saveMovement, deleteMovement, saveSettings, setOverride, addPrices, priceStatus, refreshPrices, loadHistory, reload },
    [data, saveMovement, deleteMovement, saveSettings, setOverride, addPrices, priceStatus, refreshPrices, loadHistory, reload],
  )

  if (loadFailed) {
    return <p className={styles.message}>Kayıtlı veriler açılamadı. Uygulamayı kapatıp yeniden aç.</p>
  }
  if (!value) {
    if (slowLoad && blockedByAnotherTab()) {
      return (
        <p className={styles.message}>
          Uygulama başka bir sekmede ya da pencerede daha eski bir sürümle açık. Oradaki sekmeyi kapatıp bu sayfayı
          yenile.
        </p>
      )
    }
    return null
  }

  return (
    <AppDataContext value={value}>
      {saveFailed && (
        <p className={styles.warning} role="alert">
          Son değişiklik kaydedilemedi. Telefonda yer kalmamış olabilir.
        </p>
      )}
      {children}
    </AppDataContext>
  )
}
