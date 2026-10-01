import { describe, expect, it } from 'vitest'
import { addMonths, dayMonth, dayOfYear, daysBetween, fullDate, isDay, lastDayOf, monthTitle, previousDay, shortMonth, toDay } from './dates.ts'

describe('days and months', () => {
  it('takes the local day of a moment', () => {
    expect(toDay(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29')
  })

  it('knows a real day from a malformed one', () => {
    expect(isDay('2026-02-28')).toBe(true)
    expect(isDay('2026-02-30')).toBe(false)
    expect(isDay('2026-9-1')).toBe(false)
    expect(isDay(20260901)).toBe(false)
  })

  it('steps through months and across years', () => {
    expect(addMonths('2026-09', -11)).toBe('2025-10')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
  })

  it('finds a month’s last day, leap years too', () => {
    expect(lastDayOf('2026-02')).toBe('2026-02-28')
    expect(lastDayOf('2028-02')).toBe('2028-02-29')
    expect(lastDayOf('2026-09')).toBe('2026-09-30')
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
  })

  it('counts days whatever the clock does', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // across the spring clock change in Europe
    expect(dayOfYear('2026-01-01')).toBe(1)
    expect(dayOfYear('2026-12-31')).toBe(365)
  })

  it('writes dates the Turkish way', () => {
    expect(dayMonth('2026-09-12')).toBe('12 Eylül')
    expect(fullDate('2026-09-29')).toBe('29 Eylül 2026')
    expect(monthTitle('2026-08')).toBe('Ağustos 2026')
    expect(['2025-10', '2025-12', '2026-02', '2026-04', '2026-06', '2026-08', '2026-09'].map(shortMonth)).toEqual(['Eki', 'Ara', 'Şub', 'Nis', 'Haz', 'Ağu', 'Eyl'])
  })
})
