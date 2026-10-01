export const ASSET_KINDS = ['TRY', 'USD', 'EUR', 'GRAM', 'CEYREK', 'YARIM', 'TAM', 'CUMHURIYET'] as const
export type AssetKind = (typeof ASSET_KINDS)[number]

/** The kinds whose value comes from a price; Turkish lira is its own value. */
export type PricedKind = Exclude<AssetKind, 'TRY'>

/** A local calendar day, YYYY-MM-DD. */
export type Day = string

export interface Movement {
  id: string // crypto.randomUUID()
  kind: AssetKind
  direction: 'in' | 'out' // Ekle / Çıkar
  amount: number // > 0, in hundredths of the unit: 2,50 gram = 250, 3 çeyrek = 300
  date: Day // no later than today
  note?: string
  createdAt: string // ISO
  updatedAt: string // ISO
}

export type Expense = { mode: 'amount'; amountTRY: number } | { mode: 'gold' } // 'gold': 1 ay = 1 tam altın

export interface Settings {
  expense: Expense
  goalMonths: number // 1–120
  expenseUpdatedAt: string // ISO; when the expense or its mode last changed
  updatedAt?: string // absent while only the first-run welcome wrote it, so a backup's settings win a merge
}

export interface PriceOverride {
  kind: PricedKind
  priceTRY: number // one unit: a dollar, a gram, a coin
  setAt: string // ISO
}

export type Overrides = Partial<Record<PricedKind, PriceOverride>>

/** One day's rates from the price service, in lira. */
export interface PriceRecord {
  date: Day // the day the service's answer is for
  usdTry: number
  eurTry: number
  xauTry: number // one troy ounce of gold
  fetchedAt: string // ISO
  monthEnd?: Day // set when this record stands in for a month end the service had no answer for
}
