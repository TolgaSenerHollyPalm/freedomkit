import type { AssetKind, Day, Movement } from './types.ts'

const signed = (movement: Movement) => (movement.direction === 'in' ? movement.amount : -movement.amount)

/** What is held of each kind at the end of `day` (of every day when absent), in hundredths; unmoved kinds are absent. */
export function balances(movements: readonly Movement[], day?: Day): Map<AssetKind, number> {
  const held = new Map<AssetKind, number>()
  for (const movement of movements) {
    if (day === undefined || movement.date <= day) held.set(movement.kind, (held.get(movement.kind) ?? 0) + signed(movement))
  }
  return held
}

/** The lowest end-of-day balance of a kind from `from` up to today; dates never pass today. */
export function lowestBalance(movements: readonly Movement[], kind: AssetKind, from: Day): number {
  const own = movements.filter((movement) => movement.kind === kind)
  let balance = own.filter((movement) => movement.date <= from).reduce((sum, movement) => sum + signed(movement), 0)
  let lowest = balance
  const later = own.filter((movement) => movement.date > from).sort((a, b) => a.date.localeCompare(b.date))
  later.forEach((movement, index) => {
    balance += signed(movement)
    // Several movements on one day count as one: only where the day ends matters.
    if (later[index + 1]?.date !== movement.date) lowest = Math.min(lowest, balance)
  })
  return lowest
}

/**
 * Whether going from `before` to `after` takes a kind below zero on some day from `from` on, lower than it already
 * went (plan 5.2): a change that only mends a kind already under zero always goes through.
 */
export function goesNegative(before: readonly Movement[], after: readonly Movement[], kind: AssetKind, from: Day): boolean {
  const low = lowestBalance(after, kind, from)
  return low < 0 && low < lowestBalance(before, kind, from)
}

/** How much of a kind can leave on a day without the balance going under zero on that day or any later one. */
export const availableOn = (movements: readonly Movement[], kind: AssetKind, day: Day): number =>
  Math.max(0, lowestBalance(movements, kind, day))
