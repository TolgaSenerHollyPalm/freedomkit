import { ASSETS } from './assets.ts'
import type { AssetKind } from './types.ts'

// Amounts are whole hundredths of their unit everywhere, so sums never pick up floating point dust (plan 3).
const LIMIT = 1e15

const numbers = new Map<number, Intl.NumberFormat>()
function number(value: number, fractionDigits: number): string {
  let format = numbers.get(fractionDigits)
  if (!format) {
    format = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: fractionDigits })
    numbers.set(fractionDigits, format)
  }
  return format.format(value)
}

/** "1.000", "2,5": an amount kept in hundredths, with the decimals it has. */
export const formatAmount = (hundredths: number): string => number(hundredths / 100, 2)

/** "2 çeyrek altın", "1.000 dolar", "5.000 TL" */
export const amountPhrase = (kind: AssetKind, hundredths: number): string => `${formatAmount(hundredths)} ${ASSETS[kind].phrase}`

/** "12 gram", "1.000 $", "3 adet" */
export const amountWithUnit = (kind: AssetKind, hundredths: number): string => `${formatAmount(hundredths)} ${ASSETS[kind].unit}`

/** Whole lira: "227.731 TL". */
export const formatLira = (value: number): string => `${number(Math.round(value) || 0, 0)} TL`

/** Lira with kuruş: "6.613,00 TL", for a price. */
export const formatPrice = (value: number): string =>
  `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} TL`

/** Months with one decimal: "3,8". */
export const formatMonths = (months: number): string => number(months, 1)

/**
 * Reads what was typed — "2,5", "1.250,75", "1250.75", "12.500" — into hundredths. Undefined when it is not a
 * positive amount with at most two decimals.
 */
export function parseAmount(text: string): number | undefined {
  const typed = text.replace(/[\s ]/g, '')
  if (!/^[\d.,]+$/.test(typed)) return undefined
  let plain: string
  if (typed.includes(',')) {
    // The comma is the decimal point; dots before it only group thousands.
    if (typed.indexOf(',') !== typed.lastIndexOf(',') || typed.slice(typed.indexOf(',')).includes('.')) return undefined
    plain = typed.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(typed)) {
    plain = typed.replace(/\./g, '') // "12.500" groups thousands
  } else {
    plain = typed // "2.5" from a keyboard with a dot
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(plain)
  if (!match) return undefined
  const hundredths = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return hundredths > 0 && hundredths < LIMIT ? hundredths : undefined
}

/** What a form field starts with for an amount kept in hundredths: "2,5", "1250". */
export const amountInput = (hundredths: number): string =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2, useGrouping: false }).format(hundredths / 100)
