import { ASSETS, GRAMS_PER_TROY_OUNCE } from './assets.ts'
import type { AssetKind, Overrides, PriceRecord } from './types.ts'

/** Where prices come from at one moment: a day's record from the service, and what the user typed in. */
export interface Pricing {
  record?: PriceRecord
  overrides: Overrides
}

export const gramPrice = (record: PriceRecord): number => record.xauTry / GRAMS_PER_TROY_OUNCE

/** The price of the record alone, without the user's own: what "Otomatik fiyata dön" goes back to. */
export function automaticPrice(kind: AssetKind, record?: PriceRecord): number | undefined {
  if (kind === 'TRY') return 1
  if (!record) return undefined
  if (kind === 'USD') return record.usdTry
  if (kind === 'EUR') return record.eurTry
  return ASSETS[kind].goldGrams! * gramPrice(record)
}

/** One unit's price in lira — a dollar, a gram, a coin — the user's own first; undefined when there is none. */
export const unitPrice = (kind: AssetKind, pricing: Pricing): number | undefined =>
  kind === 'TRY' ? 1 : (pricing.overrides[kind]?.priceTRY ?? automaticPrice(kind, pricing.record))

/** What an amount in hundredths is worth at a price. */
export const valueOf = (hundredths: number, price: number): number => (hundredths / 100) * price

/** The newest record kept: the latest day, and of one day the latest fetch. */
export const latestRecord = (records: readonly PriceRecord[]): PriceRecord | undefined =>
  records.reduce<PriceRecord | undefined>(
    (best, record) => (!best || record.date > best.date || (record.date === best.date && record.fetchedAt > best.fetchedAt) ? record : best),
    undefined,
  )

/** The record for a day: that day's own, or one fetched earlier and marked as standing in for it (plan 4.3). */
export const recordFor = (records: readonly PriceRecord[], day: string): PriceRecord | undefined =>
  records.find((record) => record.date === day) ?? records.find((record) => record.monthEnd === day)
