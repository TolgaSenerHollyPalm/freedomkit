import { backupFileName, createBackup, readBackup, type BackupAdapter } from 'kitshelf-ui/backup/format.ts'
import { describe, expect, it } from 'vitest'
import { KIT, KIT_NAME } from '../kit.ts'
import type { Note } from '../notes/notes.ts'
import { DATABASE_VERSION } from '../storage/db.ts'
import { migrateKit, summarizeKit, validateKitData } from './kitBackup.ts'
import type { KitData } from './restorePlan.ts'

const note = (fields: Partial<Note> = {}): Note => ({ id: 'n1', text: 'Süt al', updatedAt: '2026-09-29T10:00:00.000Z', ...fields })

describe('validateKitData', () => {
  it('accepts notes as the app stores them', () => {
    expect(validateKitData({ notes: [note(), note({ id: 'n2' })] })).toBe(true)
    expect(validateKitData({ notes: [] })).toBe(true)
  })

  it('refuses the whole file for one missing field, one wrong type or an id used twice', () => {
    const { text: _unused, ...withoutText } = note()
    const cases = [{ notes: [withoutText] }, { notes: [note({ text: 7 as never })] }, { notes: [note(), note()] }, { notes: 'none' }, {}, null]
    for (const data of cases) expect(validateKitData(data)).toBe(false)
  })
})

describe('summarizeKit and migrateKit', () => {
  it('counts the notes', () => {
    expect(summarizeKit({ notes: [note(), note({ id: 'n2' })] })).toEqual([{ key: 'notes', count: 2, label: 'not' }])
  })

  it('passes the current version through and refuses one it does not know', () => {
    const data = { notes: [] }
    expect(migrateKit(data, DATABASE_VERSION)).toBe(data)
    expect(() => migrateKit(data, DATABASE_VERSION + 1)).toThrow()
  })
})

// The same pieces the settings screen hands to kitshelf-ui, without React around them.
const adapter = (notes: Note[]): BackupAdapter<KitData> => ({
  kit: KIT,
  kitName: KIT_NAME,
  dataVersion: DATABASE_VERSION,
  appBuild: 'test',
  exportData: () => ({ notes }),
  summarize: summarizeKit,
  migrate: migrateKit,
  validate: validateKitData,
  restore: async () => [],
  lastChangeAt: () => undefined,
  hasUserData: () => notes.length > 0,
})

describe('a backup file', () => {
  it('is named after the kit and reads back as the same notes', async () => {
    const notes = [note(), note({ id: 'n2', text: 'İkinci satır\nçok satırlı' })]
    const now = new Date('2026-09-30T12:00:00.000Z')
    const file = new File([JSON.stringify(createBackup(adapter(notes), now))], backupFileName(KIT, now))
    expect(file.name).toBe(`${KIT}-yedek-2026-09-30.json`)

    const read = await readBackup(file, adapter([]))
    expect(read.ok && read.backup.data).toEqual({ notes })
    expect(read.ok && read.preview.counts).toEqual([{ key: 'notes', count: 2, label: 'not' }])
  })

  it('of another kit is turned away by name', async () => {
    const other = { ...createBackup(adapter([note()]), new Date()), kit: 'tripkit', kitName: 'TripKit' }
    expect(await readBackup(new File([JSON.stringify(other)], 'tripkit-yedek.json'), adapter([]))).toEqual({ ok: false, error: 'other-kit', kitName: 'TripKit' })
  })
})
