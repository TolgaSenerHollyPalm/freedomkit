import { backupKeyList } from 'kitshelf-ui/backup/state.ts'
import { wipeDevice as wipe } from 'kitshelf-ui/storage/wipe.ts'
import { DATABASE_NAME, KEYS, KIT } from '../kit.ts'

/** The keys this kit owns; anything else on the origin is none of its business. */
export const OWN_KEYS = [...Object.values(KEYS), ...backupKeyList(KIT)]

/** Removes the data and the settings, and — when there is a network to fetch the app again — its offline copy. */
export function wipeDevice({ appShell = navigator.onLine } = {}): Promise<void> {
  return wipe({ databaseNames: [DATABASE_NAME], ownKeys: OWN_KEYS, appShell, scope: import.meta.env.BASE_URL })
}
