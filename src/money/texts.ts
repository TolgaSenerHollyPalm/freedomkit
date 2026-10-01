import { formatLira } from './amounts.ts'
import { ASSETS } from './assets.ts'
import { dayMonth } from './dates.ts'
import { balances } from './holdings.ts'
import type { AssetKind, Movement, PriceRecord, Settings } from './types.ts'

/** A kind's worth in lira; a coin's with "≈", since only its gold is counted (plan 4.1). */
export const worthText = (kind: AssetKind, value: number): string => `${ASSETS[kind].counted ? '≈ ' : ''}${formatLira(value)}`

/** The line under the list on the home screen, which opens the prices sheet. */
export function priceLine(record: PriceRecord | undefined, online: boolean, refreshing: boolean): string {
  if (!record) {
    if (refreshing) return 'Fiyatlar alınıyor…'
    return online ? 'Fiyatlar alınamadı. Elle de girebilirsin.' : 'İnternet yok; fiyatlar henüz alınmadı.'
  }
  return online
    ? `Fiyatlar: ${dayMonth(record.date)} · Altın adetleri yaklaşık değerdir.`
    : `İnternet yok; ${dayMonth(record.date)} fiyatları gösteriliyor.`
}

/** The home card's expense: "60.000 TL", or "1 tam altın (≈ 42.531 TL)" when a price for it is known. */
export function expenseText(settings: Settings, tamValue: number | undefined): string {
  if (settings.expense.mode === 'amount') return formatLira(settings.expense.amountTRY)
  return tamValue === undefined ? '1 tam altın' : `1 tam altın (≈ ${formatLira(tamValue)})`
}

/** The gold option's explanation, with today's worth of a tam altın when there is a price for it. */
export const goldOptionText = (tamValue: number | undefined): string =>
  `Giderini bilmiyorsan: bir ay, bir tam altının bugünkü değeri kadar sayılır${tamValue === undefined ? '' : ` (≈ ${formatLira(tamValue)})`}.`

/** A warning for each kind a merged backup took below zero (plan 7). */
export const negativeWarnings = (movements: readonly Movement[]): string[] =>
  [...balances(movements)]
    .filter(([, hundredths]) => hundredths < 0)
    .map(([kind]) => `${ASSETS[kind].name} için çıkışlar girişlerden fazla; Geçmiş'ten kontrol et.`)
