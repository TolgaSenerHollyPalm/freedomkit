import type { Day } from './types.ts'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const SHORT_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const DAY_MS = 86_400_000

/** A calendar month, YYYY-MM. */
export type Month = string

const pad = (n: number) => String(n).padStart(2, '0')
const split = (day: Day) => day.split('-').map(Number) as [year: number, month: number, date: number]

/** The local calendar day of a moment. */
export const toDay = (date: Date): Day => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const today = (now = new Date()): Day => toDay(now)

export const isDay = (value: unknown): value is Day =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toDay(new Date(`${value}T12:00:00`)) === value

export const monthOf = (day: Day): Month => day.slice(0, 7)

/** The month `count` months after (or before, when negative) this one. */
export function addMonths(month: Month, count: number): Month {
  const [year, number] = month.split('-').map(Number)
  const index = year * 12 + (number - 1) + count
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function lastDayOf(month: Month): Day {
  const [year, number] = month.split('-').map(Number)
  return `${month}-${pad(new Date(year, number, 0).getDate())}`
}

/** The day before, for looking a few days back when the price service has no answer for a date. */
export function previousDay(day: Day): Day {
  const [year, month, date] = split(day)
  return toDay(new Date(year, month - 1, date - 1))
}

/** Whole days from one day to another, whatever the clock changes in between. */
export function daysBetween(from: Day, to: Day): number {
  const utc = (day: Day) => {
    const [year, month, date] = split(day)
    return Date.UTC(year, month - 1, date)
  }
  return Math.round((utc(to) - utc(from)) / DAY_MS)
}

/** 1 on 1 January. */
export const dayOfYear = (day: Day): number => daysBetween(`${day.slice(0, 4)}-01-01`, day) + 1

/** "12 Eylül" */
export function dayMonth(day: Day): string {
  const [, month, date] = split(day)
  return `${date} ${MONTHS[month - 1]}`
}

/** "12 Eylül 2026" */
export const fullDate = (day: Day): string => `${dayMonth(day)} ${split(day)[0]}`

/** "Eylül 2026" */
export function monthTitle(month: Month): string {
  const [year, number] = month.split('-').map(Number)
  return `${MONTHS[number - 1]} ${year}`
}

/** "Eyl", for the chart's axis. */
export const shortMonth = (month: Month): string => SHORT_MONTHS[Number(month.slice(5, 7)) - 1]
