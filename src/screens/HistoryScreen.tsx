import { LinkButton } from 'kitshelf-ui/ui/Button.tsx'
import { LinkRow, ListCard } from 'kitshelf-ui/ui/ListCard.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useEffect } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { dayMonth, monthTitle, today } from '../money/dates.ts'
import { axisTop, freedomSeries, monthlyExpense, seriesLabel, thisMonth, thisMonthText } from '../money/freedom.ts'
import { byMonth, movementTitle } from '../money/movements.ts'
import { recordFor, unitPrice, valueOf } from '../money/prices.ts'
import { worthText } from '../money/texts.ts'
import FreedomChart from '../ui/FreedomChart.tsx'
import { TrendDownIcon, TrendUpIcon } from '../ui/icons.tsx'
import KindTile from '../ui/KindTile.tsx'
import styles from './HistoryScreen.module.css'

/** Freedom over the last 12 months, and every movement by month (plan 6.4). */
export default function HistoryScreen() {
  const data = useAppData()
  const { movements, prices, settings, loadHistory } = data

  // The chart's month ends are downloaded once and kept; opening the screen fills in what a new movement needs.
  useEffect(() => loadHistory(), [loadHistory])

  const day = today()
  const pricing = pricingOf(data)
  const expense = settings && monthlyExpense(settings, pricing)
  const points = expense ? freedomSeries(movements, day, (date) => recordFor(prices, date), pricing, expense) : []
  const added = expense ? thisMonth(movements, day, pricing, expense) : undefined
  const addedText = thisMonthText(added)
  const goal = settings?.goalMonths ?? 6

  return (
    <Screen title="Geçmiş" back={href({ screen: 'home' })}>
      {movements.length === 0 ? (
        <section className={styles.empty}>
          <p>Henüz bir hareket yok. İlk birikimini ekleyince özgürlüğünün ay ay nasıl değiştiği burada görünür.</p>
          <LinkButton to={href({ screen: 'add' })} variant="primary">
            Birikim ekle
          </LinkButton>
        </section>
      ) : (
        <>
          <section className={styles.chartCard} aria-labelledby="chart-title">
            <h2 id="chart-title" className={styles.chartTitle}>
              Özgürlüğün, son 12 ay
            </h2>
            {points.length === 0 ? (
              <p className={styles.note}>Fiyatlar alınamadı; grafik internete bağlanınca çizilir.</p>
            ) : (
              <>
                <FreedomChart points={points} goalMonths={goal} top={axisTop(goal, points)} label={seriesLabel(points)} />
                <p className={styles.note}>
                  {points.length === 1 ? 'Grafik ikinci aydan itibaren çizgiye döner. ' : ''}Bugünkü aylık giderinle hesaplanır.
                </p>
              </>
            )}
            {addedText && (
              <p className={added! > 0 ? `${styles.month} ${styles.up}` : `${styles.month} ${styles.down}`}>
                {added! > 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                {addedText}
              </p>
            )}
          </section>

          <section className={styles.movements} aria-labelledby="movements-title">
            <h2 id="movements-title" className={text.sectionTitle}>
              Hareketler
            </h2>
            {byMonth(movements).map(({ month, movements: inMonth }) => (
              <div key={month} className={styles.monthGroup}>
                <h3 className={styles.monthTitle}>{monthTitle(month)}</h3>
                <ListCard>
                  {inMonth.map((movement) => {
                    const price = unitPrice(movement.kind, pricing)
                    return (
                      <LinkRow
                        key={movement.id}
                        to={href({ screen: 'movement', movementId: movement.id })}
                        tile={<KindTile kind={movement.kind} />}
                        title={<span className={movement.direction === 'in' ? styles.in : styles.out}>{movementTitle(movement)}</span>}
                        subtitle={
                          <>
                            {dayMonth(movement.date)}
                            {movement.note && <span className={styles.movementNote}>{movement.note}</span>}
                          </>
                        }
                        trailing={
                          movement.kind !== 'TRY' && price !== undefined ? (
                            <span className={styles.worth}>{worthText(movement.kind, valueOf(movement.amount, price))}</span>
                          ) : (
                            <span />
                          )
                        }
                      />
                    )
                  })}
                </ListCard>
              </div>
            ))}
            <p className={styles.note}>Altın adetleri yaklaşık değerdir.</p>
          </section>
        </>
      )}
    </Screen>
  )
}
