import { backupFileName, createBackup, readBackup, type BackupAdapter } from 'kitshelf-ui/backup/format.ts'
import { describe, expect, it } from 'vitest'
import { KIT, KIT_NAME } from '../kit.ts'
import { move, settings } from '../money/test-helpers.ts'
import type { Movement, Overrides } from '../money/types.ts'
import { DATA_VERSION } from '../storage/migrations.ts'
import { BACKUP_TEXTS, latestChange, migrateKit, replaceWarning, summarizeKit, validateKitData } from './kitBackup.ts'
import type { KitData } from './restorePlan.ts'

const at = (day: number) => `2026-09-${String(day).padStart(2, '0')}T10:00:00.000Z`
const noted: Movement = { ...move('CEYREK', 2, '2026-09-12', 'in', 'gift'), note: 'doğum günü hediyesi' }
const overrides: Overrides = { GRAM: { kind: 'GRAM', priceTRY: 6_650.5, setAt: at(20) } }
const data: KitData = { movements: [move('TRY', 25_000, '2026-09-01'), noted, move('USD', 100, '2026-09-20', 'out')], settings: settings(), overrides }

describe('validateKitData', () => {
  it('accepts what the app stores: with or without settings, notes and own prices', () => {
    expect(validateKitData(data)).toBe(true)
    expect(validateKitData({ movements: [], overrides: {} })).toBe(true)
    expect(validateKitData({ movements: [], settings: settings({ expense: { mode: 'gold' }, updatedAt: undefined }), overrides: {} })).toBe(true)
  })

  const broken = (change: (copy: Record<string, unknown>) => void) => {
    const copy = structuredClone(noted) as unknown as Record<string, unknown>
    change(copy)
    return { ...data, movements: [copy] }
  }

  it('refuses the whole file for one broken movement', () => {
    const cases = [
      broken((m) => (m.id = '')),
      broken((m) => (m.kind = 'GUMUS')),
      broken((m) => (m.direction = 'both')),
      broken((m) => (m.amount = 0)),
      broken((m) => (m.amount = 2.5)),
      broken((m) => (m.amount = '200')),
      broken((m) => (m.date = '12 Eylül')),
      broken((m) => (m.date = '2026-02-30')),
      broken((m) => (m.note = 7)),
      broken((m) => delete m.createdAt),
      broken((m) => (m.updatedAt = 'dün')),
    ]
    for (const each of cases) expect(validateKitData(each), JSON.stringify(each.movements[0])).toBe(false)
  })

  it('refuses a movement id used twice, and anything that is not this kit’s data', () => {
    for (const each of [{ ...data, movements: [noted, noted] }, { ...data, movements: 'none' }, { movements: [] }, {}, null, []]) {
      expect(validateKitData(each)).toBe(false)
    }
  })

  it('refuses settings or own prices the screens could not use', () => {
    const cases = [
      { ...data, settings: settings({ expense: { mode: 'amount', amountTRY: 0 } }) },
      { ...data, settings: { ...settings(), expense: { mode: 'rent' } } },
      { ...data, settings: settings({ goalMonths: 0 }) },
      { ...data, settings: settings({ goalMonths: 121 }) },
      { ...data, settings: settings({ goalMonths: 6.5 }) },
      { ...data, settings: { ...settings(), expenseUpdatedAt: undefined } },
      { ...data, overrides: { TRY: { kind: 'TRY', priceTRY: 1, setAt: at(1) } } },
      { ...data, overrides: { USD: { kind: 'EUR', priceTRY: 50, setAt: at(1) } } },
      { ...data, overrides: { USD: { kind: 'USD', priceTRY: -1, setAt: at(1) } } },
      { ...data, overrides: undefined },
    ]
    for (const each of cases) expect(validateKitData(each), JSON.stringify(each)).toBe(false)
  })
})

describe('summarizeKit, migrateKit and latestChange', () => {
  it('counts the movements', () => {
    expect(summarizeKit(data)).toEqual([{ key: 'movements', count: 3, label: 'hareket' }])
  })

  it('passes the current version through and refuses one it does not know', () => {
    expect(migrateKit(data, DATA_VERSION)).toBe(data)
    expect(() => migrateKit(data, DATA_VERSION + 1)).toThrow()
    expect(() => migrateKit(data, 0)).toThrow()
  })

  it('finds the newest stamp of a movement, the settings or an own price', () => {
    const movements = [{ ...noted, updatedAt: at(5) }]
    expect(latestChange({ movements, settings: settings({ updatedAt: at(9) }), overrides: {} })).toBe(at(9))
    expect(latestChange({ movements, settings: settings({ updatedAt: undefined }), overrides })).toBe(at(20))
    expect(latestChange({ movements, overrides: {} })).toBe(at(5))
    expect(latestChange({ movements: [], overrides: {} })).toBeUndefined()
  })
})

describe('the texts', () => {
  it('warns with the number of movements replacing would delete', () => {
    expect(replaceWarning(4)).toEqual({
      title: 'Bu cihazdaki kayıtlar silinsin mi?',
      text: 'Bu cihazdaki 4 hareket, ayarların ve elle girilen fiyatlar silinecek, yerine yedektekiler gelecek. Geri alınamaz.',
    })
  })

  it('speak of savings, not of another kit’s things', () => {
    for (const words of Object.values(BACKUP_TEXTS)) expect(words).not.toMatch(/seyahat|kitap|soru paketi/i)
  })
})

// The same pieces the settings screen hands to kitshelf-ui, without React around them.
const adapter = (kit: KitData): BackupAdapter<KitData> => ({
  kit: KIT,
  kitName: KIT_NAME,
  dataVersion: DATA_VERSION,
  appBuild: 'test',
  exportData: () => kit,
  summarize: summarizeKit,
  migrate: migrateKit,
  validate: validateKitData,
  restore: async () => [],
  lastChangeAt: () => latestChange(kit),
  hasUserData: () => kit.movements.length > 0,
})

describe('a backup file', () => {
  const now = new Date('2026-10-01T12:00:00.000Z')
  const backup = createBackup(adapter(data), now)
  const empty: KitData = { movements: [], overrides: {} }

  it('is named after the kit and reads back as the same movements, settings and own prices', async () => {
    const file = new File([JSON.stringify(backup)], backupFileName(KIT, now))
    expect(file.name).toBe('freedomkit-yedek-2026-10-01.json')
    const read = await readBackup(file, adapter(empty))
    expect(read.ok && read.backup.data).toEqual(data)
    expect(read.ok && read.preview.counts).toEqual([{ key: 'movements', count: 3, label: 'hareket' }])
  })

  it('carries no price records', () => {
    expect(Object.keys(backup.data).sort()).toEqual(['movements', 'overrides', 'settings'])
    expect(backup.summary).toEqual({ movements: 3 })
  })

  it('of another kit is turned away by name, and one from a newer version asks for an update', async () => {
    const other = { ...backup, kit: 'bookkit', kitName: 'BookKit' }
    expect(await readBackup(new File([JSON.stringify(other)], 'x.json'), adapter(empty))).toEqual({ ok: false, error: 'other-kit', kitName: 'BookKit' })
    const newer = { ...backup, dataVersion: DATA_VERSION + 1 }
    expect(await readBackup(new File([JSON.stringify(newer)], 'x.json'), adapter(empty))).toEqual({ ok: false, error: 'too-new' })
  })

  it('with one broken movement is refused whole', async () => {
    const damaged = { ...backup, data: { ...data, movements: [...data.movements, { id: 'x', kind: 'TRY' }] } }
    expect(await readBackup(new File([JSON.stringify(damaged)], 'x.json'), adapter(empty))).toEqual({ ok: false, error: 'damaged' })
  })
})
