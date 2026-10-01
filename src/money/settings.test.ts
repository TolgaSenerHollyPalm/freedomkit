import { describe, expect, it } from 'vitest'
import { clampGoal, editedSettings, expenseProblem, welcomeSettings } from './settings.ts'

const now = new Date('2026-09-29T10:00:00.000Z')
const later = new Date('2026-10-02T10:00:00.000Z')

describe('settings', () => {
  it('start from the welcome unstamped, with a six-month goal', () => {
    const first = welcomeSettings({ mode: 'amount', amountTRY: 60_000 }, now)
    expect(first).toEqual({ expense: { mode: 'amount', amountTRY: 60_000 }, goalMonths: 6, expenseUpdatedAt: now.toISOString() })
    expect(first).not.toHaveProperty('updatedAt')
  })

  it('are stamped when saved, and move the expense’s date only when the expense changed', () => {
    const first = welcomeSettings({ mode: 'amount', amountTRY: 60_000 }, now)
    const goalOnly = editedSettings(first, { expense: { mode: 'amount', amountTRY: 60_000 }, goalMonths: 9 }, later)
    expect(goalOnly).toEqual({ expense: { mode: 'amount', amountTRY: 60_000 }, goalMonths: 9, expenseUpdatedAt: now.toISOString(), updatedAt: later.toISOString() })
    expect(editedSettings(first, { expense: { mode: 'amount', amountTRY: 65_000 }, goalMonths: 6 }, later).expenseUpdatedAt).toBe(later.toISOString())
    expect(editedSettings(first, { expense: { mode: 'gold' }, goalMonths: 6 }, later).expenseUpdatedAt).toBe(later.toISOString())
  })

  it('keep the goal between 1 and 120 months', () => {
    expect([0, 1, 6.4, 120, 500].map(clampGoal)).toEqual([1, 1, 6, 120, 120])
  })

  it('need a monthly expense above zero in amount mode', () => {
    expect(expenseProblem({ mode: 'amount', amountTRY: undefined })).toBe('Aylık giderini yaz.')
    expect(expenseProblem({ mode: 'amount', amountTRY: 0 })).toBe('Aylık giderini yaz.')
    expect(expenseProblem({ mode: 'amount', amountTRY: 1 })).toBeUndefined()
    expect(expenseProblem({ mode: 'gold' })).toBeUndefined()
  })
})
