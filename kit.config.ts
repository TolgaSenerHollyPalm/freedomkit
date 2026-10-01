import type { ManifestOptions } from 'vite-plugin-pwa'

export interface KitSettings {
  id: string
  name: string
  description: string
  devPort?: number
  previewPort?: number
}

/** The kit's identity and ports from .env; a value that would break the app stops the build instead. */
export function kitSettings(env: Record<string, string | undefined>): KitSettings {
  const { VITE_KIT_ID: id = '', VITE_KIT_NAME: name = '', VITE_KIT_DESCRIPTION: description = '' } = env
  // The id becomes the database name and the start of every storage key and backup file name.
  if (!/^[a-z][a-z0-9]*$/.test(id)) throw new Error(`.env: VITE_KIT_ID must be lowercase letters and digits, e.g. bookkit (got "${id}")`)
  // kitshelf-ui's Turkish messages add endings to the name ("BookKit'e"), which only fit a name ending in "Kit".
  if (!/^\S+Kit$/.test(name)) throw new Error(`.env: VITE_KIT_NAME must be one word ending in "Kit", e.g. BookKit (got "${name}")`)
  // The description lands inside an attribute in index.html.
  if (description.trim() === '' || /["<>%]/.test(description)) throw new Error('.env: VITE_KIT_DESCRIPTION must not be empty or contain " < > %')
  const port = (key: string) => {
    const value = env[key]
    if (value && !/^\d{2,5}$/.test(value)) throw new Error(`.env: ${key} must be a port number (got "${value}")`)
    return value ? Number(value) : undefined
  }
  return { id, name, description, devPort: port('DEV_PORT'), previewPort: port('PREVIEW_PORT') }
}

// start_url and scope are filled in by vite-plugin-pwa from Vite's `base`.
export function manifest(kit: Pick<KitSettings, 'name' | 'description'>): Partial<ManifestOptions> {
  return {
    name: kit.name,
    short_name: kit.name,
    description: kit.description,
    lang: 'tr',
    display: 'standalone',
    // The page's own paper colour, as the light <meta name="theme-color"> in index.html.
    theme_color: '#f7f5f0',
    background_color: '#f7f5f0',
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
