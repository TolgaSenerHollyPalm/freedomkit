import { addMonths, daysBetween, isDay, lastDayOf, monthOf, previousDay } from '../money/dates.ts'
import { balances } from '../money/holdings.ts'
import { recordFor } from '../money/prices.ts'
import type { Day, Movement, PriceRecord } from '../money/types.ts'

// Two copies of the same free, keyless service (github.com/fawazahmed0/exchange-api); either answers alone.
const MIRRORS = [
  (version: string) => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/try.json`,
  (version: string) => `https://${version}.currency-api.pages.dev/v1/currencies/try.json`,
]

export const TIMEOUT_MS = 10_000
export const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000
const LOOK_BACK_DAYS = 3
const JUMP_WINDOW_DAYS = 7
const MAX_JUMP = 0.5

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>
const network: Fetcher = (url, init) => fetch(url, init)

export const latestAddresses = (): string[] => MIRRORS.map((mirror) => mirror('latest'))
export const datedAddresses = (day: Day): string[] => MIRRORS.map((mirror) => mirror(day))

/** An answer as a record of lira rates; undefined when its date or a rate is missing, not a number, or not above zero. */
export function readAnswer(body: unknown, fetchedAt: string): PriceRecord | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const { date, try: rates } = body as { date?: unknown; try?: unknown }
  if (!isDay(date) || typeof rates !== 'object' || rates === null) return undefined
  // The service says what one lira buys; a rate is its inverse.
  const rate = (key: string) => {
    const value = (rates as Record<string, unknown>)[key]
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? 1 / value : undefined
  }
  const [usdTry, eurTry, xauTry] = ['usd', 'eur', 'xau'].map(rate)
  if (usdTry === undefined || eurTry === undefined || xauTry === undefined) return undefined
  return { date, usdTry, eurTry, xauTry, fetchedAt }
}

/** A rate that moved more than half from a record at most a week older is taken for a fault, not news (plan 4.2). */
export function implausible(record: PriceRecord, previous: PriceRecord | undefined): boolean {
  if (!previous || daysBetween(previous.date, record.date) > JUMP_WINDOW_DAYS) return false
  return (['usdTry', 'eurTry', 'xauTry'] as const).some((key) => Math.abs(record[key] - previous[key]) / previous[key] > MAX_JUMP)
}

/** One address, given up after ten seconds. No-cache: jsDelivr's answer carries a week of browser caching. */
async function ask(url: string, fetcher: Fetcher, now: () => Date): Promise<PriceRecord | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetcher(url, { cache: 'no-cache', signal: controller.signal })
    if (!response.ok) return undefined
    return readAnswer(await response.json(), now().toISOString())
  } catch {
    return undefined // offline, refused, timed out or not JSON: the other mirror may still answer
  } finally {
    clearTimeout(timer)
  }
}

export type LatestResult = { kind: 'record'; record: PriceRecord } | { kind: 'failed' } | { kind: 'implausible' }

/** Asks both mirrors at once and keeps the newer day: one of them can lag a day behind its cache (plan 4.2). */
export async function fetchLatest(previous: PriceRecord | undefined, fetcher: Fetcher = network, now = () => new Date()): Promise<LatestResult> {
  const answers = (await Promise.all(latestAddresses().map((url) => ask(url, fetcher, now)))).filter((answer) => answer !== undefined)
  if (answers.length === 0) return { kind: 'failed' }
  const sound = answers.filter((answer) => !implausible(answer, previous))
  if (sound.length === 0) {
    console.warn('Dropped a price answer that moved more than half within a week:', answers, previous)
    return { kind: 'implausible' }
  }
  return { kind: 'record', record: sound.reduce((newest, answer) => (answer.date > newest.date ? answer : newest)) }
}

/**
 * A past day's record: that day's, or the nearest of up to three days before it, marked with the day it stands in
 * for (plan 4.3). Undefined when none of them answers.
 */
export async function fetchDay(day: Day, fetcher: Fetcher = network, now = () => new Date()): Promise<PriceRecord | undefined> {
  let asked = day
  for (let back = 0; back <= LOOK_BACK_DAYS; back++) {
    for (const url of datedAddresses(asked)) {
      const record = await ask(url, fetcher, now)
      if (record) return record.date === day ? record : { ...record, monthEnd: day }
    }
    asked = previousDay(asked)
  }
  return undefined
}

/** Whether to ask again: no record yet, or the newest one fetched over six hours ago. */
export const stale = (record: PriceRecord | undefined, now: Date): boolean =>
  !record || now.getTime() - new Date(record.fetchedAt).getTime() > REFRESH_AFTER_MS

/**
 * The month ends the chart needs and the device lacks: the last eleven before this month, from the first
 * movement's, skipping those that held nothing but lira (they need no price).
 */
export function missingMonthEnds(movements: readonly Movement[], today: Day, records: readonly PriceRecord[]): Day[] {
  if (movements.length === 0) return []
  const first = monthOf(movements.reduce((earliest, movement) => (movement.date < earliest ? movement.date : earliest), today))
  const wanted: Day[] = []
  for (let back = 11; back >= 1; back--) {
    const month = addMonths(monthOf(today), -back)
    if (month < first) continue
    const end = lastDayOf(month)
    const priced = [...balances(movements, end)].some(([kind, hundredths]) => kind !== 'TRY' && hundredths !== 0)
    if (priced && !recordFor(records, end)) wanted.push(end)
  }
  return wanted
}
