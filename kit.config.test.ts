// What a new kit sets and these tests hold it to: the identity in .env, the colour in src/kit.css and the icons.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { kitSettings, manifest } from './kit.config.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const env = { VITE_KIT_ID: 'bookkit', VITE_KIT_NAME: 'BookKit', VITE_KIT_DESCRIPTION: 'Okuduğun kitaplar ve notların.' }

describe('kit settings from .env', () => {
  it('reads the identity and the ports', () => {
    expect(kitSettings({ ...env, DEV_PORT: '5175', PREVIEW_PORT: '4175' })).toEqual({
      id: 'bookkit',
      name: 'BookKit',
      description: 'Okuduğun kitaplar ve notların.',
      devPort: 5175,
      previewPort: 4175,
    })
    expect(kitSettings(env).devPort).toBeUndefined()
  })

  it.each([
    { VITE_KIT_ID: '' },
    { VITE_KIT_ID: 'Book Kit' },
    { VITE_KIT_ID: '2kit' },
    { VITE_KIT_NAME: 'Book' },
    { VITE_KIT_NAME: 'Book Kit' },
    { VITE_KIT_DESCRIPTION: ' ' },
    { VITE_KIT_DESCRIPTION: 'Kitap "notları"' },
    { DEV_PORT: 'dev' },
  ])('stops the build for %o', (wrong) => {
    expect(() => kitSettings({ ...env, ...wrong })).toThrow('.env')
  })
})

const DARK = ":root[data-scheme='dark']"
const sharedCss = read('./node_modules/kitshelf-ui/src/styles/tokens.css')
const kitCss = read('./src/kit.css')

/** The custom properties one rule sets, e.g. those of ':root'. */
function tokens(css: string, selector: string): Record<string, string> {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}')
  const rule = rules.find((block) => block.split('{')[0].trim() === selector) ?? ''
  return Object.fromEntries([...rule.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))
}

// As the browser cascades them: the shared dark list outranks a kit's light values, so a kit has to set both.
const schemes = {
  light: { ...tokens(sharedCss, ':root'), ...tokens(kitCss, ':root') },
  dark: { ...tokens(sharedCss, ':root'), ...tokens(kitCss, ':root'), ...tokens(sharedCss, DARK), ...tokens(kitCss, DARK) },
}

function color(scheme: keyof typeof schemes, name: string): string {
  let value = schemes[scheme][name]
  while (value?.startsWith('var(')) value = schemes[scheme][value.slice(4, -1).trim()]
  return value
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG contrast ratio of two colours, from 1 to 21. */
function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

// [text, what it is written on]: every place kitshelf-ui puts text on, or in, the kit colour.
const TEXT_PAIRS = [
  ['--color-on-primary', '--color-primary'], // the main button
  ['--color-primary-dark', '--color-surface'], // a quiet button on a card
  ['--color-primary-dark', '--color-bg'], // a link on the page
  ['--color-primary-dark', '--color-primary-soft'], // a chosen option, a tile
  ['--color-primary-dark', '--color-amber-soft'], // the link on the backup reminder
]

describe('kit colour in src/kit.css', () => {
  it('is set in both schemes, as six-digit hex', () => {
    for (const selector of [':root', DARK]) {
      const own = tokens(kitCss, selector)
      for (const name of ['--color-primary', '--color-primary-dark', '--color-primary-soft', '--color-on-primary']) {
        expect(own[name] ?? 'missing', `${name} in ${selector}`).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  describe.each(['light', 'dark'] as const)('in the %s scheme', (scheme) => {
    it.each(TEXT_PAIRS)('%s on %s reads at 4.5:1 or better', (text, background) => {
      expect(contrast(color(scheme, text), color(scheme, background))).toBeGreaterThanOrEqual(4.5)
    })
  })
})

// Width and height are the first two fields of a PNG's IHDR chunk.
function pngSize(file: string) {
  const png = readFileSync(new URL(`./public/${file}`, import.meta.url))
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

describe('web app manifest', () => {
  const made = manifest(kitSettings(env))
  const icons = made.icons ?? []

  it('carries the kit name and description', () => {
    expect(made).toMatchObject({ name: 'BookKit', short_name: 'BookKit', description: env.VITE_KIT_DESCRIPTION })
  })

  // The splash screen and the browser's bars take the page's own paper colour, in index.html as in the manifest.
  it('uses kitshelf-ui’s page colours, as index.html does', () => {
    const html = read('./index.html')
    const meta = (scheme: string) => html.match(new RegExp(`name="theme-color" content="([^"]+)" media="\\(prefers-color-scheme: ${scheme}\\)"`))?.[1]
    expect([made.theme_color, made.background_color, meta('light')]).toEqual(Array(3).fill(color('light', '--color-bg')))
    expect(meta('dark')).toBe(color('dark', '--color-bg'))
  })

  it('points every icon at a file in public/ with the declared size', () => {
    for (const icon of icons) {
      const [width, height] = (icon.sizes ?? '').split('x').map(Number)
      expect(pngSize(icon.src), icon.src).toEqual({ width, height })
    }
    expect(pngSize('apple-touch-icon-180x180.png')).toEqual({ width: 180, height: 180 })
  })

  // Chrome offers "Install app" only with 192px and 512px icons; Android launchers use the maskable one.
  it('has the icons Android needs to install the app', () => {
    expect(icons.some((i) => i.sizes === '192x192' && i.purpose === 'any')).toBe(true)
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'any')).toBe(true)
    expect(icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true)
  })
})
