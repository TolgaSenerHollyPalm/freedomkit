import { ASSET_KINDS, type AssetKind } from './types.ts'

export const GRAMS_PER_TROY_OUNCE = 31.1034768
const KARAT_22 = 22 / 24

export interface Asset {
  kind: AssetKind
  short: string // the type picker: "Çeyrek"
  name: string // lists and the start of a sentence: "Çeyrek altın"
  phrase: string // after a number: "+2 çeyrek altın", "−5.000 TL"
  unit: string // after an amount on its own: "12 gram", "1.000 $", "3 adet"
  counted: boolean // coins, counted in whole pieces
  goldGrams?: number // the fine gold in one unit; a coin's worth is only its gold (plan 4.1)
}

// Coin weights and their 22 karats as the plan's sources give them (Bigpara, Zerince).
export const ASSETS: Record<AssetKind, Asset> = {
  TRY: { kind: 'TRY', short: 'TL', name: 'Türk lirası', phrase: 'TL', unit: 'TL', counted: false },
  USD: { kind: 'USD', short: 'Dolar', name: 'Dolar', phrase: 'dolar', unit: '$', counted: false },
  EUR: { kind: 'EUR', short: 'Euro', name: 'Euro', phrase: 'euro', unit: '€', counted: false },
  GRAM: { kind: 'GRAM', short: 'Gram', name: 'Gram altın', phrase: 'gram altın', unit: 'gram', counted: false, goldGrams: 1 },
  CEYREK: { kind: 'CEYREK', short: 'Çeyrek', name: 'Çeyrek altın', phrase: 'çeyrek altın', unit: 'adet', counted: true, goldGrams: 1.754 * KARAT_22 },
  YARIM: { kind: 'YARIM', short: 'Yarım', name: 'Yarım altın', phrase: 'yarım altın', unit: 'adet', counted: true, goldGrams: 3.508 * KARAT_22 },
  TAM: { kind: 'TAM', short: 'Tam', name: 'Tam altın', phrase: 'tam altın', unit: 'adet', counted: true, goldGrams: 7.016 * KARAT_22 },
  CUMHURIYET: { kind: 'CUMHURIYET', short: 'Cumhuriyet', name: 'Cumhuriyet altını', phrase: 'Cumhuriyet altını', unit: 'adet', counted: true, goldGrams: 7.216 * KARAT_22 },
}

export const PRICED_KINDS = ASSET_KINDS.filter((kind) => kind !== 'TRY')

export const isAssetKind = (value: unknown): value is AssetKind => ASSET_KINDS.includes(value as AssetKind)
