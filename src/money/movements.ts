import { amountPhrase, amountWithUnit } from './amounts.ts'
import { ASSETS } from './assets.ts'
import { monthOf, type Month } from './dates.ts'
import { availableOn, goesNegative } from './holdings.ts'
import type { Day, Movement } from './types.ts'

export const MINUS = '−'

export type MovementFields = Pick<Movement, 'kind' | 'direction' | 'amount' | 'date' | 'note'>

/** "+2 çeyrek altın", "−5.000 TL" */
export const movementTitle = (movement: Pick<Movement, 'kind' | 'direction' | 'amount'>): string =>
  `${movement.direction === 'in' ? '+' : MINUS}${amountPhrase(movement.kind, movement.amount)}`

/** The note without surrounding spaces, and no note at all when nothing is left. */
function tidy<T extends { note?: string }>(fields: T): T {
  const { note, ...rest } = fields
  const trimmed = note?.trim()
  return (trimmed ? { ...rest, note: trimmed } : rest) as T
}

export function newMovement(fields: MovementFields, now: Date, id: string = crypto.randomUUID()): Movement {
  const stamp = now.toISOString()
  return { id, ...tidy(fields), createdAt: stamp, updatedAt: stamp }
}

/** The movement with the form's fields, keeping its id and when it was made. */
export const editMovement = (movement: Movement, fields: MovementFields): Movement => {
  const { note: _old, ...kept } = movement
  return { ...kept, ...tidy(fields) }
}

export const stampMovement = (movement: Movement, now: Date): Movement => ({ ...movement, updatedAt: now.toISOString() })

/** The list with this movement in it: in its old place when it was there, at the end when it is new. */
export function withMovement(list: readonly Movement[], movement: Movement): Movement[] {
  return list.some((old) => old.id === movement.id)
    ? list.map((old) => (old.id === movement.id ? movement : old))
    : [...list, movement]
}

/** What is wrong with the form's own fields, before any balance is looked at. */
export function fieldProblems(fields: { amount?: number; date: Day }, today: Day): { amount?: string; date?: string } {
  return {
    ...(fields.amount === undefined && { amount: 'Miktarı yaz.' }),
    ...(fields.date > today && { date: 'İleri bir tarih seçilemez.' }),
  }
}

/**
 * Why adding (`before` absent), changing or deleting (`after` absent) a movement cannot go through, or undefined
 * when it can. A new outgoing movement is told how much there is; any other change, what it would do.
 */
export function balanceProblem(list: readonly Movement[], before: Movement | undefined, after: Movement | undefined): string | undefined {
  const next = after ? withMovement(list, after) : list.filter((movement) => movement.id !== before?.id)
  const changed = [before, after].filter((movement) => movement !== undefined)
  const from = changed.map((movement) => movement.date).sort()[0]
  for (const kind of new Set(changed.map((movement) => movement.kind))) {
    if (!goesNegative(list, next, kind, from)) continue
    if (!before && after?.direction === 'out') return `Elinde ${amountWithUnit(kind, availableOn(list, kind, after.date))} var.`
    return `Bu değişiklikle elindeki ${ASSETS[kind].phrase} eksiye düşer.`
  }
  return undefined
}

/** The movements by month, newest first, and newest first within each month. */
export function byMonth(list: readonly Movement[]): { month: Month; movements: Movement[] }[] {
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const groups: { month: Month; movements: Movement[] }[] = []
  for (const movement of sorted) {
    const month = monthOf(movement.date)
    if (groups.at(-1)?.month === month) groups.at(-1)!.movements.push(movement)
    else groups.push({ month, movements: [movement] })
  }
  return groups
}
