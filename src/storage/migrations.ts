import type { Movement } from '../money/types.ts'

/** The shape of the stored data: the IndexedDB version, and later a backup's dataVersion. */
export const DATA_VERSION = 1

type Step = (movement: Record<string, unknown>) => Record<string, unknown>

// One step per version, oldest first: STEPS[n] turns a movement of version n into one of version n + 1.
// The database upgrade and a backup's import both run them, so an old backup opens like an old device.
const STEPS: Record<number, Step> = {}

/** Brings a movement stored under an older version up to date; throws for a version with no way forward. */
export function migrateMovement(movement: unknown, from: number, steps: Record<number, Step> = STEPS, to = DATA_VERSION): Movement {
  if (!Number.isInteger(from) || from < 1 || from > to) throw new Error(`No migration from data version ${from}`)
  let current = movement as Record<string, unknown>
  for (let version = from; version < to; version++) {
    const step = steps[version]
    if (!step) throw new Error(`No migration from data version ${version}`)
    current = step(current)
  }
  return current as unknown as Movement
}
