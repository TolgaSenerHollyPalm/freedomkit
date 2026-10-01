import { IconLink } from 'kitshelf-ui/ui/IconButton.tsx'
import { SlidersIcon } from 'kitshelf-ui/ui/icons.tsx'
import IosInstallHint from 'kitshelf-ui/ui/IosInstallHint.tsx'
import OnlineBadge from 'kitshelf-ui/ui/OnlineBadge.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { href } from '../app/router.ts'
import { KEYS, KIT_NAME } from '../kit.ts'
import styles from './HomeScreen.module.css'

/** The home screen. Until savings can be added it only says what the kit is for. */
export default function HomeScreen() {
  return (
    <Screen
      title="Özgürlüğün"
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
          <IconLink to={href({ screen: 'settings' })} label="Ayarlar">
            <SlidersIcon />
          </IconLink>
        </>
      }
    >
      <IosInstallHint dismissedKey={KEYS.installHintDismissed} />
      <section className={styles.welcome}>
        <h2 className={styles.welcomeTitle}>Birikimin kaç ay özgürlük ediyor?</h2>
        <p className={text.hint}>
          Birikimlerini ekle, aylık giderini yaz; FreedomKit sana kaç ay kendi kararlarını verebileceğini göstersin.
        </p>
      </section>
    </Screen>
  )
}
