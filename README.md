# kit-template

The starting point of a [KitShelf](https://kitshelf.app) kit: a free, account-free PWA that works offline and keeps its
data on the device. This is a GitHub template repository; **[YENI-KIT.md](YENI-KIT.md)** (in Turkish) walks through
making a new kit from it.

What a new kit starts with:

- **The skeleton TripKit runs on.** Vite, React and TypeScript; vite-plugin-pwa with the fonts in the service worker's
  precache; [kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui) for the theme, the components and the
  backups; a hash router; the update and connection notices; the light/dark setting with its script in `index.html`
  that picks the scheme before the first paint; the GitHub Pages workflow.
- **One place for each thing a kit decides.** Its id, name, description and local ports in `.env`; its colour in
  `src/kit.css`; its icon in `public/favicon.svg`. `index.html`, the web manifest, the storage keys, the database name
  and the backup file name all follow from those.
- **An example to replace.** A few notes (id, text, `updatedAt`) in IndexedDB with a home screen, an edit screen and a
  ready settings screen: Yedek, Görünüm, Bu cihazda, Verileri sil and the version. It is there to show a backup being
  saved and restored end to end; a new kit puts its own data in its place.

## Development

Requires Node 26 (see `.github/workflows/deploy.yml`).

```bash
npm install
npm run dev        # http://localhost:5174/
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ with the service worker at http://localhost:4174/
```

The ports come from `.env` and are strict: each kit has its own pair, because on a shared port the service worker
another kit left behind would open instead. The service worker only runs in the production build, so test offline
behaviour with `npm run build && npm run preview`.

## Where things are

| Path | What |
| --- | --- |
| `.env` | The kit's id, name, description and ports. `kit.config.ts` checks them and stops the build on a value that would break the app. |
| `src/kit.ts` | The same identity for the code, and `KEYS`: every localStorage key, all starting with the id. |
| `src/kit.css` | The kit colour: four tokens in both schemes, over kitshelf-ui's defaults. |
| `public/favicon.svg`, `scripts/generate-icons.sh` | The icon and the PNGs made from it (`npm run icons`, macOS only). |
| `src/app/` | `App` and the router, `AppDataProvider` (the data in memory, written back on every change), `UpdatePrompt` (the service worker's news). |
| `src/storage/` | `db.ts`: IndexedDB through `idb`, with a restore written in one transaction. `wipe.ts`: what "Tüm verileri sil" removes. |
| `src/backup/` | `kitBackup.ts`: the kit's backup adapter for kitshelf-ui and its words. `restorePlan.ts`: what merging or replacing writes. |
| `src/notes/`, `src/screens/` | The example data and its screens; `SettingsScreen.tsx` stays, with its counts changed. |
| `.github/workflows/deploy.yml` | Tests, builds and publishes on every push to `main`; skipped in this repository itself. |

## Checks

`npm test` holds a kit to what is easy to get wrong when starting one:

- `.env`: an id of lowercase letters and digits, a name ending in "Kit" (kitshelf-ui's Turkish messages add endings to
  it), a description that is safe inside an HTML attribute.
- `src/kit.css`: the four tokens in both schemes, and at least 4.5:1 wherever kitshelf-ui puts text on or in the kit
  colour.
- Icons: every file the manifest names, at its declared size.
- Storage keys: all prefixed with the kit's id and all removed by a wipe; the key and the page colours `index.html`
  uses before the first paint are the ones the app uses.

## Backups

The format, the checks and the screens are kitshelf-ui's (see its README). Here `useKitBackup()` describes the data,
`planRestore()` decides what a merge or a replace writes, and `restoreBackup()` in `src/storage/db.ts` writes it in one
IndexedDB transaction. Merging keeps the newer copy of a record by its `updatedAt`, which `AppDataProvider` stamps on
every save. A backup's `dataVersion` is the database version: raising it needs the same step in `upgrade()` and in
`migrateKit()`, or older backups stop opening.

## Deployment

In a repository made from this template, every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds
and publishes `dist/` to GitHub Pages. The one-time setup (Pages source, DNS, custom domain) is in
[YENI-KIT.md](YENI-KIT.md). The Vite `base` is `/` because a kit sits at the root of its own subdomain.
