import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { DATABASE_NAME } from '../kit.ts'
import type { Movement, Overrides, PriceRecord, Settings } from '../money/types.ts'
import { DATA_VERSION, migrateMovement } from './migrations.ts'

interface FreedomKitDB extends DBSchema {
  movements: { key: string; value: Movement }
  prices: { key: string; value: PriceRecord } // keyed by the record's own date
  meta: { key: 'settings' | 'overrides'; value: Settings | Overrides }
}

export interface Stored {
  movements: Movement[]
  settings?: Settings // absent until the first-run welcome is answered
  overrides: Overrides
  prices: PriceRecord[]
}

let connection: Promise<IDBPDatabase<FreedomKitDB>> | undefined
let waitingForAnotherTab = false

/** True while an upgrade is stuck behind an older copy of the app open in another tab or window. */
export const blockedByAnotherTab = () => waitingForAnotherTab

function database() {
  connection ??= openDB<FreedomKitDB>(DATABASE_NAME, DATA_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('movements', { keyPath: 'id' })
        db.createObjectStore('prices', { keyPath: 'date' })
        db.createObjectStore('meta')
        return
      }
      // An older device: every stored movement takes the steps a backup of that age would (storage/migrations.ts).
      const movements = tx.objectStore('movements')
      for (const movement of await movements.getAll()) await movements.put(migrateMovement(movement, oldVersion))
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

export async function loadAll(): Promise<Stored> {
  const db = await database()
  const tx = db.transaction(['movements', 'prices', 'meta'])
  const [movements, prices, settings, overrides] = await Promise.all([
    tx.objectStore('movements').getAll(),
    tx.objectStore('prices').getAll(),
    tx.objectStore('meta').get('settings'),
    tx.objectStore('meta').get('overrides'),
  ])
  return { movements, prices, settings: settings as Settings | undefined, overrides: (overrides as Overrides | undefined) ?? {} }
}

export async function saveMovement(movement: Movement): Promise<void> {
  const db = await database()
  await db.put('movements', movement)
}

export async function deleteMovement(movementId: string): Promise<void> {
  const db = await database()
  await db.delete('movements', movementId)
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await database()
  await db.put('meta', settings, 'settings')
}

export async function saveOverrides(overrides: Overrides): Promise<void> {
  const db = await database()
  await db.put('meta', overrides, 'overrides')
}

export async function savePrices(records: readonly PriceRecord[]): Promise<void> {
  const db = await database()
  const tx = db.transaction('prices', 'readwrite')
  await Promise.all([...records.map((record) => tx.store.put(record)), tx.done])
}

/** Asks the browser not to clear our data when the device runs low on space. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {
    // Not granted; the data is still stored, just without the guarantee.
  })
}
