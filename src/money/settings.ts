import type { Expense, Settings } from './types.ts'

export const DEFAULT_GOAL_MONTHS = 6
export const GOAL_LIMITS = { min: 1, max: 120 } as const

export const clampGoal = (months: number): number => Math.min(GOAL_LIMITS.max, Math.max(GOAL_LIMITS.min, Math.round(months)))

const sameExpense = (a: Expense, b: Expense) =>
  a.mode === b.mode && (a.mode === 'gold' || a.amountTRY === (b as typeof a).amountTRY)

/** What the first-run welcome saves: not stamped, so a backup's settings win when it is merged in (plan 6.6). */
export const welcomeSettings = (expense: Expense, now: Date): Settings => ({
  expense,
  goalMonths: DEFAULT_GOAL_MONTHS,
  expenseUpdatedAt: now.toISOString(),
})

/** The settings after "Kaydet" on the goal screen: stamped, with the expense's own date moved only when it changed. */
export function editedSettings(previous: Settings | undefined, next: Pick<Settings, 'expense' | 'goalMonths'>, now: Date): Settings {
  const stamp = now.toISOString()
  const expenseUpdatedAt = previous && sameExpense(previous.expense, next.expense) ? previous.expenseUpdatedAt : stamp
  return { expense: next.expense, goalMonths: clampGoal(next.goalMonths), expenseUpdatedAt, updatedAt: stamp }
}

/** What is wrong with the typed expense; a monthly expense has to be more than zero. */
export const expenseProblem = (expense: Expense | { mode: 'amount'; amountTRY?: number }): string | undefined =>
  expense.mode === 'amount' && !(expense.amountTRY !== undefined && expense.amountTRY > 0) ? 'Aylık giderini yaz.' : undefined
