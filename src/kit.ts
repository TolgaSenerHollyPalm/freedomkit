/** The kit's identity, set once in .env; index.html and the web manifest are filled in from the same values. */
export const KIT = import.meta.env.VITE_KIT_ID // e.g. 'bookkit'
export const KIT_NAME = import.meta.env.VITE_KIT_NAME // e.g. 'BookKit'

export const DATABASE_NAME = KIT

/** Every localStorage key of the kit's own; all start with its id, and wiping the device removes each one. */
export const KEYS = {
  appearance: `${KIT}-appearance`, // the inline script in index.html reads it before the first paint
  installHintDismissed: `${KIT}-ios-install-hint-dismissed`,
  offlineReadyShown: `${KIT}-offline-ready-shown`,
}

/** The page colour of each scheme (kitshelf-ui's --color-bg), as in index.html's theme-color tags. */
export const PAGE_COLORS = { light: '#f7f5f0', dark: '#111615' }
