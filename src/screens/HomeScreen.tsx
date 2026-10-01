import BackupReminder from 'kitshelf-ui/backup/BackupReminder.tsx'
import { dayMonth } from 'kitshelf-ui/backup/texts.ts'
import { LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import { IconLink } from 'kitshelf-ui/ui/IconButton.tsx'
import { PlusIcon, SlidersIcon } from 'kitshelf-ui/ui/icons.tsx'
import IosInstallHint from 'kitshelf-ui/ui/IosInstallHint.tsx'
import { LinkRow, ListCard } from 'kitshelf-ui/ui/ListCard.tsx'
import OnlineBadge from 'kitshelf-ui/ui/OnlineBadge.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import Tile from 'kitshelf-ui/ui/Tile.tsx'
import { useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { BACKUP_TEXTS, useBackupReminder } from '../backup/kitBackup.ts'
import { KEYS, KIT_NAME } from '../kit.ts'
import { noteTitle, sortNotes } from '../notes/notes.ts'
import { NoteIcon } from '../ui/icons.tsx'
import styles from './HomeScreen.module.css'

export default function HomeScreen() {
  const { notes } = useAppData()
  const { reminder, lastBackupAt, snooze } = useBackupReminder()
  const settings = href({ screen: 'settings' })

  return (
    <Screen
      title="Notların"
      eyebrow={notes.length > 0 && `${notes.length} not`}
      icon={
        <span className={styles.brand}>
          {/* The app icon itself, so the mark beside the name changes with public/favicon.svg. */}
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={32} height={32} />
          {KIT_NAME}
        </span>
      }
      aside={
        <>
          <OnlineBadge />
          <IconLink to={settings} label={reminder.due ? 'Ayarlar, yedek zamanı' : 'Ayarlar'} badge={reminder.due}>
            <SlidersIcon />
          </IconLink>
        </>
      }
      footer={
        <LinkButton to={href({ screen: 'note-new' })} variant="primary" big>
          <PlusIcon size={20} strokeWidth={2.2} />
          Yeni not
        </LinkButton>
      }
    >
      <IosInstallHint dismissedKey={KEYS.installHintDismissed} />
      {reminder.showBanner && (
        <BackupReminder reminder={reminder} lastBackupAt={lastBackupAt} text={BACKUP_TEXTS.banner} href={settings} onDismiss={snooze} />
      )}

      {/* An empty app should say what it is for before it asks for anything. */}
      {notes.length === 0 ? (
        <section className={styles.welcome}>
          <h2 className={styles.welcomeTitle}>Aklındakini not al</h2>
          <p className={text.hint}>
            Her şey cihazında kalır ve internet olmadan da çalışır. Ayarlar’dan dosya olarak yedekleyebilirsin.
          </p>
        </section>
      ) : (
        <ListCard as="nav" label="Notlar">
          {sortNotes(notes).map((note) => (
            <LinkRow
              key={note.id}
              to={href({ screen: 'note', noteId: note.id })}
              tile={
                <Tile tone="teal">
                  <NoteIcon />
                </Tile>
              }
              title={noteTitle(note.text)}
              subtitle={dayMonth(new Date(note.updatedAt))}
            />
          ))}
        </ListCard>
      )}
    </Screen>
  )
}
