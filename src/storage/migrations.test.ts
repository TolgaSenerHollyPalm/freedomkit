import { describe, expect, it } from 'vitest'
import { move } from '../money/test-helpers.ts'
import { DATA_VERSION, migrateMovement } from './migrations.ts'

describe('migrateMovement', () => {
  it('passes a movement of the current version through as it is', () => {
    const current = move('CEYREK', 2, '2026-09-12')
    expect(migrateMovement(current, DATA_VERSION)).toBe(current)
  })

  it('refuses a version it has no way forward from', () => {
    for (const from of [0, DATA_VERSION + 1, 1.5, Number.NaN]) expect(() => migrateMovement(move('TRY', 1, '2026-09-01'), from)).toThrow('No migration')
  })

  // No real step exists yet; these stand in for the ones later versions will add.
  it('runs every step between the stored version and the current one, in order', () => {
    const steps = {
      1: (old: Record<string, unknown>) => ({ ...old, tags: [] }),
      2: ({ tags, ...rest }: Record<string, unknown>) => ({ ...rest, labels: tags }),
    }
    expect(migrateMovement({ id: 'x' }, 1, steps, 3)).toEqual({ id: 'x', labels: [] })
    expect(migrateMovement({ id: 'x', tags: ['a'] }, 2, steps, 3)).toEqual({ id: 'x', labels: ['a'] })
    expect(() => migrateMovement({ id: 'x' }, 1, { 2: steps[2] }, 3)).toThrow('No migration from data version 1')
  })
})
