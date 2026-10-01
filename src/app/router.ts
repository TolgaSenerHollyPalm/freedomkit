import { go, useHash } from 'kitshelf-ui/app/hashRouter.ts'

// Routes live in the URL hash, so GitHub Pages only ever serves index.html.
export type Route = { screen: 'home' } | { screen: 'settings' }

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/'
    case 'settings':
      return '#/settings'
  }
}

export function parseRoute(hash: string): Route {
  const [section] = hash.replace(/^#/, '').split('?')[0].split('/').filter(Boolean)
  if (section === 'settings') return { screen: 'settings' }
  return { screen: 'home' }
}

/** Goes to a route. `replace` swaps the current history entry, so the back button skips it. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  go(href(route), options)
}

export function useRoute(): Route {
  return parseRoute(useHash())
}
