import { trackDataSince } from 'kitshelf-ui/backup/state.ts'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { KIT } from '../kit.ts'
import { stampMovement, withMovement } from '../money/movements.ts'
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
import { AppDataContext } from './appData.ts'
import styles from './AppDataProvider.module.css'

// The provider is mounted once, so module-level state is enough: the data as it is right now,
// which two changes in a row build on rather than on the last render.
let current: Stored = { movements: [], overrides: {}, prices: [] }

/** Loads everything from IndexedDB once, then keeps it in memory and writes every change back. */
export default function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

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

  useEffect(() => {
    let active = true
    requestPersistentStorage()
    loadAll()
      .then((stored) => {
        if (active) apply(stored)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [apply])

  // A restore writes straight to IndexedDB; memory follows by reading it back.
  const reload = useCallback(() => loadAll().then(apply), [apply])

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

  const addPrices = useCallback(
    (records: PriceRecord[]) => {
      const kept = current.prices.filter((old) => !records.some((record) => record.date === old.date))
      apply({ ...current, prices: [...kept, ...records] })
      savePrices(records).catch(report)
    },
    [apply, report],
  )

  const value = useMemo(
    () => data && { ...data, saveMovement, deleteMovement, saveSettings, setOverride, addPrices, reload },
    [data, saveMovement, deleteMovement, saveSettings, setOverride, addPrices, reload],
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
