import { currentAppearance, saveAppearance, type Appearance } from 'kitshelf-ui/app/appearance.ts'
import BackupCard from 'kitshelf-ui/backup/BackupCard.tsx'
import { saveBackup } from 'kitshelf-ui/backup/save.ts'
import StorageStatus from 'kitshelf-ui/backup/StorageStatus.tsx'
import { saveMessage, wipeWarning } from 'kitshelf-ui/backup/texts.ts'
import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ChoiceGroup from 'kitshelf-ui/ui/ChoiceGroup.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import { AutoIcon, MoonIcon, RefreshIcon, SunIcon } from 'kitshelf-ui/ui/icons.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import SettingsFooter from 'kitshelf-ui/ui/SettingsFooter.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useEffect, useState, type ReactNode } from 'react'
import { useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { BACKUP_TEXTS, useBackupReminder, useKitBackup } from '../backup/kitBackup.ts'
import { useRestore } from '../backup/useRestore.tsx'
import { wipeDevice } from '../storage/wipe.ts'
import { InfoIcon } from '../ui/icons.tsx'
import styles from './SettingsScreen.module.css'

const buildTime = new Date(__BUILD_TIME__).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })

const APPEARANCES: { value: Appearance; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Oto', icon: <AutoIcon /> },
  { value: 'light', label: 'Açık', icon: <SunIcon /> },
  { value: 'dark', label: 'Koyu', icon: <MoonIcon /> },
]

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function SettingsScreen() {
  const { movements, settings } = useAppData()
  const backup = useKitBackup()
  const { reminder, lastBackupAt, refresh } = useBackupReminder()
  const restore = useRestore(refresh)
  const show = useToast()
  const [usage, setUsage] = useState<number>()
  const [confirming, setConfirming] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [appearance, setAppearance] = useState(currentAppearance)
  const [saving, setSaving] = useState(false)

  // How much room the app takes; the browser answers for the whole site, not just our stores.
  useEffect(() => {
    let active = true
    navigator.storage
      ?.estimate?.()
      .then((estimate) => {
        if (active && estimate.usage !== undefined) setUsage(estimate.usage)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [movements])

  // Straight from the tap: saveBackup opens the share sheet before anything is awaited.
  const save = () => {
    setSaving(true)
    void saveBackup(backup).then((result) => {
      setSaving(false)
      refresh()
      const message = saveMessage(result)
      if (message) show(message, { duration: result.status === 'downloaded' ? 6000 : 4000 })
    })
  }

  const wipe = () => {
    setWiping(true)
    void wipeDevice().then(() => {
      // A full load rather than a router change: every screen has to start from an empty device.
      location.replace(import.meta.env.BASE_URL)
    })
  }

  return (
    <Screen title="Ayarlar" back={href({ screen: 'home' })}>
      <h2 className={text.sectionTitle}>Yedek</h2>
      <BackupCard lastBackupAt={lastBackupAt} reminder={reminder} description={BACKUP_TEXTS.card} busy={saving} onSave={save} onFile={restore.open} />

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Görünüm</h2>
      <ChoiceGroup
        label="Görünüm"
        hideLabel
        options={APPEARANCES}
        selected={[appearance]}
        onToggle={(value) => {
          saveAppearance(value)
          setAppearance(value)
        }}
      />

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Bu cihazda</h2>
      <section className={styles.card}>
        <StorageStatus />
        <dl className={styles.facts}>
          <div>
            <dt>Hareket</dt>
            <dd>{movements.length}</dd>
          </div>
          <div>
            <dt>Kapladığı yer</dt>
            <dd>{usage === undefined ? '—' : megabytes(usage)}</dd>
          </div>
        </dl>
      </section>

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Hakkında</h2>
      <section className={styles.about}>
        <p className={styles.aboutLine}>
          <InfoIcon />
          FreedomKit yatırım tavsiyesi vermez.
        </p>
        <p className={styles.aboutLine}>
          <RefreshIcon size={18} />
          Kurlar ücretsiz exchange-api servisinden günlük olarak alınır; bu isteklerde tutarların gönderilmez. Adetli
          altınların değeri gram fiyatından hesaplanır; kuyumcu fiyatı farklı olabilir.
        </p>
      </section>

      <h2 className={`${text.sectionTitle} ${styles.later}`}>Verileri sil</h2>
      <p className={text.hint}>
        Bu cihazdaki her şeyi siler: birikim hareketleri, gider ve hedef, elle girilen fiyatlar ve ayarlar. Geri
        alınamaz; silmeden önce yedek al.
      </p>
      <Button variant="danger" disabled={wiping} onClick={() => setConfirming(true)}>
        {wiping ? 'Siliniyor…' : 'Tüm verileri sil'}
      </Button>

      <SettingsFooter version={buildTime} />

      {restore.dialogs}

      <ConfirmDialog
        open={confirming}
        title="Her şey silinsin mi?"
        confirmLabel="Evet, sil"
        onConfirm={() => {
          setConfirming(false)
          wipe()
        }}
        onCancel={() => setConfirming(false)}
      >
        {movements.length > 0 ? (
          <>
            <strong>{movements.length} hareket</strong>, gider ve hedefin ve elle girilen fiyatlarla birlikte silinecek.
          </>
        ) : settings ? (
          <>Gider ve hedefin ve elle girilen fiyatlar silinecek.</>
        ) : (
          <>Uygulama ayarları silinecek.</>
        )}{' '}
        Uygulama sıfırdan açılacak. {wipeWarning(lastBackupAt)}
      </ConfirmDialog>
    </Screen>
  )
}
