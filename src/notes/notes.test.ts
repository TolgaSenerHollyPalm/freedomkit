import { describe, expect, it } from 'vitest'
import { latestChange, noteTitle, sortNotes, stampNote, withNote, type Note } from './notes.ts'

const note = (id: string, updatedAt: string, text = id): Note => ({ id, text, updatedAt })

describe('notes', () => {
  it('stamps a note with the time it was saved', () => {
    expect(stampNote({ id: 'a', text: 'Süt al' }, new Date('2026-09-30T08:00:00.000Z'))).toEqual(note('a', '2026-09-30T08:00:00.000Z', 'Süt al'))
  })

  it('replaces a note in place and adds a new one at the end', () => {
    const notes = [note('a', '2026-09-01T00:00:00Z'), note('b', '2026-09-02T00:00:00Z')]
    const changed = note('a', '2026-09-03T00:00:00Z', 'changed')
    expect(withNote(notes, changed)).toEqual([changed, notes[1]])
    expect(withNote(notes, note('c', '2026-09-03T00:00:00Z')).map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('lists the newest first and finds the latest change', () => {
    const notes = [note('old', '2026-09-01T00:00:00Z'), note('new', '2026-09-20T00:00:00Z'), note('mid', '2026-09-10T00:00:00Z')]
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['new', 'mid', 'old'])
    expect(latestChange(notes)).toBe('2026-09-20T00:00:00Z')
    expect(latestChange([])).toBeUndefined()
  })

  it('shows a note by its first line, cut short when long', () => {
    expect(noteTitle('  Alışveriş\nsüt, ekmek')).toBe('Alışveriş')
    expect(noteTitle('a'.repeat(80))).toBe(`${'a'.repeat(40)}…`)
  })
})
