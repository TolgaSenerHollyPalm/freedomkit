import { createContext, useContext } from 'react'
import { latestRecord, type Pricing } from '../money/prices.ts'
import type { Movement, Overrides, PriceRecord, PricedKind, Settings } from '../money/types.ts'

export interface AppData {
  movements: Movement[]
  settings?: Settings // absent until the first-run welcome is answered
  overrides: Overrides
  prices: PriceRecord[] // every day the price service answered for, kept for the chart and for going offline
  /** Stores a movement, adding it when it is new, and stamps it with the time. */
  saveMovement: (movement: Movement) => void
  deleteMovement: (movementId: string) => void
  /** Stores the settings as they are; welcomeSettings and editedSettings decide their stamps. */
  saveSettings: (settings: Settings) => void
  /** The user's own price for one kind; undefined goes back to the automatic one. */
  setOverride: (kind: PricedKind, priceTRY: number | undefined) => void
  /** Keeps the records the price service brought. */
  addPrices: (records: PriceRecord[]) => void
  /** Whether the price service is being asked right now, and whether the last ask failed. */
  priceStatus: { refreshing: boolean; failed: boolean }
  /** Asks the price service now ("Şimdi yenile"), then downloads the month ends the chart lacks. */
  refreshPrices: () => void
  /** Reads everything from IndexedDB again, e.g. after a backup was restored. */
  reload: () => Promise<void>
}

export const AppDataContext = createContext<AppData | null>(null)

export function useAppData(): AppData {
  const data = useContext(AppDataContext)
  if (!data) throw new Error('useAppData must be used inside <AppDataProvider>')
  return data
}

/** Today's prices: the newest record kept and the user's own. */
export const pricingOf = (data: Pick<AppData, 'prices' | 'overrides'>): Pricing => ({
  record: latestRecord(data.prices),
  overrides: data.overrides,
})
