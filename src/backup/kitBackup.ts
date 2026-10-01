import type { BackupAdapter, CountLine, RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { backupDue } from 'kitshelf-ui/backup/reminder.ts'
import { readBackupState, snoozeReminder, type BackupState } from 'kitshelf-ui/backup/state.ts'
import { restoreMessage } from 'kitshelf-ui/backup/texts.ts'
import { useCallback, useMemo, useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { KIT, KIT_NAME } from '../kit.ts'
import { isAssetKind, PRICED_KINDS } from '../money/assets.ts'
import { isDay } from '../money/dates.ts'
import type { Movement, Overrides, Settings } from '../money/types.ts'
import { restoreBackup } from '../storage/db.ts'
import { DATA_VERSION, migrateMovement } from '../storage/migrations.ts'
import { SETTINGS_KEY, type KitData } from './restorePlan.ts'

/** The kit's own words in the shared backup parts (plan 9). */
export const BACKUP_TEXTS = {
  card: 'Birikim kayıtların yalnızca bu cihazda duruyor. Yedek dosyasını Drive’a, e-postana ya da kendine gönder; telefon değişirse buradan geri yüklersin. Dosyada tutarların var; güvendiğin bir yere kaydet.',
  merge: 'Bu cihazda olmayan hareketler eklenir. İkisinde de olanın daha yeni hâli kalır. Hiçbir şey silinmez.',
  replace: 'Bu cihazdaki hareketler, ayarlar ve elle girilen fiyatlar silinir, yerine yedektekiler gelir.',
  banner: 'Telefonun değişirse birikim kayıtların kaybolmasın.',
}

export const replaceWarning = (movements: number) => ({
  title: 'Bu cihazdaki kayıtlar silinsin mi?',
  text: `Bu cihazdaki ${movements} hareket, ayarların ve elle girilen fiyatlar silinecek, yerine yedektekiler gelecek. Geri alınamaz.`,
})

/** kitshelf-ui's message, plus the one it has no words for: a merge that changed only the settings or prices. */
export function restoredText(counts: RestoreCount[], mode: RestoreMode): string {
  const movements = counts.filter((count) => count.key !== SETTINGS_KEY)
  const settings = counts.find((count) => count.key === SETTINGS_KEY)
  const nothingMoved = movements.every((count) => count.added === 0 && count.updated === 0)
  if (mode === 'merge' && nothingMoved && settings && settings.updated > 0) return 'Geri yüklendi: ayarlar güncellendi.'
  return restoreMessage(movements, mode)
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string'
const isMoment = (value: unknown): boolean => isText(value) && !Number.isNaN(Date.parse(value))
const isPositive = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0
const maybe = (value: unknown, check: (value: unknown) => boolean): boolean => value === undefined || check(value)

// The shape a stored movement has had since version 1.
const isMovement = (value: unknown): value is Movement =>
  isRecord(value) &&
  isText(value.id) &&
  value.id !== '' &&
  isAssetKind(value.kind) &&
  (value.direction === 'in' || value.direction === 'out') &&
  Number.isSafeInteger(value.amount) &&
  (value.amount as number) > 0 &&
  isDay(value.date) &&
  maybe(value.note, isText) &&
  isMoment(value.createdAt) &&
  isMoment(value.updatedAt)

const isSettings = (value: unknown): value is Settings =>
  isRecord(value) &&
  isRecord(value.expense) &&
  ((value.expense.mode === 'amount' && isPositive(value.expense.amountTRY)) || value.expense.mode === 'gold') &&
  Number.isInteger(value.goalMonths) &&
  (value.goalMonths as number) >= 1 &&
  (value.goalMonths as number) <= 120 &&
  isMoment(value.expenseUpdatedAt) &&
  maybe(value.updatedAt, isMoment)

const isOverrides = (value: unknown): value is Overrides =>
  isRecord(value) &&
  Object.entries(value).every(
    ([kind, own]) => (PRICED_KINDS as readonly string[]).includes(kind) && isRecord(own) && own.kind === kind && isPositive(own.priceTRY) && isMoment(own.setAt),
  )

/** Structure only: one bad movement, an id used twice, or settings that make no sense, and the whole file is refused. */
export function validateKitData(data: unknown): data is KitData {
  if (!isRecord(data) || !Array.isArray(data.movements) || !data.movements.every(isMovement)) return false
  return new Set(data.movements.map((movement) => movement.id)).size === data.movements.length && maybe(data.settings, isSettings) && isOverrides(data.overrides)
}

export const summarizeKit = (data: KitData): CountLine[] => [{ key: 'movements', count: data.movements.length, label: 'hareket' }]

/** An older backup takes the steps an older device's movements take (storage/migrations.ts); an unknown version throws. */
export function migrateKit(data: unknown, from: number): unknown {
  if (from === DATA_VERSION) return data
  // Asked here too: a backup with no movements in it would otherwise pass whatever its version.
  if (!Number.isInteger(from) || from < 1 || from > DATA_VERSION) throw new Error(`No backup migration from data version ${from}`)
  if (!isRecord(data) || !Array.isArray(data.movements)) throw new Error('A backup without movements')
  return { ...data, movements: data.movements.map((movement) => migrateMovement(movement, from)) }
}

/** When anything last changed: the newest stamp of a movement, of the settings, or of one's own price (plan 7). */
export function latestChange(data: KitData): string | undefined {
  const stamps = [...data.movements.map((movement) => movement.updatedAt), data.settings?.updatedAt, ...Object.values(data.overrides).map((own) => own?.setAt)]
  return stamps.reduce<string | undefined>((latest, stamp) => (stamp && (!latest || stamp > latest) ? stamp : latest), undefined)
}

/** The adapter reads what is in memory, so the share sheet can open right after the tap. */
export function useKitBackup(): BackupAdapter<KitData> {
  const { movements, settings, overrides, reload } = useAppData()
  return useMemo(() => {
    const data: KitData = { movements, overrides, ...(settings && { settings }) }
    return {
      kit: KIT,
      kitName: KIT_NAME,
      dataVersion: DATA_VERSION,
      appBuild: __BUILD_TIME__,
      exportData: () => data,
      summarize: summarizeKit,
      migrate: migrateKit,
      validate: validateKitData,
      async restore(incoming, mode) {
        const counts = await restoreBackup(incoming, mode)
        await reload()
        return counts
      },
      lastChangeAt: () => latestChange(data),
      hasUserData: () => movements.length > 0,
    }
  }, [movements, settings, overrides, reload])
}

function reminderOf(state: BackupState, data: KitData) {
  return backupDue({ now: new Date(), hasUserData: data.movements.length > 0, lastChangeAt: latestChange(data), ...state })
}

/** Whether a backup is due, for the home screen's banner and dot and for the settings card. */
export function useBackupReminder() {
  const { movements, settings, overrides } = useAppData()
  const [state, setState] = useState(() => readBackupState(KIT))
  const refresh = useCallback(() => setState(readBackupState(KIT)), [])
  const snooze = useCallback(() => {
    snoozeReminder(KIT, new Date())
    setState(readBackupState(KIT))
  }, [])
  return { reminder: reminderOf(state, { movements, settings, overrides }), lastBackupAt: state.lastBackupAt, refresh, snooze }
}
