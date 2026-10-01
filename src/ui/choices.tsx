import { PlusIcon } from 'kitshelf-ui/ui/icons.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useId, useRef, type KeyboardEvent } from 'react'
import { ASSETS } from '../money/assets.ts'
import { ASSET_KINDS, type AssetKind, type Movement } from '../money/types.ts'
import styles from './choices.module.css'
import { KindIcon, MinusIcon } from './icons.tsx'

/** Arrow keys move the choice along a radio group, as the platform's own radio buttons do. */
function arrows<T>(options: readonly T[], selected: T, onSelect: (value: T) => void, columns = options.length) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: columns, ArrowLeft: -1, ArrowUp: -columns }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (options.indexOf(selected) + step + options.length) % options.length
    onSelect(options[next])
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus()
  }
}

const DIRECTIONS: Movement['direction'][] = ['in', 'out']

export function DirectionSwitch({ value, onChange }: { value: Movement['direction']; onChange: (value: Movement['direction']) => void }) {
  return (
    <div className={styles.switch} role="radiogroup" aria-label="İşlem" onKeyDown={arrows(DIRECTIONS, value, onChange)}>
      {DIRECTIONS.map((direction) => (
        <button
          key={direction}
          type="button"
          role="radio"
          aria-checked={value === direction}
          tabIndex={value === direction ? 0 : -1}
          className={styles.segment}
          onClick={() => onChange(direction)}
        >
          {direction === 'in' ? <PlusIcon size={16} strokeWidth={2.2} /> : <MinusIcon />}
          {direction === 'in' ? 'Ekle' : 'Çıkar'}
        </button>
      ))}
    </div>
  )
}

export function KindPicker({ value, onChange }: { value: AssetKind; onChange: (value: AssetKind) => void }) {
  const id = useId()
  return (
    <div className={styles.group}>
      <span id={id} className={styles.legend}>
        Ne?
      </span>
      <div className={styles.kinds} role="radiogroup" aria-labelledby={id} onKeyDown={arrows(ASSET_KINDS, value, onChange, 4)}>
        {ASSET_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={value === kind}
            aria-label={ASSETS[kind].name}
            tabIndex={value === kind ? 0 : -1}
            className={ASSETS[kind].goldGrams ? `${styles.kind} ${styles.gold}` : styles.kind}
            onClick={() => onChange(kind)}
          >
            <KindIcon kind={kind} size={20} />
            {ASSETS[kind].short}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ExpenseChoiceProps {
  mode: 'amount' | 'gold'
  amount: string // as typed
  problem?: string
  goldText: string // the gold option's explanation, with today's worth of a tam altın when known
  onMode: (mode: 'amount' | 'gold') => void
  onAmount: (amount: string) => void
}

/** "Aylık giderin": a typed amount, or one tam altın a month. On the goal screen and the first-run welcome. */
export function ExpenseChoice({ mode, amount, problem, goldText, onMode, onAmount }: ExpenseChoiceProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  return (
    <fieldset className={styles.group}>
      <legend className={text.sectionTitle}>Aylık giderin</legend>
      <div className={mode === 'amount' ? `${styles.option} ${styles.chosen}` : styles.option}>
        <label className={styles.radio}>
          <input
            type="radio"
            name={`${id}-mode`}
            checked={mode === 'amount'}
            onChange={() => {
              onMode('amount')
              requestAnimationFrame(() => input.current?.focus())
            }}
          />
          <span className={styles.radioTitle}>Kendi rakamım</span>
        </label>
        {mode === 'amount' && (
          <div className={styles.amount}>
            <label className={text.visuallyHidden} htmlFor={`${id}-amount`}>
              Aylık gider, TL
            </label>
            <div className={styles.lira}>
              <input
                ref={input}
                id={`${id}-amount`}
                value={amount}
                inputMode="decimal"
                autoComplete="off"
                maxLength={16}
                aria-invalid={problem !== undefined}
                aria-describedby={`${id}-hint${problem ? ` ${id}-problem` : ''}`}
                onChange={(event) => onAmount(event.target.value)}
              />
              <span className={styles.unit}>TL</span>
            </div>
            <span id={`${id}-hint`} className={styles.radioHint}>
              Kira, fatura, market… bir ayda harcadığın toplam.
            </span>
            {problem && (
              <p id={`${id}-problem`} className={text.problem}>
                {problem}
              </p>
            )}
          </div>
        )}
      </div>
      <label className={mode === 'gold' ? `${styles.option} ${styles.chosen} ${styles.radio}` : `${styles.option} ${styles.radio}`}>
        <input type="radio" name={`${id}-mode`} checked={mode === 'gold'} onChange={() => onMode('gold')} />
        <span className={styles.radioText}>
          <span className={styles.radioTitle}>1 ay = 1 tam altın</span>
          <span className={styles.radioHint}>{goldText}</span>
        </span>
      </label>
    </fieldset>
  )
}
