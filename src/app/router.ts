import { go, useHash } from 'kitshelf-ui/app/hashRouter.ts'

// Routes live in the URL hash, so GitHub Pages only ever serves index.html.
export type Route = { screen: 'home' } | { screen: 'settings' } | { screen: 'note-new' } | { screen: 'note'; noteId: string }

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/'
    case 'settings':
      return '#/settings'
    case 'note-new':
      return '#/notes/new'
    case 'note':
      return `#/note/${encodeURIComponent(route.noteId)}`
  }
}

export function parseRoute(hash: string): Route {
  let parts: string[]
  try {
    parts = hash.replace(/^#/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return { screen: 'home' }
  }
  const [section, id] = parts
  if (section === 'settings') return { screen: 'settings' }
  if (section === 'notes' && id === 'new') return { screen: 'note-new' }
  if (section === 'note' && id) return { screen: 'note', noteId: id }
  return { screen: 'home' }
}

/** Goes to a route. `replace` swaps the current history entry, so the back button skips it. */
export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  go(href(route), options)
}

export function useRoute(): Route {
  return parseRoute(useHash())
}
