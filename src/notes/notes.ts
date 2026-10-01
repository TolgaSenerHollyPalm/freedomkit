/** The template's example data: short notes. A new kit replaces this folder with its own records. */
export interface Note {
  id: string
  text: string
  updatedAt: string // ISO; when a backup is merged, the newer copy of a note wins
}

/** A note as a screen hands it over; saving it adds the time. */
export type NoteDraft = Omit<Note, 'updatedAt'>

export const NOTE_MAX_LENGTH = 2000

export const stampNote = (draft: NoteDraft, now: Date): Note => ({ id: draft.id, text: draft.text, updatedAt: now.toISOString() })

/** The list with the note in it: in place when it was there already, otherwise at the end. */
export function withNote(notes: readonly Note[], note: Note): Note[] {
  return notes.some((other) => other.id === note.id) ? notes.map((other) => (other.id === note.id ? note : other)) : [...notes, note]
}

/** Newest first. */
export const sortNotes = (notes: readonly Note[]): Note[] => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

const TITLE_LENGTH = 40

/** What stands for a note in the list: its first line, cut short when it runs long. */
export function noteTitle(text: string): string {
  const line = text.trim().split('\n')[0].trim()
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH).trimEnd()}…` : line
}

export function latestChange(notes: readonly Note[]): string | undefined {
  return notes.reduce<string | undefined>((latest, note) => (!latest || note.updatedAt > latest ? note.updatedAt : latest), undefined)
}
