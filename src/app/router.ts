import { go, useHash } from 'kitshelf-ui/app/hashRouter.ts'

// Routes live in the URL hash, so GitHub Pages only ever serves index.html.
export type Route =
  | { screen: 'home' }
  | { screen: 'settings' }
  | { screen: 'add' }
  | { screen: 'goal' }
  | { screen: 'history' }
  | { screen: 'movement'; movementId: string }

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/'
    case 'movement':
      return `#/movement/${encodeURIComponent(route.movementId)}`
    default:
      return `#/${route.screen}`
  }
}

export function parseRoute(hash: string): Route {
  const [section, id] = hash.replace(/^#/, '').split('?')[0].split('/').filter(Boolean)
  switch (section) {
    case 'settings':
    case 'add':
    case 'goal':
    case 'history':
      return { screen: section }
    case 'movement':
      return id ? { screen: 'movement', movementId: decodeURIComponent(id) } : { screen: 'history' }
    default:
      return { screen: 'home' }
  }
}

/** Goes to a route. `replace` swaps the current history entry, so the back button skips it. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  go(href(route), options)
}

export function useRoute(): Route {
  return parseRoute(useHash())
}
