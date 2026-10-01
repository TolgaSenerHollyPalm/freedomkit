import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { planRestore, type KitData } from '../backup/restorePlan.ts'
import { DATABASE_NAME } from '../kit.ts'
import type { Note } from '../notes/notes.ts'

interface KitDB extends DBSchema {
  notes: { key: string; value: Note }
}

// Also a backup's dataVersion: a new version needs its step in upgrade() below and in migrateKit (backup/kitBackup.ts).
export const DATABASE_VERSION = 1

let connection: Promise<IDBPDatabase<KitDB>> | undefined
let waitingForAnotherTab = false

/** True while an upgrade is stuck behind an older copy of the app open in another tab or window. */
export const blockedByAnotherTab = () => waitingForAnotherTab

function database() {
  connection ??= openDB<KitDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db, oldVersion) {
      // One `if` per version, oldest first: a device several versions behind runs every step it missed.
      if (oldVersion < 1) db.createObjectStore('notes', { keyPath: 'id' })
    },
    // An upgrade cannot run while an older copy of the app still holds the database open.
    blocked() {
      waitingForAnotherTab = true
    },
    blocking() {
      // Another tab wants to upgrade: let go of the database so it can, and reopen on the next call.
      const open = connection
      connection = undefined
      open?.then((db) => db.close()).catch(() => undefined)
    },
    terminated() {
      connection = undefined
    },
  })
  return connection
}

/** Lets go of the database, so deleting it is not blocked by our own connection. */
export async function closeDatabase(): Promise<void> {
  const open = connection
  connection = undefined
  await open?.then((db) => db.close()).catch(() => undefined)
}

export async function loadAll(): Promise<KitData> {
  const db = await database()
  return { notes: await db.getAll('notes') }
}

export async function saveNote(note: Note): Promise<void> {
  const db = await database()
  await db.put('notes', note)
}

export async function deleteNote(noteId: string): Promise<void> {
  const db = await database()
  await db.delete('notes', noteId)
}

/** Writes a backup in one transaction; a failure anywhere leaves the device as it was. */
export async function restoreBackup(data: KitData, mode: RestoreMode): Promise<RestoreCount[]> {
  const db = await database()
  const tx = db.transaction('notes', 'readwrite')
  // Read and planned inside the transaction; awaiting anything but its own requests would end it.
  const plan = planRestore({ notes: await tx.store.getAll() }, data, mode)
  await Promise.all([...(plan.clear ? [tx.store.clear()] : []), ...plan.notes.map((note) => tx.store.put(note)), tx.done])
  return plan.counts
}

/** Asks the browser not to clear our data when the device runs low on space. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {
    // Not granted; the data is still stored, just without the guarantee.
  })
}
