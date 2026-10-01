import ConnectionNotice from 'kitshelf-ui/app/ConnectionNotice.tsx'
import toast from 'kitshelf-ui/app/toast.module.css'
import { ToastProvider, Toasts } from 'kitshelf-ui/ui/Toast.tsx'
import { useEffect } from 'react'
import { KIT_NAME } from '../kit.ts'
import HomeScreen from '../screens/HomeScreen.tsx'
import NoteScreen from '../screens/NoteScreen.tsx'
import SettingsScreen from '../screens/SettingsScreen.tsx'
import AppDataProvider from './AppDataProvider.tsx'
import { href, useRoute, type Route } from './router.ts'
import UpdatePrompt from './UpdatePrompt.tsx'

export default function App() {
  const route = useRoute()
  const address = href(route)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [address])

  return (
    <ToastProvider>
      <AppDataProvider>
        {/* Keyed by address so a screen starts fresh whenever the route changes. */}
        <CurrentScreen key={address} route={route} />
      </AppDataProvider>
      <div className={toast.stack}>
        <UpdatePrompt />
        <ConnectionNotice appName={KIT_NAME} />
        <Toasts />
      </div>
    </ToastProvider>
  )
}

function CurrentScreen({ route }: { route: Route }) {
  switch (route.screen) {
    case 'home':
      return <HomeScreen />
    case 'settings':
      return <SettingsScreen />
    case 'note-new':
      return <NoteScreen />
    case 'note':
      return <NoteScreen noteId={route.noteId} />
  }
}
