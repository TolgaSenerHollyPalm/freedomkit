import { Button } from 'kitshelf-ui/ui/Button.tsx'
import { IconLink } from 'kitshelf-ui/ui/IconButton.tsx'
import { SlidersIcon } from 'kitshelf-ui/ui/icons.tsx'
import Screen from 'kitshelf-ui/ui/Screen.tsx'
import { useRef, useState } from 'react'
import { pricingOf, useAppData } from '../app/appData.ts'
import { href } from '../app/router.ts'
import { useRestore } from '../backup/useRestore.tsx'
import { KIT_NAME } from '../kit.ts'
import { parseAmount } from '../money/amounts.ts'
import { unitPrice } from '../money/prices.ts'
import { expenseProblem, welcomeSettings } from '../money/settings.ts'
import { goldOptionText } from '../money/texts.ts'
import type { Expense } from '../money/types.ts'
import { ExpenseChoice } from '../ui/choices.tsx'
import fields from '../ui/fields.module.css'
import { InfoIcon } from '../ui/icons.tsx'
import home from './HomeScreen.module.css'
import styles from './WelcomeScreen.module.css'

/** The first visit, before there are any settings: what the kit does, and the monthly expense (plan 6.6). */
export default function WelcomeScreen() {
  const data = useAppData()
  const restore = useRestore()
  const picker = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Expense['mode']>('amount')
  const [amount, setAmount] = useState('')
  const [tried, setTried] = useState(false)
  const typed = parseAmount(amount)
  const expense = mode === 'gold' ? ({ mode: 'gold' } as const) : ({ mode: 'amount', amountTRY: typed === undefined ? undefined : typed / 100 } as const)
  const problem = expenseProblem(expense)

  const start = () => {
    setTried(true)
    if (problem) return
    data.saveSettings(welcomeSettings(expense.mode === 'gold' ? expense : { mode: 'amount', amountTRY: expense.amountTRY! }, new Date()))
  }

  return (
    <Screen
      title="Birikimin kaç ay özgürlük ediyor?"
      icon={
        <span className={home.brand}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={32} height={32} />
          {KIT_NAME}
        </span>
      }
      aside={
        <IconLink to={href({ screen: 'settings' })} label="Ayarlar">
          <SlidersIcon />
        </IconLink>
      }
      footer={
        <Button variant="primary" big onClick={start}>
          Başla
        </Button>
      }
    >
      <div className={fields.form}>
        <div className={styles.intro}>
          <p>Birikimlerini ekle, aylık giderini yaz; FreedomKit sana kaç ay kendi kararlarını verebileceğini göstersin.</p>
          <p className={styles.quiet}>Tutarların bu cihazdan hiçbir yere gitmez.</p>
        </div>
        <ExpenseChoice
          mode={mode}
          amount={amount}
          problem={tried ? problem : undefined}
          goldText={goldOptionText(unitPrice('TAM', pricingOf(data)))}
          onMode={setMode}
          onAmount={setAmount}
        />
        <p className={styles.note}>
          <InfoIcon />
          Yatırım tavsiyesi değildir.
        </p>
        <button type="button" className={styles.restore} onClick={() => picker.current?.click()}>
          Yedeğin var mı? Geri yükle
        </button>
        {/* As on the settings card: no accept filter, reading the file checks it instead. */}
        <input
          ref={picker}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) restore.open(file)
          }}
        />
      </div>
      {/* Restored settings make the home screen show instead of this one. */}
      {restore.dialogs}
    </Screen>
  )
}
