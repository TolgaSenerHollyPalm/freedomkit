import { describe, expect, it } from 'vitest'
import { ASSETS, GRAMS_PER_TROY_OUNCE } from './assets.ts'
import { automaticPrice, gramPrice, unitPrice, valueOf } from './prices.ts'
import { PRICING, RECORD } from './test-helpers.ts'

describe('prices', () => {
  it('turns an ounce into a gram', () => {
    expect(gramPrice(RECORD)).toBeCloseTo(6613, 2)
    expect(GRAMS_PER_TROY_OUNCE).toBe(31.1034768)
  })

  it('values each kind by the plan’s table', () => {
    expect(unitPrice('TRY', PRICING)).toBe(1)
    expect(unitPrice('USD', PRICING)).toBe(49)
    expect(unitPrice('EUR', PRICING)).toBe(55.8)
    expect(unitPrice('GRAM', PRICING)).toBeCloseTo(6613, 2)
    expect(unitPrice('CEYREK', PRICING)).toBeCloseTo(1.754 * (22 / 24) * 6613, 2)
    expect(unitPrice('YARIM', PRICING)).toBeCloseTo(3.508 * (22 / 24) * 6613, 2)
    expect(unitPrice('TAM', PRICING)).toBeCloseTo(7.016 * (22 / 24) * 6613, 2)
    expect(unitPrice('CUMHURIYET', PRICING)).toBeCloseTo(7.216 * (22 / 24) * 6613, 2)
  })

  it('counts coins by their gold alone, all 22 karat', () => {
    expect(ASSETS.CEYREK.goldGrams).toBeCloseTo(1.6078, 4)
    expect(unitPrice('CEYREK', PRICING)).toBeCloseTo(10632.6, 1)
  })

  it('values amounts kept in hundredths', () => {
    expect(valueOf(250, unitPrice('GRAM', PRICING)!)).toBeCloseTo(16532.5, 1) // 2,50 gram
    expect(valueOf(300, unitPrice('CEYREK', PRICING)!)).toBeCloseTo(31897.8, 1) // 3 çeyrek
    expect(valueOf(100_000, 49)).toBe(49_000) // 1.000 $
  })

  it('takes the user’s own price first, kind by kind', () => {
    const pricing = { ...PRICING, overrides: { CEYREK: { kind: 'CEYREK' as const, priceTRY: 11_250, setAt: '2026-09-29T12:00:00.000Z' } } }
    expect(unitPrice('CEYREK', pricing)).toBe(11_250)
    expect(unitPrice('YARIM', pricing)).toBeCloseTo(3.508 * (22 / 24) * 6613, 2)
    expect(automaticPrice('CEYREK', RECORD)).toBeCloseTo(10632.6, 1)
  })

  it('has no price without a record or the user’s own, except for lira', () => {
    expect(unitPrice('USD', { overrides: {} })).toBeUndefined()
    expect(unitPrice('TRY', { overrides: {} })).toBe(1)
    expect(unitPrice('USD', { overrides: { USD: { kind: 'USD', priceTRY: 50, setAt: '2026-09-29T12:00:00.000Z' } } })).toBe(50)
  })
})
