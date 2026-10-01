import { dayOfYear } from './dates.ts'
import { durationText } from './freedom.ts'
import type { Day, Settings } from './types.ts'

const DAY_MS = 86_400_000
const REMIND_AFTER_DAYS = 180

/** Our own lines; nobody famous is quoted (plan 5.3). */
export const FIXED_SENTENCES = [
  'Paran varsa korkmazsın.',
  'Her tam altın, bir ay kendi kararlarını vermek demek.',
  'Küçük birikimler, büyük kararlar için zaman kazandırır.',
  'Özgürlük bir günde gelmez; gün gün birikir.',
  'Bugün kenara koyduğun, yarın sana zaman olarak döner.',
]

/**
 * The day's line on the home screen: the fixed ones and those that fit today, taken in turn by the day of the
 * year. `months` is today's freedom when there is one, `thisMonth` what this month's movements added.
 */
export function dailySentence(today: Day, context: { months?: number; thisMonth?: number; goalMonths: number }): string {
  const { months, thisMonth, goalMonths } = context
  const candidates = [...FIXED_SENTENCES]
  if (thisMonth !== undefined && thisMonth > 0) candidates.push(`Bu ay özgürlüğüne ${durationText(thisMonth)} ekledin.`)
  if (months !== undefined) {
    candidates.push(
      months < goalMonths
        ? `Hedefine ${durationText(goalMonths - months)} kaldı.`
        : `Hedefine ulaştın: ${Math.floor(months)} ay özgürsün.`,
    )
  }
  return candidates[dayOfYear(today) % candidates.length]
}

/** How many months ago a typed expense was entered, once that is more than 180 days; never in gold mode. */
export function expenseReminder(settings: Settings, now: Date): number | undefined {
  if (settings.expense.mode !== 'amount') return undefined
  const days = (now.getTime() - new Date(settings.expenseUpdatedAt).getTime()) / DAY_MS
  return days > REMIND_AFTER_DAYS ? Math.floor(days / 30) : undefined
}
