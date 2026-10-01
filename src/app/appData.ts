import { createContext, useContext } from 'react'
import type { KitData } from '../backup/restorePlan.ts'
import type { NoteDraft } from '../notes/notes.ts'

export interface AppData extends KitData {
  /** Stores a note, adding it when it is new, and stamps it with the time. */
  saveNote: (note: NoteDraft) => void
  deleteNote: (noteId: string) => void
  /** Reads everything from IndexedDB again, e.g. after a backup was restored. */
  reload: () => Promise<void>
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const data = useContext(AppDataContext)
  if (!data) throw new Error('useAppData must be used inside <AppDataProvider>')
  return data
}
