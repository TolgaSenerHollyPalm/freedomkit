import { describe, expect, it } from 'vitest'
import { move, settings } from '../money/test-helpers.ts'
import type { Movement, Overrides } from '../money/types.ts'
import { restoredText } from './kitBackup.ts'
import { planRestore, SETTINGS_KEY, type KitData } from './restorePlan.ts'

const at = (day: number) => `2026-09-${String(day).padStart(2, '0')}T10:00:00.000Z`
const stamped = (movement: Movement, day: number): Movement => ({ ...movement, updatedAt: at(day) })
const own = (kind: 'USD' | 'GRAM', priceTRY: number, day: number): Overrides => ({ [kind]: { kind, priceTRY, setAt: at(day) } })

describe('planRestore: merge', () => {
  const local: KitData = {
    movements: [stamped(move('TRY', 5000, '2026-09-01', 'in', 'a'), 10), stamped(move('GRAM', 10, '2026-09-02', 'in', 'b'), 20)],
    settings: settings({ updatedAt: at(10) }),
    overrides: {},
  }
  const incoming: KitData = {
    movements: [stamped(move('TRY', 7000, '2026-09-01', 'in', 'a'), 15), stamped(move('GRAM', 4, '2026-09-02', 'in', 'b'), 1), stamped(move('TAM', 1, '2026-09-03', 'in', 'c'), 2)],
    overrides: {},
  }
  const plan = planRestore(local, incoming, 'merge')

  it('writes only the movements that are new or newer, and deletes nothing', () => {
    expect(plan.clear).toBe(false)
    expect(plan.movements.map(({ id, amount }) => [id, amount])).toEqual([
      ['a', 700_000],
      ['c', 100],
    ])
  })

  it('counts what was added and updated, and how many movements the device ends up with', () => {
    expect(plan.counts[0]).toEqual({ key: 'movements', label: 'hareket', added: 1, updated: 1, total: 3 })
    expect(restoredText(plan.counts, 'merge')).toBe('Geri yüklendi: 1 hareket eklendi, 1 hareket güncellendi.')
  })

  it('finds nothing to do when the device already has it all', () => {
    const again = planRestore(local, { movements: local.movements, settings: local.settings, overrides: {} }, 'merge')
    expect(again.movements).toEqual([])
    expect(restoredText(again.counts, 'merge')).toBe('Yedekteki her şey bu cihazda zaten var.')
  })

  it('keeps the newer settings, and the device’s own on a tie', () => {
    const older = settings({ goalMonths: 3, updatedAt: at(5) })
    const newer = settings({ goalMonths: 12, updatedAt: at(25) })
    expect(planRestore(local, { ...incoming, settings: older }, 'merge').settings).toBe(local.settings)
    expect(planRestore(local, { ...incoming, settings: newer }, 'merge').settings).toBe(newer)
    expect(planRestore(local, { ...incoming, settings: settings({ goalMonths: 9, updatedAt: at(10) }) }, 'merge').settings).toBe(local.settings)
  })

  it('lets any backup’s settings replace the welcome’s, which carry no stamp (plan 6.6)', () => {
    const welcome = { ...local, settings: settings({ updatedAt: undefined, goalMonths: 6 }) }
    const fromBackup = settings({ updatedAt: undefined, goalMonths: 24 })
    expect(planRestore(welcome, { ...incoming, settings: fromBackup }, 'merge').settings).toBe(fromBackup)
    expect(planRestore({ ...local, settings: undefined }, { ...incoming, settings: fromBackup }, 'merge').settings).toBe(fromBackup)
  })

  it('keeps the device’s settings when the backup has none', () => {
    expect(planRestore(local, incoming, 'merge').settings).toBe(local.settings)
    expect(planRestore({ ...local, settings: undefined }, incoming, 'merge').settings).toBeUndefined()
  })

  it('takes one’s own prices kind by kind, the newer of each', () => {
    const mine = { ...local, overrides: { ...own('USD', 50, 10), ...own('GRAM', 6_500, 20) } }
    const theirs = { ...incoming, overrides: { ...own('USD', 48, 15), ...own('GRAM', 6_000, 5) } }
    expect(planRestore(mine, theirs, 'merge').overrides).toEqual({ ...own('USD', 48, 15), ...own('GRAM', 6_500, 20) })
    expect(planRestore(local, theirs, 'merge').overrides).toEqual(theirs.overrides)
  })

  it('says the settings changed when nothing else did', () => {
    const same = { movements: local.movements }
    const settingsOnly = planRestore(local, { ...same, settings: settings({ goalMonths: 12, updatedAt: at(25) }), overrides: {} }, 'merge')
    expect(settingsOnly.counts.find((count) => count.key === SETTINGS_KEY)?.updated).toBe(1)
    expect(restoredText(settingsOnly.counts, 'merge')).toBe('Geri yüklendi: ayarlar güncellendi.')
    const priceOnly = planRestore(local, { ...same, overrides: own('USD', 48, 15) }, 'merge')
    expect(restoredText(priceOnly.counts, 'merge')).toBe('Geri yüklendi: ayarlar güncellendi.')
  })

  it('speaks of the movements alone when they changed too', () => {
    const both = planRestore(local, { ...incoming, settings: settings({ updatedAt: at(25) }) }, 'merge')
    expect(restoredText(both.counts, 'merge')).toBe('Geri yüklendi: 1 hareket eklendi, 1 hareket güncellendi.')
  })
})

describe('planRestore: replace', () => {
  const local: KitData = { movements: [move('TRY', 100, '2026-09-01')], settings: settings({ updatedAt: at(28) }), overrides: own('USD', 50, 28) }

  it('empties the device and brings the backup’s movements, settings and own prices, older or not', () => {
    const incoming: KitData = { movements: [move('GRAM', 2, '2026-08-01'), move('TAM', 1, '2026-08-02')], settings: settings({ updatedAt: at(1) }), overrides: {} }
    const plan = planRestore(local, incoming, 'replace')
    expect(plan.clear).toBe(true)
    expect(plan.movements).toBe(incoming.movements)
    expect(plan.settings).toBe(incoming.settings)
    expect(plan.overrides).toEqual({})
    expect(restoredText(plan.counts, 'replace')).toBe('Geri yüklendi: 2 hareket.')
  })

  it('leaves no settings when the backup had none, so the welcome comes back', () => {
    expect(planRestore(local, { movements: [], overrides: {} }, 'replace').settings).toBeUndefined()
  })
})
