import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'kitshelf-ui/styles/fonts.css'
import 'kitshelf-ui/styles/tokens.css'
import 'kitshelf-ui/styles/base.css'
// After tokens.css, whose default kit colour it replaces.
import './kit.css'
import { watchAppearance } from 'kitshelf-ui/app/appearance.ts'
import App from './app/App.tsx'
import { KEYS, PAGE_COLORS } from './kit.ts'

watchAppearance({ key: KEYS.appearance, themeColors: PAGE_COLORS })
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
