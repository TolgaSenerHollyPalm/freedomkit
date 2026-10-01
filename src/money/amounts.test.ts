import { describe, expect, it } from 'vitest'
import { amountPhrase, amountWithUnit, formatAmount, formatLira, formatMonths, formatPrice, parseAmount } from './amounts.ts'

describe('reading a typed amount', () => {
  it.each([
    ['2,5', 250],
    ['2,50', 250],
    ['0,01', 1],
    ['1.250,75', 125_075],
    ['1250,75', 125_075],
    ['1250.75', 125_075],
    ['2.5', 250],
    ['12.500', 1_250_000],
    ['1.000.000', 100_000_000],
    [' 3 ', 300],
    ['60 000', 6_000_000],
  ])('%s → %i hundredths', (typed, hundredths) => {
    expect(parseAmount(typed)).toBe(hundredths)
  })

  it.each(['', '0', '0,00', '-5', '2,555', '1,2,3', '1.2,5,', 'abc', '2,5 TL', '1,000.5'])('rejects "%s"', (typed) => {
    expect(parseAmount(typed)).toBeUndefined()
  })

  it('reads back what a form field starts with', () => {
    expect([125_075, 250, 6_000_000].map((h) => parseAmount(formatAmount(h)))).toEqual([125_075, 250, 6_000_000])
  })
})

describe('showing amounts', () => {
  it('keeps decimals only where there are some, Turkish style', () => {
    expect(formatAmount(100_000)).toBe('1.000')
    expect(formatAmount(250)).toBe('2,5')
    expect(formatAmount(1_225)).toBe('12,25')
  })

  it('names the unit or the kind', () => {
    expect(amountWithUnit('GRAM', 1_200)).toBe('12 gram')
    expect(amountWithUnit('USD', 100_000)).toBe('1.000 $')
    expect(amountWithUnit('CEYREK', 300)).toBe('3 adet')
    expect(amountPhrase('CEYREK', 200)).toBe('2 çeyrek altın')
    expect(amountPhrase('USD', 100_000)).toBe('1.000 dolar')
    expect(amountPhrase('TRY', 500_000)).toBe('5.000 TL')
  })

  it('rounds lira to whole numbers on the home screen and keeps kuruş for a price', () => {
    expect(formatLira(227_730.6)).toBe('227.731 TL')
    expect(formatLira(-0.4)).toBe('0 TL')
    expect(formatLira(-21_201)).toBe('−21.201 TL') // a kind a merged backup took below zero
    expect(amountWithUnit('YARIM', -100)).toBe('−1 adet')
    expect(formatPrice(6613)).toBe('6.613,00 TL')
    expect(formatMonths(3.7955)).toBe('3,8')
    expect(formatMonths(4)).toBe('4')
  })
})
