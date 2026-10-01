import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import UpdateToast from 'kitshelf-ui/app/UpdateToast.tsx'
import { KEYS } from '../kit.ts'

// An installed app can stay open for days, so look for a new version every hour while online.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000
// Coming back to the app checks too; this keeps app switching from asking the server every few seconds.
const MIN_TIME_BETWEEN_CHECKS_MS = 5 * 60 * 1000

// "Works offline now" is news once per device; after that it would only be noise.
function offlineReadyShownBefore(): boolean {
  try {
    return localStorage.getItem(KEYS.offlineReadyShown) === 'yes'
  } catch {
    return false // private window: nothing is remembered
  }
}

export default function UpdatePrompt() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registered) {
      if (!registered) return
      registration.current = registered

      let lastCheck = Date.now()
      const check = () => {
        if (!navigator.onLine || document.hidden || Date.now() - lastCheck < MIN_TIME_BETWEEN_CHECKS_MS) return
        lastCheck = Date.now()
        registered.update().catch(() => {
          // Server unreachable; the next check will try again.
        })
      }

      setInterval(check, UPDATE_CHECK_INTERVAL_MS)
      // An iPhone keeps a home screen app suspended instead of reloading it, and timers stop while it is away.
      // The moment it comes back is therefore the only dependable time to look for a new version.
      document.addEventListener('visibilitychange', check)
      window.addEventListener('online', check)
    },
  })

  const [shownBefore] = useState(offlineReadyShownBefore)
  const showOfflineReady = offlineReady && !shownBefore

  // Remembered as soon as it is on screen, so closing the app without tapping Tamam does not bring it back.
  useEffect(() => {
    if (!showOfflineReady) return
    try {
      localStorage.setItem(KEYS.offlineReadyShown, 'yes')
    } catch {
      // Nothing to remember it with; it may show again.
    }
  }, [showOfflineReady])

  if (!showOfflineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  // Normally the waiting version takes over this page, which then reloads. A page that was never under a service
  // worker's control (e.g. the very first visit) is not taken over, so reload it ourselves once the new one is active.
  const refresh = () => {
    const waiting = registration.current?.waiting
    if (!waiting) {
      location.reload()
      return
    }
    waiting.addEventListener('statechange', () => {
      if (waiting.state === 'activated') location.reload()
    })
    void updateServiceWorker(true)
  }

  return <UpdateToast needRefresh={needRefresh} onRefresh={refresh} onClose={close} />
}
