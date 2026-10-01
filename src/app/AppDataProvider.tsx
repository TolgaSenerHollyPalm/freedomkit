import { trackDataSince } from 'kitshelf-ui/backup/state.ts'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { KitData } from '../backup/restorePlan.ts'
import { KIT } from '../kit.ts'
import { stampNote, withNote, type NoteDraft } from '../notes/notes.ts'
import { blockedByAnotherTab, deleteNote as removeNote, loadAll, requestPersistentStorage, saveNote as storeNote } from '../storage/db.ts'
import { AppDataContext } from './appData.ts'
import styles from './AppDataProvider.module.css'

// The provider is mounted once, so module-level state is enough: the data as it is right now,
// which two changes in a row build on rather than on the last render.
let current: KitData = { notes: [] }

/** Loads the data from IndexedDB once, then keeps it in memory and writes every change back. */
export default function AppDataProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState<KitData>()
  const [loadFailed, setLoadFailed] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const apply = useCallback((data: KitData) => {
    current = data
    // The backup reminder's clock starts with the first note and stops when the last one is deleted.
    trackDataSince(KIT, data.notes.length > 0, new Date())
    setLoaded(data)
  }, [])

  useEffect(() => {
    let active = true
    requestPersistentStorage()
    loadAll()
      .then((data) => {
        if (active) apply(data)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (active) setLoadFailed(true)
      })
    return () => {
      active = false
    }
  }, [apply])

  // Opening takes a moment; if it takes this long, something is in the way and the user should know.
  useEffect(() => {
    if (loaded) return undefined
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [loaded])

  const report = useCallback((error: unknown) => {
    console.error(error)
    setSaveFailed(true)
  }, [])

  const saveNote = useCallback(
    (draft: NoteDraft) => {
      const note = stampNote(draft, new Date())
      apply({ notes: withNote(current.notes, note) })
      storeNote(note).catch(report)
    },
    [apply, report],
  )

  const deleteNote = useCallback(
    (noteId: string) => {
      apply({ notes: current.notes.filter((note) => note.id !== noteId) })
      removeNote(noteId).catch(report)
    },
    [apply, report],
  )

  // A restore writes straight to IndexedDB; memory follows by reading it back.
  const reload = useCallback(async () => apply(await loadAll()), [apply])

  const value = useMemo(() => loaded && { ...loaded, saveNote, deleteNote, reload }, [loaded, saveNote, deleteNote, reload])

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
