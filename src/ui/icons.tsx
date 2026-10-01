/** The kit's own icons, drawn as in docs/design/freedomkit; the shared ones come from kitshelf-ui/ui/icons.tsx. */
import { lineIcon, type IconProps } from 'kitshelf-ui/ui/iconBase.ts'
import type { AssetKind } from '../money/types.ts'

export function LiraIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M9.5 3.5v16c4.6 0 7.9-3 8.4-7.5M5.8 11.3l7.9-3.1M5.8 15.2l7.9-3.1" />
    </svg>
  )
}

export function DollarIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M16 8.3c-.7-1.4-2.2-2.2-4-2.2-2.3 0-3.9 1.2-3.9 2.9 0 4.1 8.1 2.2 8.1 6.3 0 1.8-1.7 3.1-4.2 3.1-2.1 0-3.7-.9-4.4-2.4M12 3.5v17" />
    </svg>
  )
}

export function EuroIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M17.5 7a6.6 6.6 0 1 0 0 10M5 10.5h8.5M5 13.5h8.5" />
    </svg>
  )
}

export function BarIcon({ size = 22, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M7.6 8.5h8.8l3.1 9H4.5z M9.5 12.5h5" />
    </svg>
  )
}

/** A coin as two rings; the bigger the coin, the bigger the rings, and a dot for the Cumhuriyet. */
function CoinIcon({ size = 22, strokeWidth = 1.8, outer, inner, dot }: IconProps & { outer: number; inner: number; dot?: boolean }) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <circle cx="12" cy="12" r={outer} />
      <circle cx="12" cy="12" r={inner} />
      {dot && <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />}
    </svg>
  )
}

const COINS = { CEYREK: { outer: 6, inner: 2.6 }, YARIM: { outer: 7.3, inner: 3.8 }, TAM: { outer: 8.5, inner: 5 } }

export function KindIcon({ kind, size }: { kind: AssetKind; size?: number }) {
  switch (kind) {
    case 'TRY':
      return <LiraIcon size={size} />
    case 'USD':
      return <DollarIcon size={size} />
    case 'EUR':
      return <EuroIcon size={size} />
    case 'GRAM':
      return <BarIcon size={size} />
    case 'CUMHURIYET':
      return <CoinIcon size={size} {...COINS.TAM} dot />
    default:
      return <CoinIcon size={size} {...COINS[kind]} />
  }
}

/** The day's sentence on the home screen: a coin's rings. */
export function RingsIcon({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
    </svg>
  )
}

export function MinusIcon({ size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function TrendUpIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M3.5 17l6-6 4 4 7-7.5M15 7.5h5.5V13" />
    </svg>
  )
}

export function TrendDownIcon({ size = 20, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M3.5 7l6 6 4-4 7 7.5M15 16.5h5.5V11" />
    </svg>
  )
}

export function InfoIcon({ size = 18, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
