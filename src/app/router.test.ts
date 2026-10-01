import { describe, expect, it } from 'vitest'
import { href, parseRoute, type Route } from './router.ts'

describe('routes', () => {
  it.each<Route>([
    { screen: 'home' },
    { screen: 'settings' },
    { screen: 'add' },
    { screen: 'goal' },
    { screen: 'history' },
    { screen: 'movement', movementId: '1c3d-ab/9' },
  ])('survive a round trip through the URL: %o', (route) => {
    expect(parseRoute(href(route))).toEqual(route)
  })

  it('falls back to the home screen for unknown addresses', () => {
    expect(parseRoute('')).toEqual({ screen: 'home' })
    expect(parseRoute('#/nowhere')).toEqual({ screen: 'home' })
  })

  it('sends a movement address without an id to the history', () => {
    expect(parseRoute('#/movement')).toEqual({ screen: 'history' })
  })
})
