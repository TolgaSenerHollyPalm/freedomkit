import { describe, expect, it } from 'vitest'
import type { Note } from '../notes/notes.ts'
import { planRestore } from './restorePlan.ts'

const note = (id: string, updatedAt: string, text = id): Note => ({ id, text, updatedAt })

describe('planRestore: merge', () => {
  const local = { notes: [note('a', '2026-09-10T10:00:00Z', 'a here'), note('b', '2026-09-20T10:00:00Z', 'b here')] }
  const incoming = {
    notes: [note('a', '2026-09-15T10:00:00Z', 'a there'), note('b', '2026-09-01T10:00:00Z', 'b there'), note('c', '2026-08-01T10:00:00Z')],
  }
  const plan = planRestore(local, incoming, 'merge')

  it('writes only what is new or newer, and deletes nothing', () => {
    expect(plan.clear).toBe(false)
    expect(plan.notes.map((n) => n.text)).toEqual(['a there', 'c'])
  })

  it('counts what changed and what the device ends up with', () => {
    expect(plan.counts).toEqual([{ key: 'notes', label: 'not', added: 1, updated: 1, total: 3 }])
  })

  it('finds nothing to do when the device already has it all', () => {
    const again = planRestore(local, local, 'merge')
    expect(again.notes).toEqual([])
    expect(again.counts).toEqual([{ key: 'notes', label: 'not', added: 0, updated: 0, total: 2 }])
  })
})

describe('planRestore: replace', () => {
  it('empties the store and writes the backup as it is', () => {
    const incoming = { notes: [note('x', '2026-01-01T00:00:00Z')] }
    expect(planRestore({ notes: [note('a', '2026-09-10T10:00:00Z')] }, incoming, 'replace')).toEqual({
      clear: true,
      notes: incoming.notes,
      counts: [{ key: 'notes', label: 'not', added: 1, updated: 0, total: 1 }],
    })
  })
})
