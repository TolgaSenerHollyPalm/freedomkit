import type { RestoreCount, RestoreMode } from 'kitshelf-ui/backup/format.ts'
import { mergeById } from 'kitshelf-ui/backup/merge.ts'
import { PRICED_KINDS } from '../money/assets.ts'
import type { Movement, Overrides, Settings } from '../money/types.ts'

/** What a backup carries. Prices stay out: today's are fetched again and past ones download again (plan 7). */
export interface KitData {
  movements: Movement[]
  settings?: Settings
  overrides: Overrides
}

/** The count line that is not about movements: 1 when a merge changed the settings or one's own prices. */
export const SETTINGS_KEY = 'settings'

export interface RestorePlan {
  clear: boolean // replace: the movements are emptied first
  movements: Movement[] // to write
  settings?: Settings // the settings afterwards; none after replacing with a backup that had none
  overrides: Overrides // one's own prices afterwards
  counts: RestoreCount[]
}

const time = (stamp?: string) => Date.parse(stamp ?? '') || 0

// The welcome's settings carry no stamp, so any backup's replace them: on a new phone the old settings stay (plan 6.6).
function takeSettings(local?: Settings, incoming?: Settings): boolean {
  if (!incoming) return false
  if (local?.updatedAt === undefined) return true
  return time(incoming.updatedAt) > time(local.updatedAt)
}

/** What a restore writes, worked out in one go so the transaction never waits between its reads and writes. */
export function planRestore(local: KitData, incoming: KitData, mode: RestoreMode): RestorePlan {
  if (mode === 'replace') {
    const total = incoming.movements.length
    return {
      clear: true,
      movements: incoming.movements,
      settings: incoming.settings,
      overrides: incoming.overrides,
      counts: [{ key: 'movements', label: 'hareket', added: total, updated: 0, total }],
    }
  }
  const merged = mergeById(local.movements, incoming.movements)
  const onDevice = new Set(local.movements)
  const settings = takeSettings(local.settings, incoming.settings)
  const overrides: Overrides = { ...local.overrides }
  let ownPrices = 0
  for (const kind of PRICED_KINDS) {
    const theirs = incoming.overrides[kind]
    const mine = local.overrides[kind]
    if (theirs && (!mine || time(theirs.setAt) > time(mine.setAt))) {
      overrides[kind] = theirs
      ownPrices += 1
    }
  }
  return {
    clear: false,
    // Only what is new or newer: the rest is on the device already.
    movements: merged.items.filter((movement) => !onDevice.has(movement)),
    settings: settings ? incoming.settings : local.settings,
    overrides,
    counts: [
      { key: 'movements', label: 'hareket', added: merged.added, updated: merged.updated, total: merged.items.length },
      { key: SETTINGS_KEY, label: 'ayar', added: 0, updated: settings || ownPrices > 0 ? 1 : 0, total: 1 },
    ],
  }
}
