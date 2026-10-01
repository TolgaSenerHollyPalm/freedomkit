import stepper from 'kitshelf-ui/ui/Stepper.module.css'
import { useId, useState } from 'react'
import styles from './CountField.module.css'

interface CountFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  unit?: string // after the number, e.g. "ay"
  centered?: boolean // the number in the middle and the label under it, as the goal is drawn
}

/** kitshelf-ui's stepper with a number that can also be typed: 40 çeyrek should not take 39 taps. */
export default function CountField({ label, value, min, max, onChange, unit, centered }: CountFieldProps) {
  const id = useId()
  const [typed, setTyped] = useState(String(value))
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const step = (by: number) => {
    const next = clamp(value + by)
    onChange(next)
    setTyped(String(next))
  }

  const labelText = (
    <label id={`${id}-label`} className={centered ? styles.caption : stepper.label} htmlFor={id}>
      {label}
    </label>
  )
  const controls = (
    <div className={centered ? `${stepper.controls} ${styles.wide}` : stepper.controls}>
      <button type="button" aria-label="Azalt" disabled={value <= min} onClick={() => step(-1)}>
        −
      </button>
      <span className={styles.number}>
        <input
          id={id}
          className={`${stepper.value} ${styles.input} ${centered ? styles.big : ''}`}
          value={typed}
          inputMode="numeric"
          autoComplete="off"
          maxLength={String(max).length}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            setTyped(digits)
            if (digits) onChange(clamp(Number(digits)))
          }}
          onBlur={() => setTyped(String(value))}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      <button type="button" aria-label="Artır" disabled={value >= max} onClick={() => step(1)}>
        +
      </button>
    </div>
  )

  return (
    <div className={centered ? `${styles.card} ${styles.centered}` : `${stepper.stepper} ${styles.card}`} role="group" aria-labelledby={`${id}-label`}>
      {centered ? (
        <>
          {controls}
          {labelText}
        </>
      ) : (
        <>
          {labelText}
          {controls}
        </>
      )}
    </div>
  )
}
