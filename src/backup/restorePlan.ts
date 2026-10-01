import type { RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { mergeById } from 'kitshelf-ui/backup/merge.ts'
import type { Note } from '../notes/notes.ts'

/** What the kit's backup carries, and what the app keeps in memory. */
export interface KitData {
  notes: Note[]
}

export interface RestorePlan {
  clear: boolean // replace: the store is emptied first
  notes: Note[] // to write
  counts: RestoreCount[]
}

/** What a restore writes, worked out in one go so the transaction never waits between its reads and writes. */
export function planRestore(local: KitData, incoming: KitData, mode: RestoreMode): RestorePlan {
  if (mode === 'replace') {
    const total = incoming.notes.length
    return { clear: true, notes: incoming.notes, counts: [{ key: 'notes', label: 'not', added: total, updated: 0, total }] }
  }
  const merged = mergeById(local.notes, incoming.notes)
  const kept = new Set(local.notes)
  return {
    clear: false,
    // Only what is new or newer: the rest is on the device already.
    notes: merged.items.filter((note) => !kept.has(note)),
    counts: [{ key: 'notes', label: 'not', added: merged.added, updated: merged.updated, total: merged.items.length }],
  }
}
