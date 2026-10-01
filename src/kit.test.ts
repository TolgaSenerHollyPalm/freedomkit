import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import { KEYS, KIT, PAGE_COLORS } from './kit.ts'
import { OWN_KEYS } from './storage/wipe.ts'

describe('storage keys', () => {
  it('all start with the kit id, and wiping the device removes every one', () => {
    for (const key of OWN_KEYS) expect(key.startsWith(`${KIT}-`), key).toBe(true)
    expect(OWN_KEYS).toEqual(expect.arrayContaining(Object.values(KEYS)))
  })
})

// The inline script in index.html runs before the app does; both have to agree on the key and the colours.
describe('what the page decides before its first paint', () => {
  it('reads the appearance key the app writes', () => {
    expect(html).toContain("localStorage.getItem('%VITE_KIT_ID%-appearance')")
    expect(KEYS.appearance).toBe(`${KIT}-appearance`)
  })

  it('uses the page colours the app uses', () => {
    const meta = (scheme: string) => html.match(new RegExp(`name="theme-color" content="([^"]+)" media="\\(prefers-color-scheme: ${scheme}\\)"`))?.[1]
    expect({ light: meta('light'), dark: meta('dark') }).toEqual(PAGE_COLORS)
    expect(html).toContain(`meta.content = dark ? '${PAGE_COLORS.dark}' : '${PAGE_COLORS.light}'`)
  })
})
