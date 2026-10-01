import { formatMonths } from './amounts.ts'
import { addMonths, lastDayOf, monthOf, type Month } from './dates.ts'
import { balances } from './holdings.ts'
import { unitPrice, valueOf, type Pricing } from './prices.ts'
import type { AssetKind, Day, Movement, PriceRecord, Settings } from './types.ts'

const DAYS_PER_MONTH = 30
// Ratios like 0.29 come out of division as 0.28999…; this keeps the floor from losing a whole percent.
const EPSILON = 1e-9

/** A month's expense in lira; undefined in gold mode while a tam altın has no price. */
export const monthlyExpense = (settings: Settings, pricing: Pricing): number | undefined =>
  settings.expense.mode === 'amount' ? settings.expense.amountTRY : unitPrice('TAM', pricing)

/** What the held amounts are worth in lira; undefined when a kind held, other than lira, has no price. */
export function totalValue(held: ReadonlyMap<AssetKind, number>, pricing: Pricing): number | undefined {
  let total = 0
  for (const [kind, hundredths] of held) {
    if (hundredths === 0) continue
    const price = unitPrice(kind, pricing)
    if (price === undefined) return undefined
    total += valueOf(hundredths, price)
  }
  return total
}

export type Freedom =
  | { state: 'empty' } // no movement yet: "Henüz birikim yok"
  | { state: 'none' } // movements, but nothing above zero: "Şu an birikimin yok"
  | { state: 'priceless' } // a price it needs is missing: "Fiyatlar alınamadı"
  | { state: 'free'; months: number; total: number; expense: number }

/** The home card: how many months what is held today would pay for. */
export function freedom(movements: readonly Movement[], settings: Settings, pricing: Pricing): Freedom {
  if (movements.length === 0) return { state: 'empty' }
  const held = balances(movements)
  if ([...held.values()].every((hundredths) => hundredths === 0)) return { state: 'none' }
  const total = totalValue(held, pricing)
  if (total === undefined) return { state: 'priceless' }
  if (total <= 0) return { state: 'none' }
  const expense = monthlyExpense(settings, pricing)
  if (expense === undefined || expense <= 0) return { state: 'priceless' }
  return { state: 'free', months: total / expense, total, expense }
}

/** Months of 30 days and the days left over, rounded; 30 days make the next month. Undefined below one day. */
export function durationParts(months: number): { months: number; days: number } | undefined {
  if (months * DAYS_PER_MONTH < 1 - EPSILON) return undefined
  let whole = Math.floor(months)
  let days = Math.round((months - whole) * DAYS_PER_MONTH)
  if (days === DAYS_PER_MONTH) {
    whole += 1
    days = 0
  }
  return { months: whole, days }
}

/** "3 ay 24 gün", "3 ay", "12 gün", "1 günden az"; "0 gün" for nothing at all. */
export function durationText(months: number): string {
  if (months <= 0) return '0 gün'
  const parts = durationParts(months)
  if (!parts) return '1 günden az'
  return [parts.months > 0 && `${parts.months} ay`, parts.days > 0 && `${parts.days} gün`].filter(Boolean).join(' ')
}

/** The share of the goal reached, in whole percent and at most 100. */
export const goalPercent = (months: number, goalMonths: number): number =>
  Math.floor(Math.min(months / goalMonths, 1) * 100 + EPSILON)

/** Under the add form: "Özgürlüğüne 10 gün ekler." or, for money leaving, "Özgürlüğünden 10 gün eksiltir." */
export const previewText = (signedValue: number, expense: number): string =>
  signedValue >= 0
    ? `Özgürlüğüne ${durationText(signedValue / expense)} ekler.`
    : `Özgürlüğünden ${durationText(-signedValue / expense)} eksiltir.`

/**
 * What this month's movements added, in months at today's prices; price changes are left out (plan 5.2).
 * Undefined when a price it needs is missing.
 */
export function thisMonth(movements: readonly Movement[], today: Day, pricing: Pricing, expense: number): number | undefined {
  let value = 0
  for (const movement of movements) {
    if (monthOf(movement.date) !== monthOf(today)) continue
    const price = unitPrice(movement.kind, pricing)
    if (price === undefined) return undefined
    value += valueOf(movement.direction === 'in' ? movement.amount : -movement.amount, price)
  }
  return value / expense
}

/** "Bu ay özgürlüğüne 1 ay 5 gün ekledin." / "Bu ay özgürlüğünden 12 gün eksildi."; nothing when it is zero. */
export function thisMonthText(months: number | undefined): string | undefined {
  if (!months) return undefined
  return months > 0 ? `Bu ay özgürlüğüne ${durationText(months)} ekledin.` : `Bu ay özgürlüğünden ${durationText(-months)} eksildi.`
}

export interface SeriesPoint {
  month: Month
  day: Day // the month's last day, or today for this month
  months: number | null // null where a price was missing: a gap in the line
}

/**
 * The chart: for each of the last 12 months from the first with a movement, what was held at its end at that
 * day's prices, over today's expense. This month uses today's prices, the user's own included.
 */
export function freedomSeries(
  movements: readonly Movement[],
  today: Day,
  recordFor: (day: Day) => PriceRecord | undefined,
  pricing: Pricing,
  expense: number,
): SeriesPoint[] {
  if (movements.length === 0) return []
  const first = movements.reduce((earliest, movement) => (movement.date < earliest ? movement.date : earliest), today)
  const current = monthOf(today)
  const points: SeriesPoint[] = []
  for (let back = 11; back >= 0; back--) {
    const month = addMonths(current, -back)
    if (month < monthOf(first)) continue
    const day = back === 0 ? today : lastDayOf(month)
    const total = totalValue(balances(movements, day), back === 0 ? pricing : { record: recordFor(day), overrides: {} })
    points.push({ month, day, months: total === undefined ? null : total / expense })
  }
  return points
}

/** The y axis runs from 0 to the whole number above the goal or the highest point, whichever is higher. */
export const axisTop = (goalMonths: number, points: readonly SeriesPoint[]): number =>
  Math.floor(Math.max(goalMonths, ...points.map((point) => point.months ?? 0))) + 1

/** The chart's name for screen readers: "Son 12 ayda özgürlüğün 1,2 aydan 3,8 aya çıktı". */
export function seriesLabel(points: readonly SeriesPoint[]): string {
  const known = points.filter((point) => point.months !== null)
  const last = known.at(-1)
  if (!last) return 'Özgürlüğün, son 12 ay: fiyatlar alınamadı'
  const b = formatMonths(last.months!)
  if (points.length === 1) return `Bu ay özgürlüğün ${b} ay`
  const a = formatMonths(known[0].months!)
  const n = points.length
  if (a === b) return `Son ${n} ayda özgürlüğün değişmedi: ${b} ay`
  return `Son ${n} ayda özgürlüğün ${a} aydan ${b} aya ${Number(last.months) > Number(known[0].months) ? 'çıktı' : 'indi'}`
}
