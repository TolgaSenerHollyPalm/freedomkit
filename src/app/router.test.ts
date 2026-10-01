import { describe, expect, it } from 'vitest'
import { href, parseRoute, type Route } from './router.ts'

describe('routes', () => {
  it.each<Route>([{ screen: 'home' }, { screen: 'settings' }, { screen: 'note-new' }, { screen: 'note', noteId: 'a1b2' }, { screen: 'note', noteId: 'ç/ş ?' }])(
    'survive a round trip through the URL: %o',
    (route) => {
      expect(parseRoute(href(route))).toEqual(route)
    },
  )

  it('falls back to the home screen for unknown or broken addresses', () => {
    expect(parseRoute('')).toEqual({ screen: 'home' })
    expect(parseRoute('#/nowhere')).toEqual({ screen: 'home' })
    expect(parseRoute('#/notes/olmayan')).toEqual({ screen: 'home' })
    expect(parseRoute('#/note')).toEqual({ screen: 'home' })
    expect(parseRoute('#/note/%E0%A4%A')).toEqual({ screen: 'home' })
  })
})
