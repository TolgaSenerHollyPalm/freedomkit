/** The kit's own icons; the shared ones come from kitshelf-ui/ui/icons.tsx. */
import { lineIcon, type IconProps } from 'kitshelf-ui/ui/iconBase.ts'

export function NoteIcon({ size = 22, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...lineIcon(size, strokeWidth)}>
      <path d="M6.5 3.5h8l4 4v11a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M14.5 3.5v4h4M8.5 12h7M8.5 16h4.5" />
    </svg>
  )
}
