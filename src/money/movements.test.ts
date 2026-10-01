import { describe, expect, it } from 'vitest'
import { availableOn, balances, goesNegative, lowestBalance } from './holdings.ts'
import { balanceProblem, byMonth, editMovement, fieldProblems, movementTitle, newMovement, stampMovement, withMovement } from './movements.ts'
import { move } from './test-helpers.ts'

describe('what is held', () => {
  const list = [move('CEYREK', 3, '2026-09-01'), move('CEYREK', 1, '2026-09-10', 'out'), move('USD', 1000, '2026-09-05')]

  it('adds what came in and takes away what went out, per kind', () => {
    expect(balances(list)).toEqual(new Map([['CEYREK', 200], ['USD', 100_000]]))
  })

  it('stops at a day', () => {
    expect(balances(list, '2026-09-05')).toEqual(new Map([['CEYREK', 300], ['USD', 100_000]]))
    expect(balances(list, '2026-08-31')).toEqual(new Map())
  })

  it('finds the lowest end-of-day balance from a day on', () => {
    const days = [move('GRAM', 10, '2026-09-01'), move('GRAM', 8, '2026-09-03', 'out'), move('GRAM', 5, '2026-09-04')]
    expect(lowestBalance(days, 'GRAM', '2026-09-01')).toBe(200)
    expect(lowestBalance(days, 'GRAM', '2026-09-04')).toBe(700)
    // Two movements on one day: only where the day ends counts.
    const sameDay = [move('GRAM', 2, '2026-09-01'), move('GRAM', 3, '2026-09-02', 'out'), move('GRAM', 3, '2026-09-02')]
    expect(lowestBalance(sameDay, 'GRAM', '2026-09-01')).toBe(200)
  })
})

describe('never below zero', () => {
  const gram = (units: number, date: string, direction: 'in' | 'out' = 'in', id?: string) => move('GRAM', units, date, direction, id)
  const list = [gram(10, '2026-09-01', 'in', 'a'), gram(6, '2026-09-20', 'out', 'b')] // 10 in, 6 out: 4 left

  it('lets out what there is', () => {
    expect(balanceProblem(list, undefined, gram(4, '2026-09-25', 'out'))).toBeUndefined()
  })

  it('stops a new outgoing movement larger than what there is, saying how much there is', () => {
    expect(balanceProblem(list, undefined, gram(5, '2026-09-25', 'out'))).toBe('Elinde 4 gram var.')
  })

  it('stops one dated back that would leave a later day short', () => {
    // On 15 September there were 10 gram, but 6 went out on the 20th: only 4 can leave on the 15th.
    expect(availableOn(list, 'GRAM', '2026-09-15')).toBe(400)
    expect(balanceProblem(list, undefined, gram(5, '2026-09-15', 'out'))).toBe('Elinde 4 gram var.')
    expect(balanceProblem(list, undefined, gram(5, '2026-08-15', 'out'))).toBe('Elinde 0 gram var.')
  })

  it('stops an edit or a delete that takes a kind below zero', () => {
    const smaller = { ...list[0], amount: 500 }
    expect(balanceProblem(list, list[0], smaller)).toBe('Bu değişiklikle elindeki gram altın eksiye düşer.')
    expect(balanceProblem(list, list[0], undefined)).toBe('Bu değişiklikle elindeki gram altın eksiye düşer.')
    const later = { ...list[0], date: '2026-09-25' } // the gold arriving after it left
    expect(balanceProblem(list, list[0], later)).toBe('Bu değişiklikle elindeki gram altın eksiye düşer.')
    const otherKind = { ...list[0], kind: 'USD' as const }
    expect(balanceProblem(list, list[0], otherKind)).toBe('Bu değişiklikle elindeki gram altın eksiye düşer.')
  })

  it('always lets a change mend a kind already below zero', () => {
    const merged = [gram(2, '2026-09-01', 'in', 'a'), gram(3, '2026-09-05', 'out', 'b'), gram(1, '2026-09-06', 'out', 'c')]
    expect(goesNegative(merged, merged.filter((m) => m.id !== 'c'), 'GRAM', '2026-09-06')).toBe(false)
    expect(balanceProblem(merged, merged[2], undefined)).toBeUndefined()
    expect(balanceProblem(merged, merged[1], { ...merged[1], amount: 250 })).toBeUndefined()
    // …but not one that makes it worse.
    expect(balanceProblem(merged, merged[1], { ...merged[1], amount: 400 })).toBe('Bu değişiklikle elindeki gram altın eksiye düşer.')
  })

  it('lets anything come in and lets deleting what went out', () => {
    expect(balanceProblem(list, undefined, gram(1, '2026-09-02'))).toBeUndefined()
    expect(balanceProblem(list, list[1], undefined)).toBeUndefined()
  })
})

describe('movements', () => {
  const now = new Date('2026-09-29T10:00:00.000Z')

  it('are made with an id, both stamps and a tidy note', () => {
    const made = newMovement({ kind: 'CEYREK', direction: 'in', amount: 200, date: '2026-09-29', note: '  doğum günü ' }, now, 'x')
    expect(made).toEqual({ id: 'x', kind: 'CEYREK', direction: 'in', amount: 200, date: '2026-09-29', note: 'doğum günü', createdAt: now.toISOString(), updatedAt: now.toISOString() })
    expect(newMovement({ kind: 'TRY', direction: 'out', amount: 1, date: '2026-09-29', note: '  ' }, now, 'y')).not.toHaveProperty('note')
    expect(stampMovement(made, new Date('2026-09-30T10:00:00.000Z')).updatedAt).toBe('2026-09-30T10:00:00.000Z')
    const edited = editMovement(made, { kind: 'YARIM', direction: 'in', amount: 100, date: '2026-09-28' })
    expect(edited).toMatchObject({ id: 'x', kind: 'YARIM', createdAt: made.createdAt })
    expect(edited).not.toHaveProperty('note')
  })

  it('are titled with a sign', () => {
    expect(movementTitle({ kind: 'CEYREK', direction: 'in', amount: 200 })).toBe('+2 çeyrek altın')
    expect(movementTitle({ kind: 'TRY', direction: 'out', amount: 500_000 })).toBe('−5.000 TL')
    expect(movementTitle({ kind: 'USD', direction: 'in', amount: 100_000 })).toBe('+1.000 dolar')
  })

  it('need an amount and a day no later than today', () => {
    expect(fieldProblems({ amount: undefined, date: '2026-09-29' }, '2026-09-29')).toEqual({ amount: 'Miktarı yaz.' })
    expect(fieldProblems({ amount: 100, date: '2026-09-30' }, '2026-09-29')).toEqual({ date: 'İleri bir tarih seçilemez.' })
    expect(fieldProblems({ amount: 100, date: '2026-09-29' }, '2026-09-29')).toEqual({})
  })

  it('replace themselves in a list or join its end', () => {
    const a = move('TRY', 1, '2026-09-01', 'in', 'a')
    const b = move('TRY', 2, '2026-09-02', 'in', 'b')
    expect(withMovement([a, b], { ...a, amount: 5 }).map((m) => m.amount)).toEqual([5, 200])
    expect(withMovement([a], b).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('group by month, newest first', () => {
    const list = [move('TRY', 1, '2026-08-02', 'in', 'a'), move('TRY', 1, '2026-09-03', 'in', 'b'), move('TRY', 1, '2026-09-12', 'in', 'c'), move('TRY', 1, '2026-08-18', 'in', 'd')]
    expect(byMonth(list).map(({ month, movements }) => [month, movements.map((m) => m.id)])).toEqual([
      ['2026-09', ['c', 'b']],
      ['2026-08', ['d', 'a']],
    ])
  })
})
