import type { Pricing } from './prices.ts'
import type { AssetKind, Movement, PriceRecord, Settings } from './types.ts'

/** The plan's fixed prices for stage B: a dollar 49,00, a euro 55,80, an ounce 205.687,29 (a gram 6.613,00). */
export const RECORD: PriceRecord = {
  date: '2026-09-29',
  usdTry: 49,
  eurTry: 55.8,
  xauTry: 205_687.29,
  fetchedAt: '2026-09-29T09:00:00.000Z',
}

export const PRICING: Pricing = { record: RECORD, overrides: {} }

let made = 0

/** A movement with the fields a test cares about; amounts in whole units for readability (2 çeyrek = 2). */
export function move(kind: AssetKind, units: number, date: string, direction: Movement['direction'] = 'in', id = `m${++made}`): Movement {
  return { id, kind, direction, amount: Math.round(units * 100), date, createdAt: `${date}T10:00:00.000Z`, updatedAt: `${date}T10:00:00.000Z` }
}

export const settings = (overrides: Partial<Settings> = {}): Settings => ({
  expense: { mode: 'amount', amountTRY: 60_000 },
  goalMonths: 6,
  expenseUpdatedAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
})
