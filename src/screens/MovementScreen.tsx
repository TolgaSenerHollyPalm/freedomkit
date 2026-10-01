import { Button } from 'kitshelf-ui/ui/Button.tsx'
import ConfirmDialog from 'kitshelf-ui/ui/ConfirmDialog.tsx'
import Missing from 'kitshelf-ui/ui/Missing.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useToast } from 'kitshelf-ui/ui/toastContext.ts'
import { useId, useState } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { formatAmount, amountPhrase, parseAmount } from '../money/amounts.ts'
import { ASSETS } from '../money/assets.ts'
import { today } from '../money/dates.ts'
import { monthlyExpense, previewText } from '../money/freedom.ts'
import { balanceProblem, editMovement, fieldProblems, movementTitle, newMovement } from '../money/movements.ts'
import { unitPrice, valueOf } from '../money/prices.ts'
import { worthText } from '../money/texts.ts'
import type { AssetKind, Movement } from '../money/types.ts'
import { DirectionSwitch, KindPicker } from '../ui/choices.tsx'
import CountField from '../ui/CountField.tsx'
import fields from '../ui/fields.module.css'
import styles from './MovementScreen.module.css'

const MAX_COINS = 9999

/** "Birikim ekle", and the same form as "Hareketi düzenle" for a movement from the history (plan 6.2, 6.4). */
export default function MovementScreen({ movementId }: { movementId?: string }) {
  const data = useAppData()
  const show = useToast()
  const id = useId()
  const existing = movementId === undefined ? undefined : data.movements.find((movement) => movement.id === movementId)
  const counted = (kind: AssetKind) => ASSETS[kind].counted
  const [direction, setDirection] = useState<Movement['direction']>(existing?.direction ?? 'in')
  const [kind, setKind] = useState<AssetKind>(existing?.kind ?? 'TRY')
  const [coins, setCoins] = useState(existing && counted(existing.kind) ? existing.amount / 100 : 1)
  const [typed, setTyped] = useState(existing && !counted(existing.kind) ? formatAmount(existing.amount) : '')
  const [date, setDate] = useState(existing?.date ?? today())
  const [note, setNote] = useState(existing?.note ?? '')
  const [tried, setTried] = useState(false)
  const [blocked, setBlocked] = useState<string>()
  const [confirming, setConfirming] = useState(false)

  const back = href({ screen: existing || movementId ? 'history' : 'home' })
  if (movementId !== undefined && !existing) return <Missing message="Bu hareket bulunamadı." back={href({ screen: 'history' })} />

  const now = today()
  const amount = counted(kind) ? coins * 100 : parseAmount(typed)
  const problems = fieldProblems({ amount, date }, now)
  const pricing = pricingOf(data)
  const price = unitPrice(kind, pricing)
  const expense = data.settings && monthlyExpense(data.settings, pricing)
  const value = amount !== undefined && price !== undefined ? valueOf(amount, price) : undefined
  // Any change to what would be saved asks the balance again.
  const changed = <T,>(set: (value: T) => void) => (next: T) => {
    set(next)
    setBlocked(undefined)
  }

  const submit = () => {
    setTried(true)
    if (amount === undefined || problems.amount || problems.date) return
    const filled = { kind, direction, amount, date, note }
    const next = existing ? editMovement(existing, filled) : newMovement(filled, new Date())
    const problem = balanceProblem(data.movements, existing, next)
    if (problem) {
      setBlocked(problem)
      return
    }
    data.saveMovement(next)
    show(`Kaydedildi: ${movementTitle(next)}`)
    navigate({ screen: existing ? 'history' : 'home' }, { replace: true })
  }

  const remove = () => {
    setConfirming(false)
    if (!existing) return
    const problem = balanceProblem(data.movements, existing, undefined)
    if (problem) {
      setBlocked(problem)
      return
    }
    data.deleteMovement(existing.id)
    show('Hareket silindi')
    navigate({ screen: 'history' }, { replace: true })
  }

  return (
    <Screen
      title={existing ? 'Hareketi düzenle' : 'Birikim ekle'}
      back={back}
      footer={
        <Button variant="primary" big onClick={submit}>
          Kaydet
        </Button>
      }
    >
      <div className={fields.form}>
        <DirectionSwitch value={direction} onChange={changed(setDirection)} />
        <KindPicker value={kind} onChange={changed(setKind)} />

        {counted(kind) ? (
          <CountField label="Kaç adet?" value={coins} min={1} max={MAX_COINS} onChange={changed(setCoins)} />
        ) : (
          <div className={fields.field}>
            <label className={fields.label} htmlFor={`${id}-amount`}>
              Miktar
            </label>
            <div className={styles.amount}>
              <input
                id={`${id}-amount`}
                className={fields.input}
                value={typed}
                inputMode="decimal"
                autoComplete="off"
                maxLength={20}
                aria-invalid={tried && problems.amount !== undefined}
                aria-describedby={tried && problems.amount ? `${id}-amount-problem` : undefined}
                onChange={(event) => changed(setTyped)(event.target.value)}
              />
              <span className={styles.unit}>{ASSETS[kind].unit}</span>
            </div>
            {tried && problems.amount && (
              <p id={`${id}-amount-problem`} className={text.problem}>
                {problems.amount}
              </p>
            )}
          </div>
        )}

        {blocked && (
          <p className={text.problem} role="alert">
            {blocked}
          </p>
        )}

        {amount !== undefined && (
          <section className={styles.preview} aria-live="polite">
            {kind !== 'TRY' && (
              <span className={styles.previewLabel}>
                {amountPhrase(kind, amount)}, {counted(kind) ? 'yaklaşık değeri' : 'değeri'}
              </span>
            )}
            {value === undefined ? (
              <span className={styles.previewEffect}>Fiyat alınamadı; kayıt yine de tutulur.</span>
            ) : (
              <>
                <span className={styles.previewValue}>{worthText(kind, value)}</span>
                {expense !== undefined && expense > 0 && (
                  <span className={styles.previewEffect}>{previewText(direction === 'in' ? value : -value, expense)}</span>
                )}
              </>
            )}
          </section>
        )}

        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-date`}>
            Tarih
          </label>
          <input
            id={`${id}-date`}
            className={fields.input}
            type="date"
            max={now}
            value={date}
            required
            aria-invalid={tried && problems.date !== undefined}
            onChange={(event) => changed(setDate)(event.target.value || now)}
          />
          {tried && problems.date && <p className={text.problem}>{problems.date}</p>}
        </div>

        <div className={fields.field}>
          <label className={fields.label} htmlFor={`${id}-note`}>
            Not <span className={fields.optional}>(isteğe bağlı)</span>
          </label>
          <input
            id={`${id}-note`}
            className={fields.input}
            value={note}
            maxLength={120}
            autoComplete="off"
            placeholder="ör. doğum günü hediyesi"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {existing && (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Hareketi sil
          </Button>
        )}
      </div>

      <ConfirmDialog open={confirming} title="Bu hareket silinsin mi?" confirmLabel="Evet, sil" onConfirm={remove} onCancel={() => setConfirming(false)}>
        Geri alınamaz.
      </ConfirmDialog>
    </Screen>
  )
}
