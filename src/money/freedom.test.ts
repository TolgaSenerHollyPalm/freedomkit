import { describe, expect, it } from 'vitest'
import {
  axisTop,
  durationParts,
  durationText,
  freedom,
  freedomSeries,
  goalPercent,
  monthlyExpense,
  previewText,
  seriesLabel,
  thisMonth,
  thisMonthText,
  totalValue,
  type SeriesPoint,
} from './freedom.ts'
import { balances } from './holdings.ts'
import { unitPrice } from './prices.ts'
import { move, PRICING, RECORD, settings } from './test-helpers.ts'
import type { PriceRecord } from './types.ts'

const TAM = 7.016 * (22 / 24) * 6613

describe('the duration', () => {
  it('reads the plan’s example: 227.731 TL over 60.000 TL is 3 ay 24 gün', () => {
    expect(durationText(227_731 / 60_000)).toBe('3 ay 24 gün')
    expect(durationParts(227_731 / 60_000)).toEqual({ months: 3, days: 24 })
  })

  it('handles the edges', () => {
    expect(durationText(0)).toBe('0 gün')
    expect(durationText(0.9 / 30)).toBe('1 günden az')
    expect(durationParts(0.9 / 30)).toBeUndefined()
    expect(durationText(1 / 30)).toBe('1 gün')
    expect(durationText(29.6 / 30)).toBe('1 ay') // 29,6 days round to 30, which is a month
    expect(durationText(29.4 / 30)).toBe('29 gün')
    expect(durationText(3)).toBe('3 ay')
    expect(durationText(12 / 30)).toBe('12 gün')
    expect(durationText(2 + 29.7 / 30)).toBe('3 ay')
  })
})

describe('the goal', () => {
  it('is reached in whole percent, rounded down and never over 100', () => {
    expect(goalPercent(3.78, 6)).toBe(63)
    expect(goalPercent(1.74, 6)).toBe(29) // 0.29 does not slip to 28 on floating point
    expect(goalPercent(5.999, 6)).toBe(99)
    expect(goalPercent(6, 6)).toBe(100)
    expect(goalPercent(14, 6)).toBe(100)
  })
})

describe('the home card', () => {
  it('waits for a first movement', () => {
    expect(freedom([], settings(), PRICING)).toEqual({ state: 'empty' })
  })

  it('says there is nothing when everything has gone out', () => {
    expect(freedom([move('TRY', 100, '2026-09-01'), move('TRY', 100, '2026-09-02', 'out')], settings(), PRICING)).toEqual({ state: 'none' })
    expect(freedom([move('GRAM', 1, '2026-09-01'), move('GRAM', 1, '2026-09-02', 'out')], settings(), { overrides: {} })).toEqual({ state: 'none' })
  })

  it('divides what everything is worth by the monthly expense', () => {
    const list = [move('GRAM', 12, '2026-09-01'), move('USD', 1000, '2026-09-03'), move('CEYREK', 3, '2026-09-12'), move('TRY', 25_000, '2026-09-15')]
    const total = 12 * 6613 + 49_000 + 3 * 1.754 * (22 / 24) * 6613 + 25_000
    const card = freedom(list, settings(), PRICING)
    expect(card.state).toBe('free')
    if (card.state !== 'free') return
    expect(card.total).toBeCloseTo(total, 0)
    expect(card.months).toBeCloseTo(total / 60_000, 6)
    expect(totalValue(balances(list), PRICING)).toBeCloseTo(total, 0)
  })

  it('cannot tell without a price for something held besides lira', () => {
    const list = [move('TRY', 10_000, '2026-09-01'), move('USD', 100, '2026-09-02')]
    expect(freedom(list, settings(), { overrides: {} })).toEqual({ state: 'priceless' })
    expect(freedom([move('TRY', 10_000, '2026-09-01')], settings(), { overrides: {} }).state).toBe('free')
  })

  it('counts a kind below zero against the total', () => {
    const list = [move('TRY', 60_000, '2026-09-01'), move('USD', 100, '2026-09-02', 'out')]
    const card = freedom(list, settings(), PRICING)
    expect(card.state === 'free' && card.total).toBeCloseTo(60_000 - 4_900, 6)
  })
})

describe('gold mode: 1 ay = 1 tam altın', () => {
  const gold = settings({ expense: { mode: 'gold' } })

  it('makes a month what a tam altın is worth today', () => {
    expect(monthlyExpense(gold, PRICING)).toBeCloseTo(TAM, 2)
    const card = freedom([move('TAM', 2, '2026-09-01'), move('CEYREK', 2, '2026-09-02')], gold, PRICING)
    expect(card.state === 'free' && card.months).toBeCloseTo(2.5, 2) // two çeyrek are half a tam, by weight
  })

  it('takes the user’s own price for a tam altın as the month', () => {
    const own = { ...PRICING, overrides: { TAM: { kind: 'TAM' as const, priceTRY: 45_000, setAt: '2026-09-29T12:00:00.000Z' } } }
    expect(monthlyExpense(gold, own)).toBe(45_000)
  })

  it('cannot count months without a price for a tam altın', () => {
    expect(monthlyExpense(gold, { overrides: {} })).toBeUndefined()
    expect(freedom([move('TRY', 60_000, '2026-09-01')], gold, { overrides: {} })).toEqual({ state: 'priceless' })
  })
})

describe('the add preview', () => {
  it('says what a movement adds or takes away', () => {
    expect(previewText(2 * unitPrice('CEYREK', PRICING)!, 60_000)).toBe('Özgürlüğüne 11 gün ekler.') // 10,6 days
    expect(previewText(-5_000, 60_000)).toBe('Özgürlüğünden 3 gün eksiltir.')
    expect(previewText(70_000, 60_000)).toBe('Özgürlüğüne 1 ay 5 gün ekler.')
  })
})

describe('this month', () => {
  const today = '2026-09-29'

  it('adds this month’s movements at today’s prices, nothing else', () => {
    const list = [move('USD', 1000, '2026-08-20'), move('CEYREK', 2, '2026-09-12'), move('TRY', 5000, '2026-09-18', 'out')]
    const months = thisMonth(list, today, PRICING, 60_000)!
    expect(months).toBeCloseTo((2 * 1.754 * (22 / 24) * 6613 - 5000) / 60_000, 8)
    expect(thisMonthText(months)).toBe('Bu ay özgürlüğüne 8 gün ekledin.')
  })

  it('says when the month took some away, and nothing when it is even', () => {
    expect(thisMonthText(thisMonth([move('TRY', 24_000, '2026-09-10', 'out')], today, PRICING, 60_000))).toBe('Bu ay özgürlüğünden 12 gün eksildi.')
    expect(thisMonthText(thisMonth([move('TRY', 100, '2026-09-10'), move('TRY', 100, '2026-09-11', 'out')], today, PRICING, 60_000))).toBeUndefined()
    expect(thisMonthText(thisMonth([move('TRY', 100, '2026-08-10')], today, PRICING, 60_000))).toBeUndefined()
  })

  it('needs the prices of what moved', () => {
    expect(thisMonth([move('USD', 10, '2026-09-10')], today, { overrides: {} }, 60_000)).toBeUndefined()
  })
})

describe('the last 12 months', () => {
  const today = '2026-09-29'
  // A gram that doubles in price from one month end to the next, so the line rises with the price alone.
  const record = (date: string, gram: number): PriceRecord => ({ ...RECORD, date, xauTry: gram * 31.1034768 })
  const records = new Map([['2026-06-30', record('2026-06-30', 1000)], ['2026-07-31', record('2026-07-31', 2000)]])
  const recordFor = (day: string) => records.get(day)

  it('starts with the first movement’s month, ends with this month at today’s prices', () => {
    const list = [move('GRAM', 30, '2026-06-10'), move('TRY', 30_000, '2026-08-05')]
    const points = freedomSeries(list, today, recordFor, PRICING, 30_000)
    expect(points.map((point) => [point.month, point.day])).toEqual([
      ['2026-06', '2026-06-30'],
      ['2026-07', '2026-07-31'],
      ['2026-08', '2026-08-31'],
      ['2026-09', '2026-09-29'],
    ])
    expect(points.map((point) => point.months && Number(point.months.toFixed(4)))).toEqual([1, 2, null, Number(((30 * 6613 + 30_000) / 30_000).toFixed(4))])
  })

  it('needs no price for a month holding only lira', () => {
    const points = freedomSeries([move('TRY', 60_000, '2026-01-15')], today, () => undefined, { overrides: {} }, 60_000)
    expect(points).toHaveLength(9)
    expect(points.every((point) => point.months === 1)).toBe(true)
  })

  it('shows no more than twelve months', () => {
    const points = freedomSeries([move('TRY', 60_000, '2024-01-15')], today, () => undefined, PRICING, 60_000)
    expect(points).toHaveLength(12)
    expect(points[0].month).toBe('2025-10')
    expect(freedomSeries([], today, () => undefined, PRICING, 60_000)).toEqual([])
  })

  it('runs the axis to the whole number above the goal or the highest point', () => {
    const at = (months: (number | null)[]): SeriesPoint[] => months.map((value, i) => ({ month: `2026-0${i + 1}`, day: `2026-0${i + 1}-28`, months: value }))
    expect(axisTop(6, at([1.2, 3.8]))).toBe(7)
    expect(axisTop(3, at([1.2, 4.6, null]))).toBe(5)
  })

  it('names the line for screen readers', () => {
    const at = (months: (number | null)[]): SeriesPoint[] => months.map((value, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, day: '', months: value }))
    expect(seriesLabel(at([1.2, null, 2.6, 3.8]))).toBe('Son 4 ayda özgürlüğün 1,2 aydan 3,8 aya çıktı')
    expect(seriesLabel(at([3.8, 2.1]))).toBe('Son 2 ayda özgürlüğün 3,8 aydan 2,1 aya indi')
    expect(seriesLabel(at([2.02, 1.98]))).toBe('Son 2 ayda özgürlüğün değişmedi: 2 ay')
    expect(seriesLabel(at([3.8]))).toBe('Bu ay özgürlüğün 3,8 ay')
  })
})
