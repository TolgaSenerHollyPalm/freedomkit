import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import Menu from 'kitshelf-ui/ui/Menu.tsx'
import Missing from 'kitshelf-ui/ui/Missing.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { NOTE_MAX_LENGTH } from '../notes/notes.ts'
import styles from './NoteScreen.module.css'

/** Writes a new note, or changes and deletes the one the address names. */
export default function NoteScreen({ noteId }: { noteId?: string }) {
  const { notes, saveNote, deleteNote } = useAppData()
  const show = useToast()
  const existing = noteId === undefined ? undefined : notes.find((note) => note.id === noteId)
  const [value, setValue] = useState(existing?.text ?? '')
  const [confirming, setConfirming] = useState(false)
  const home = href({ screen: 'home' })
  if (noteId !== undefined && !existing) return <Missing message="Bu not bulunamadı." back={home} />

  const trimmed = value.trim()
  const save = () => {
    saveNote({ id: existing?.id ?? crypto.randomUUID(), text: trimmed })
    show(existing ? 'Not kaydedildi' : 'Not eklendi')
    navigate({ screen: 'home' }, { replace: true })
  }
  const remove = () => {
    if (!existing) return
    deleteNote(existing.id)
    show('Not silindi')
    navigate({ screen: 'home' }, { replace: true })
  }

  return (
    <Screen
      title={existing ? 'Notu düzenle' : 'Yeni not'}
      back={home}
      aside={existing && <Menu items={[{ label: 'Notu sil', danger: true, onSelect: () => setConfirming(true) }]} />}
      footer={
        <Button variant="primary" big disabled={trimmed === '' || trimmed === existing?.text} onClick={save}>
          Kaydet
        </Button>
      }
    >
      <label className={styles.field}>
        <span className={text.visuallyHidden}>Not</span>
        <textarea
          className={styles.input}
          value={value}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Aklındakini yaz…"
          autoFocus={!existing}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>

      <ConfirmDialog
        open={confirming}
        title="Bu not silinsin mi?"
        confirmLabel="Evet, sil"
        onConfirm={() => {
          setConfirming(false)
          remove()
        }}
        onCancel={() => setConfirming(false)}
      >
        Geri alınamaz.
      </ConfirmDialog>
    </Screen>
  )
}
