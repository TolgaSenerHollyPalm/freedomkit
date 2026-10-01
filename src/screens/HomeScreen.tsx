import BackupReminder from 'kitshelf-ui/backup/BackupReminder.tsx'
import { IconLink } from 'kitshelf-ui/ui/IconButton.tsx'
import { HistoryIcon, PlusIcon, SlidersIcon } from 'kitshelf-ui/ui/icons.tsx'
import IosInstallHint from 'kitshelf-ui/ui/IosInstallHint.tsx'
import { LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import { LinkRow, ListCard } from 'kitshelf-ui/ui/ListCard.tsx'
import OnlineBadge from 'kitshelf-ui/ui/OnlineBadge.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useOnline } from 'kitshelf-ui/ui/useOnline.ts'
import { useState } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { BACKUP_TEXTS, useBackupReminder } from '../backup/kitBackup.ts'
import { KEYS, KIT_NAME } from '../kit.ts'
import { amountWithUnit, formatLira } from '../money/amounts.ts'
import { ASSETS } from '../money/assets.ts'
import { today } from '../money/dates.ts'
import { durationParts, freedom, goalPercent, monthlyExpense, thisMonth, totalValue, type Freedom } from '../money/freedom.ts'
import { balances } from '../money/holdings.ts'
import { dailySentence, expenseReminder } from '../money/motivation.ts'
import { unitPrice, valueOf } from '../money/prices.ts'
import { expenseText, negativeWarnings, priceLine, worthText } from '../money/texts.ts'
import type { Settings } from '../money/types.ts'
import GoalRing from '../ui/GoalRing.tsx'
import { RingsIcon } from '../ui/icons.tsx'
import KindTile from '../ui/KindTile.tsx'
import styles from './HomeScreen.module.css'
import PricesSheet from './PricesSheet.tsx'
import WelcomeScreen from './WelcomeScreen.tsx'

const STATES: Record<Exclude<Freedom['state'], 'free'>, { title: string; line: string }> = {
  empty: { title: 'Henüz birikim yok', line: 'İlk birikimini ekle; kaç ay özgür olduğunu hemen hesaplayalım.' },
  none: { title: 'Şu an birikimin yok', line: 'Yeni bir birikim ekleyince süre yeniden hesaplanır.' },
  priceless: { title: 'Fiyatlar alınamadı', line: 'İnternete bağlanınca hesaplanır. İstersen fiyatları elle de girebilirsin.' },
}

/** "3 ay 24 gün" in large type; each number keeps its unit, so a narrow card puts "24 gün" on a line of its own. */
function Duration({ months }: { months: number }) {
  const parts = durationParts(months)
  if (!parts) return <span className={styles.headline}>1 günden az</span>
  return (
    <span className={styles.duration}>
      {parts.months > 0 && (
        <span className={styles.part}>
          <span className={styles.number}>{parts.months}</span>
          <span className={styles.unit}>ay</span>
        </span>
      )}
      {parts.days > 0 && (
        <span className={styles.part}>
          <span className={styles.number}>{parts.days}</span>
          <span className={styles.unit}>gün</span>
        </span>
      )}
    </span>
  )
}

function FreedomCard({ card, settings, tamValue, onPrices }: { card: Freedom; settings: Settings; tamValue?: number; onPrices: () => void }) {
  const state = card.state === 'free' ? undefined : STATES[card.state]
  return (
    <section className={styles.card} aria-label="Özgürlük süren">
      <div className={styles.cardTop}>
        <div className={styles.cardMain}>
          {card.state === 'free' && <span className={styles.pill}>Bugün itibarıyla</span>}
          {card.state === 'free' ? (
            <p className={styles.free}>
              <Duration months={card.months} />
              <span className={styles.unit}>özgürsün</span>
            </p>
          ) : (
            <div className={styles.state}>
              <p className={styles.headline}>{state!.title}</p>
              {card.state === 'priceless' ? (
                <button type="button" className={styles.stateLink} onClick={onPrices}>
                  {state!.line}
                </button>
              ) : (
                <p className={styles.stateLine}>{state!.line}</p>
              )}
            </div>
          )}
        </div>
        <div className={styles.goal}>
          <GoalRing percent={card.state === 'free' ? goalPercent(card.months, settings.goalMonths) : card.state === 'priceless' ? undefined : 0} />
          <span className={styles.goalText}>Hedef {settings.goalMonths} ay</span>
        </div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.expense}>
          Aylık giderin <strong>{expenseText(settings, tamValue)}</strong>
        </span>
        <a className={styles.change} href={href({ screen: 'goal' })}>
          Değiştir
        </a>
      </div>
    </section>
  )
}

/** The home screen: how long the savings would last, and what they are. The first visit gets the welcome instead. */
export default function HomeScreen() {
  const data = useAppData()
  const online = useOnline()
  const [pricesOpen, setPricesOpen] = useState(false)
  const { reminder: backup, lastBackupAt, snooze } = useBackupReminder()
  const { movements, settings } = data
  if (!settings) return <WelcomeScreen />

  const now = new Date()
  const day = today(now)
  const pricing = pricingOf(data)
  const card = freedom(movements, settings, pricing)
  const expense = monthlyExpense(settings, pricing)
  const added = expense ? thisMonth(movements, day, pricing, expense) : undefined
  const sentence = dailySentence(day, { months: card.state === 'free' ? card.months : undefined, thisMonth: added, goalMonths: settings.goalMonths })
  const reminder = expenseReminder(settings, now)
  const held = [...balances(movements)]
    .filter(([, hundredths]) => hundredths !== 0)
    .map(([kind, hundredths]) => {
      const price = unitPrice(kind, pricing)
      return { kind, hundredths, value: price === undefined ? undefined : valueOf(hundredths, price) }
    })
    .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
  const total = totalValue(balances(movements), pricing)

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
          <IconLink to={href({ screen: 'settings' })} label={backup.due ? 'Ayarlar, yedek zamanı' : 'Ayarlar'} badge={backup.due}>
            <SlidersIcon />
          </IconLink>
        </>
      }
      // Screen puts a mark before the title; this one is ordered after it, at the right, as in the design.
      mark={
        <a className={styles.history} href={href({ screen: 'history' })}>
          <HistoryIcon size={18} strokeWidth={2} />
          Geçmiş
        </a>
      }
      footer={
        <LinkButton to={href({ screen: 'add' })} variant="primary" big>
          <PlusIcon size={20} strokeWidth={2.2} />
          Birikim ekle
        </LinkButton>
      }
    >
      <IosInstallHint dismissedKey={KEYS.installHintDismissed} />
      {backup.showBanner && (
        <BackupReminder reminder={backup} lastBackupAt={lastBackupAt} text={BACKUP_TEXTS.banner} href={href({ screen: 'settings' })} onDismiss={snooze} />
      )}
      <FreedomCard card={card} settings={settings} tamValue={unitPrice('TAM', pricing)} onPrices={() => setPricesOpen(true)} />

      <div className={styles.lines}>
        <p className={styles.sentence}>
          <RingsIcon />
          {sentence}
        </p>
        {reminder !== undefined && (
          <a className={styles.reminder} href={href({ screen: 'goal' })}>
            Giderini {reminder} ay önce girdin · Güncelle
          </a>
        )}
      </div>

      {negativeWarnings(movements).map((warning) => (
        <p key={warning} className={text.notice} role="status">
          {warning}
        </p>
      ))}

      {held.length > 0 && (
        <section className={styles.savings} aria-labelledby="savings-title">
          <div className={styles.savingsHead}>
            <h2 id="savings-title" className={text.sectionTitle}>
              Birikimlerin
            </h2>
            {total !== undefined && (
              <span className={styles.total}>
                <span className={styles.totalLabel}>Toplam</span>
                <span className={styles.totalValue}>{formatLira(total)}</span>
              </span>
            )}
          </div>
          <ListCard>
            {held.map(({ kind, hundredths, value }) => (
              <LinkRow
                key={kind}
                tile={<KindTile kind={kind} />}
                title={<span className={styles.name}>{ASSETS[kind].name}</span>}
                subtitle={kind === 'TRY' ? undefined : amountWithUnit(kind, hundredths)}
                trailing={<span className={styles.worth}>{value === undefined ? '—' : worthText(kind, value)}</span>}
              />
            ))}
          </ListCard>
        </section>
      )}

      <button type="button" className={styles.priceLine} onClick={() => setPricesOpen(true)}>
        {priceLine(pricing.record, online, data.priceStatus.refreshing)}
      </button>

      <PricesSheet open={pricesOpen} onClose={() => setPricesOpen(false)} />
    </Screen>
  )
}
