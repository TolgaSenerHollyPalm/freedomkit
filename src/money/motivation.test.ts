import { describe, expect, it } from 'vitest'
import { dailySentence, expenseReminder, FIXED_SENTENCES } from './motivation.ts'
import { settings } from './test-helpers.ts'

describe('the day’s sentence', () => {
  it('takes the fixed lines in turn, one a day', () => {
    // 1 January is day 1; with five lines, day 1 takes the second.
    expect(dailySentence('2026-01-01', { goalMonths: 6 })).toBe(FIXED_SENTENCES[1])
    expect(dailySentence('2026-01-05', { goalMonths: 6 })).toBe(FIXED_SENTENCES[0])
    const week = ['2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'].map((day) => dailySentence(day, { goalMonths: 6 }))
    expect(new Set(week).size).toBe(5)
  })

  it('adds what this month brought and how far the goal is', () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
    const lines = new Set(days.map((day) => dailySentence(day, { months: 3.7955, thisMonth: 0.3544, goalMonths: 6 })))
    expect(lines).toContain('Bu ay özgürlüğüne 11 gün ekledin.')
    expect(lines).toContain('Hedefine 2 ay 6 gün kaldı.')
    expect(lines.size).toBe(7)
  })

  it('says so once the goal is reached, and nothing about a month that took away', () => {
    const days = Array.from({ length: 6 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`)
    const lines = new Set(days.map((day) => dailySentence(day, { months: 7.4, thisMonth: -0.2, goalMonths: 6 })))
    expect(lines).toContain('Hedefine ulaştın: 7 ay özgürsün.')
    expect([...lines].some((line) => line.startsWith('Bu ay'))).toBe(false)
  })
})

describe('the expense reminder', () => {
  const now = new Date('2026-09-29T12:00:00.000Z')
  const typedDaysAgo = (days: number) => settings({ expenseUpdatedAt: new Date(now.getTime() - days * 86_400_000).toISOString() })

  it('waits 180 days', () => {
    expect(expenseReminder(typedDaysAgo(179), now)).toBeUndefined()
    expect(expenseReminder(typedDaysAgo(180), now)).toBeUndefined()
    expect(expenseReminder(typedDaysAgo(181), now)).toBe(6)
    expect(expenseReminder(typedDaysAgo(400), now)).toBe(13)
  })

  it('never comes in gold mode, which follows the price by itself', () => {
    expect(expenseReminder(settings({ expense: { mode: 'gold' }, expenseUpdatedAt: '2025-01-01T00:00:00.000Z' }), now)).toBeUndefined()
  })
})
