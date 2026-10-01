import { Button } from 'kitshelf-ui/ui/Button.tsx'
import Chip from 'kitshelf-ui/ui/Chip.tsx'
import Sheet from 'kitshelf-ui/ui/Sheet.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useOnline } from 'kitshelf-ui/ui/useOnline.ts'
import { useId, useState } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { formatAmount, formatLira, formatPrice, parseAmount } from '../money/amounts.ts'
import { ASSETS, PRICED_KINDS } from '../money/assets.ts'
import { dayMonth } from '../money/dates.ts'
import { unitPrice } from '../money/prices.ts'
import type { PricedKind } from '../money/types.ts'
import fields from '../ui/fields.module.css'
import styles from './PricesSheet.module.css'

/** What one of a kind costs: two decimals for a dollar, a euro or a gram, whole lira and "≈" for a coin's gold. */
function priceText(kind: PricedKind, price: number | undefined, own: boolean): string {
  if (price === undefined) return '—'
  return ASSETS[kind].counted ? `${own ? '' : '≈ '}${formatLira(price)}` : formatPrice(price)
}

/** The prices the app counts with, from the price line on the home screen (plan 6.5). */
export default function PricesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppData()
  const online = useOnline()
  const id = useId()
  const [editing, setEditing] = useState<PricedKind>()
  const [typed, setTyped] = useState('')
  const [problem, setProblem] = useState<string>()
  const pricing = pricingOf(data)
  const { refreshing } = data.priceStatus

  const startEditing = (kind: PricedKind) => {
    const price = unitPrice(kind, pricing)
    setEditing(kind)
    setTyped(price === undefined ? '' : formatAmount(Math.round(price * 100)))
    setProblem(undefined)
  }

  const save = (kind: PricedKind) => {
    const hundredths = parseAmount(typed)
    if (hundredths === undefined) {
      setProblem('Fiyatı yaz.')
      return
    }
    data.setOverride(kind, hundredths / 100)
    setEditing(undefined)
  }

  return (
    <Sheet
      open={open}
      title="Fiyatlar"
      onClose={() => {
        setEditing(undefined)
        onClose()
      }}
    >
      <ul className={styles.rows}>
        {PRICED_KINDS.map((kind) => {
          const own = data.overrides[kind] !== undefined
          return (
            <li key={kind} className={styles.row}>
              <div className={styles.line}>
                <span className={styles.name}>
                  {ASSETS[kind].name}
                  {own && <Chip tone="accent">elle</Chip>}
                </span>
                <span className={styles.price}>{priceText(kind, unitPrice(kind, pricing), own)}</span>
              </div>
              {editing === kind ? (
                <form
                  className={styles.edit}
                  onSubmit={(event) => {
                    event.preventDefault()
                    save(kind)
                  }}
                >
                  <label className={text.visuallyHidden} htmlFor={`${id}-${kind}`}>
                    {ASSETS[kind].name}, bir {ASSETS[kind].counted ? 'adet' : ASSETS[kind].phrase} kaç TL
                  </label>
                  <input
                    id={`${id}-${kind}`}
                    className={fields.input}
                    value={typed}
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    maxLength={16}
                    aria-invalid={problem !== undefined}
                    onChange={(event) => setTyped(event.target.value)}
                  />
                  <div className={styles.buttons}>
                    <Button variant="primary" type="submit">
                      Kaydet
                    </Button>
                    <Button variant="text" onClick={() => setEditing(undefined)}>
                      Vazgeç
                    </Button>
                  </div>
                  {problem && <p className={text.problem}>{problem}</p>}
                </form>
              ) : (
                <div className={styles.action}>
                  {own ? (
                    <Button variant="text" inline onClick={() => data.setOverride(kind, undefined)}>
                      Otomatik fiyata dön
                    </Button>
                  ) : (
                    <Button variant="text" inline onClick={() => startEditing(kind)}>
                      Elle gir
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className={styles.source}>
        <p className={styles.sourceLine}>Kaynak: exchange-api{pricing.record && ` · ${dayMonth(pricing.record.date)}`}</p>
        {online && (
          <Button variant="secondary" disabled={refreshing} onClick={data.refreshPrices}>
            {refreshing ? 'Yenileniyor…' : 'Şimdi yenile'}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
