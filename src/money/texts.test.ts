import { describe, expect, it } from 'vitest'
import { move, RECORD, settings } from './test-helpers.ts'
import { expenseText, goldOptionText, negativeWarnings, priceLine, worthText } from './texts.ts'

describe('texts', () => {
  it('mark a coin’s worth as approximate', () => {
    expect(worthText('TAM', 42_530.4)).toBe('≈ 42.530 TL')
    expect(worthText('GRAM', 79_356)).toBe('79.356 TL')
    expect(worthText('TRY', 25_000)).toBe('25.000 TL')
  })

  it('say which day the prices are of, and that there is no connection', () => {
    expect(priceLine(RECORD, true, false)).toBe('Fiyatlar: 29 Eylül · Altın adetleri yaklaşık değerdir.')
    expect(priceLine(RECORD, false, false)).toBe('İnternet yok; 29 Eylül fiyatları gösteriliyor.')
    expect(priceLine(undefined, true, true)).toBe('Fiyatlar alınıyor…')
    expect(priceLine(undefined, true, false)).toBe('Fiyatlar alınamadı. Elle de girebilirsin.')
    expect(priceLine(undefined, false, false)).toBe('İnternet yok; fiyatlar henüz alınmadı.')
  })

  it('name the expense either way', () => {
    expect(expenseText(settings(), undefined)).toBe('60.000 TL')
    expect(expenseText(settings({ expense: { mode: 'gold' } }), 42_530.4)).toBe('1 tam altın (≈ 42.530 TL)')
    expect(expenseText(settings({ expense: { mode: 'gold' } }), undefined)).toBe('1 tam altın')
    expect(goldOptionText(42_530.4)).toBe('Giderini bilmiyorsan: bir ay, bir tam altının bugünkü değeri kadar sayılır (≈ 42.530 TL).')
    expect(goldOptionText(undefined)).toBe('Giderini bilmiyorsan: bir ay, bir tam altının bugünkü değeri kadar sayılır.')
  })

  it('warn about each kind a merge took below zero', () => {
    const merged = [move('CEYREK', 2, '2026-09-01'), move('CEYREK', 3, '2026-09-02', 'out'), move('USD', 5, '2026-09-03')]
    expect(negativeWarnings(merged)).toEqual(["Çeyrek altın için çıkışlar girişlerden fazla; Geçmiş'ten kontrol et."])
    expect(negativeWarnings([move('USD', 5, '2026-09-03')])).toEqual([])
  })
})
