import { describe, expect, it } from 'vitest'
import { href, parseRoute, type Route } from './router.ts'

describe('routes', () => {
  it.each<Route>([{ screen: 'home' }, { screen: 'settings' }])('survive a round trip through the URL: %o', (route) => {
    expect(parseRoute(href(route))).toEqual(route)
  })

  it('falls back to the home screen for unknown addresses', () => {
    expect(parseRoute('')).toEqual({ screen: 'home' })
    expect(parseRoute('#/nowhere')).toEqual({ screen: 'home' })
  })
})
