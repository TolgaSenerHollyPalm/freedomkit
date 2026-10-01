import { readBackup, type Backup, type BackupPreview, type RestoreMode } from 'kitshelf-ui/backup/format.ts'
import RestoreSheet from 'kitshelf-ui/backup/RestoreSheet.tsx'
import { restoreBackup } from 'kitshelf-ui/backup/save.ts'
import { readErrorMessage, RESTORE_FAILED_MESSAGE } from 'kitshelf-ui/backup/texts.ts'
import InfoDialog from 'kitshelf-ui/ui/InfoDialog.tsx'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useState } from 'react'
import { useAppData } from '../app/appData.ts'
import { KIT_NAME } from '../kit.ts'
import { BACKUP_TEXTS, replaceWarning, restoredText, useKitBackup } from './kitBackup.ts'
import type { KitData } from './restorePlan.ts'

/** From a picked file to the restored data, for Settings and the welcome alike; render `dialogs` once. */
export function useRestore(onFinished?: () => void) {
  const { movements } = useAppData()
  const backup = useKitBackup()
  const show = useToast()
  const [opened, setOpened] = useState<{ backup: Backup<KitData>; preview: BackupPreview }>()
  const [restoring, setRestoring] = useState(false)
  const [problem, setProblem] = useState<string>()

  const open = (file: File) => {
    void readBackup(file, backup).then((result) => {
      if (result.ok) setOpened({ backup: result.backup, preview: result.preview })
      else setProblem(readErrorMessage(result.error, KIT_NAME, result.kitName))
    })
  }

  const restore = (mode: RestoreMode) => {
    if (!opened) return
    setRestoring(true)
    void restoreBackup(opened.backup, backup, mode).then((outcome) => {
      setRestoring(false)
      setOpened(undefined)
      onFinished?.()
      if (outcome.ok) show(restoredText(outcome.counts, mode))
      else setProblem(RESTORE_FAILED_MESSAGE)
    })
  }

  const dialogs = (
    <>
      <RestoreSheet
        open={opened !== undefined}
        preview={opened?.preview}
        mergeText={BACKUP_TEXTS.merge}
        replaceText={BACKUP_TEXTS.replace}
        replaceWarning={movements.length > 0 ? replaceWarning(movements.length) : undefined}
        busy={restoring}
        onRestore={restore}
        onCancel={() => setOpened(undefined)}
      />
      <InfoDialog open={problem !== undefined} title="Yedek açılamadı" onClose={() => setProblem(undefined)}>
        {problem}
      </InfoDialog>
    </>
  )

  return { open, dialogs }
}
