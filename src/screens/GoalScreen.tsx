import { Button } from 'kitshelf-ui/ui/Button.tsx'
import { HistoryIcon } from 'kitshelf-ui/ui/icons.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import text from 'kitshelf-ui/ui/text.module.css'
import { useState } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { href, navigate } from '../app/router.ts'
import { formatAmount, parseAmount } from '../money/amounts.ts'
import { expenseReminder } from '../money/motivation.ts'
import { unitPrice } from '../money/prices.ts'
import { DEFAULT_GOAL_MONTHS, editedSettings, expenseProblem, GOAL_LIMITS } from '../money/settings.ts'
import { goldOptionText } from '../money/texts.ts'
import type { Expense } from '../money/types.ts'
import { ExpenseChoice } from '../ui/choices.tsx'
import CountField from '../ui/CountField.tsx'
import fields from '../ui/fields.module.css'
import { InfoIcon } from '../ui/icons.tsx'
import styles from './GoalScreen.module.css'

/** What a month costs, typed or as one tam altın, and how many months to aim for (plan 6.3). */
export default function GoalScreen() {
  const data = useAppData()
  const { settings } = data
  const [mode, setMode] = useState<Expense['mode']>(settings?.expense.mode ?? 'amount')
  const [amount, setAmount] = useState(settings?.expense.mode === 'amount' ? formatAmount(Math.round(settings.expense.amountTRY * 100)) : '')
  const [goal, setGoal] = useState(settings?.goalMonths ?? DEFAULT_GOAL_MONTHS)
  const [tried, setTried] = useState(false)

  const typed = parseAmount(amount)
  const expense = mode === 'gold' ? ({ mode: 'gold' } as const) : ({ mode: 'amount', amountTRY: typed === undefined ? undefined : typed / 100 } as const)
  const problem = expenseProblem(expense)
  const reminder = settings && expenseReminder(settings, new Date())

  const save = () => {
    setTried(true)
    if (problem) return
    const chosen: Expense = expense.mode === 'gold' ? expense : { mode: 'amount', amountTRY: expense.amountTRY! }
    data.saveSettings(editedSettings(settings, { expense: chosen, goalMonths: goal }, new Date()))
    navigate({ screen: 'home' }, { replace: true })
  }

  return (
    <Screen
      title="Gider ve hedef"
      back={href({ screen: 'home' })}
      footer={
        <Button variant="primary" big onClick={save}>
          Kaydet
        </Button>
      }
    >
      <div className={fields.form}>
        <ExpenseChoice
          mode={mode}
          amount={amount}
          problem={tried ? problem : undefined}
          goldText={goldOptionText(unitPrice('TAM', pricingOf(data)))}
          onMode={setMode}
          onAmount={setAmount}
        />

        {reminder !== undefined && mode === 'amount' && (
          <div className={styles.reminder} role="status">
            <HistoryIcon size={22} />
            <div>
              <p className={styles.reminderTitle}>Giderini {reminder} ay önce girdin.</p>
              <p className={styles.reminderLine}>Fiyatlar değiştiyse güncelle.</p>
            </div>
          </div>
        )}

        <section className={styles.goal} aria-labelledby="goal-title">
          <h2 id="goal-title" className={text.sectionTitle}>
            Hedefin
          </h2>
          <CountField label="Kaç ay özgür olmak istiyorsun?" value={goal} min={GOAL_LIMITS.min} max={GOAL_LIMITS.max} onChange={setGoal} unit="ay" centered />
        </section>

        <p className={styles.info}>
          <InfoIcon />
          FreedomKit yatırım tavsiyesi vermez; neyle biriktireceğine sen karar verirsin. Sadece birikimini aya çevirir.
        </p>
      </div>
    </Screen>
  )
}
