import type { BackupAdapter, CountLine } from 'kitshelf-ui/backup/format.ts'
import { backupDue } from 'kitshelf-ui/backup/reminder.ts'
import { readBackupState, snoozeReminder, type BackupState } from 'kitshelf-ui/backup/state.ts'
import { useCallback, useMemo, useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { KIT, KIT_NAME } from '../kit.ts'
import { latestChange, type Note } from '../notes/notes.ts'
import { DATABASE_VERSION, restoreBackup } from '../storage/db.ts'
import type { KitData } from './restorePlan.ts'

/** The kit's own words in the shared backup parts. */
export const BACKUP_TEXTS = {
  card: 'Notların yalnızca bu cihazda duruyor. Yedek dosyasını Drive’a, e-postana ya da kendine gönder; telefon değişirse buradan geri yüklersin.',
  merge: 'Bu cihazda olmayan notlar eklenir. İkisinde de olan notun daha yeni hâli kalır. Hiçbir şey silinmez.',
  replace: 'Bu cihazdaki notlar silinir, yerine yedektekiler gelir.',
  banner: 'Telefonun değişirse notların kaybolmasın.',
}

export function replaceWarning(localNotes: number, backupNotes: number) {
  return {
    title: 'Bu cihazdaki notlar silinsin mi?',
    text: `Bu cihazdaki ${localNotes} not silinecek, yerine yedekteki ${backupNotes} not gelecek. Geri alınamaz.`,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** The shape a stored note has had since version 1. */
const isNote = (value: unknown): value is Note =>
  isRecord(value) && typeof value.id === 'string' && value.id !== '' && typeof value.text === 'string' && typeof value.updatedAt === 'string'

/** Structure only: one bad note, or an id used twice, and the whole file is refused. */
export function validateKitData(data: unknown): data is KitData {
  if (!isRecord(data) || !Array.isArray(data.notes) || !data.notes.every(isNote)) return false
  return new Set(data.notes.map((note) => note.id)).size === data.notes.length
}

export function summarizeKit(data: KitData): CountLine[] {
  return [{ key: 'notes', count: data.notes.length, label: 'not' }]
}

/** Backups began with data version 1; a later version adds its step here, as upgrade() in db.ts does for stored records. */
export function migrateKit(data: unknown, from: number): unknown {
  if (from === DATABASE_VERSION) return data
  throw new Error(`No backup migration from data version ${from}`)
}

/** The adapter reads what is in memory, so the share sheet can open right after the tap. */
export function useKitBackup(): BackupAdapter<KitData> {
  const { notes, reload } = useAppData()
  return useMemo(
    () => ({
      kit: KIT,
      kitName: KIT_NAME,
      dataVersion: DATABASE_VERSION,
      appBuild: __BUILD_TIME__,
      exportData: () => ({ notes }),
      summarize: summarizeKit,
      migrate: migrateKit,
      validate: validateKitData,
      async restore(data, mode) {
        const counts = await restoreBackup(data, mode)
        await reload()
        return counts
      },
      lastChangeAt: () => latestChange(notes),
      hasUserData: () => notes.length > 0,
    }),
    [notes, reload],
  )
}

function reminderOf(state: BackupState, notes: readonly Note[]) {
  return backupDue({ now: new Date(), hasUserData: notes.length > 0, lastChangeAt: latestChange(notes), ...state })
}

/** Whether a backup is due, for the home screen's banner and dot and for the settings card. */
export function useBackupReminder() {
  const { notes } = useAppData()
  const [state, setState] = useState(() => readBackupState(KIT))
  const refresh = useCallback(() => setState(readBackupState(KIT)), [])
  const snooze = useCallback(() => {
    snoozeReminder(KIT, new Date())
    setState(readBackupState(KIT))
  }, [])
  return { reminder: reminderOf(state, notes), lastBackupAt: state.lastBackupAt, refresh, snooze }
}
