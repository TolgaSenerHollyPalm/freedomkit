import type { Tone } from 'kitshelf-ui/ui/tone.ts'
import Tile from 'kitshelf-ui/ui/Tile.tsx'
import { ASSETS } from '../money/assets.ts'
import type { AssetKind } from '../money/types.ts'
import { KindIcon } from './icons.tsx'

/** Gold in amber, foreign money in the kit's colour, lira in grey: as in the designs. */
const kindTone = (kind: AssetKind): Tone =>
  kind === 'TRY' ? 'neutral' : ASSETS[kind].goldGrams ? 'amber' : 'accent'

export default function KindTile({ kind, size }: { kind: AssetKind; size?: 'small' | 'large' }) {
  return (
    <Tile tone={kindTone(kind)} size={size}>
      <KindIcon kind={kind} />
    </Tile>
  )
}
