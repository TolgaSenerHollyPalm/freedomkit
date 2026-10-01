import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { kitSettings, manifest } from './kit.config.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const kit = kitSettings(loadEnv(mode, process.cwd(), ''))
  return {
    // GitHub Pages serves the kit from the root of its own subdomain, e.g. https://book.kitshelf.app/
    base: '/',
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    // kitshelf-ui ships as TypeScript and CSS Modules, so Vite has to serve it as source rather than pre-bundle it.
    optimizeDeps: { exclude: ['kitshelf-ui'] },
    server: { port: kit.devPort, strictPort: true },
    preview: { port: kit.previewPort, strictPort: true },
    plugins: [
      react(),
      VitePWA({
        // Ask before switching to a new version, so the screen never reloads under someone's hands.
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: manifest(kit),
        // Workbox's default leaves fonts out; without them the offline app would fall back to system type.
        workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      }),
    ],
  }
})
