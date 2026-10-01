# FreedomKit

How long your savings would carry you: their value in Turkish lira today, divided by what a month costs you, shown
as "3 ay 24 gün özgürsün". One of the [KitShelf](https://kitshelf.app) kits: free, no account, works offline, and the
data stays on the device, backed up as a file. It will live at `https://freedom.kitshelf.app`; it is not published
yet. FreedomKit gives no investment advice.

Built from [kit-template](https://github.com/TolgaSenerHollyPalm/kit-template) on
[kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui), which brings the theme, the components and the
backups. The designs are in `docs/design/freedomkit/`; the plan it is built from is `docs/plans/04-freedomkit/PLAN.md`
in the quiz-trip repository.

## Development

Requires Node 26 (see `.github/workflows/deploy.yml`).

```bash
npm install
npm run dev        # http://localhost:5176/
npm test           # unit tests (Vitest)
npm run lint       # oxlint
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ with the service worker at http://localhost:4176/
```

The ports come from `.env` and are FreedomKit's own: on a port another kit has used, that kit's service worker would
open instead. The service worker only runs in the production build, so test offline behaviour with
`npm run build && npm run preview`.

## Where things are

| Path | What |
| --- | --- |
| `.env` | The kit's id, name, description and ports; `kit.config.ts` checks them and stops the build on a bad value. |
| `src/kit.ts` | The same identity for the code, and `KEYS`: every localStorage key, all starting with `freedomkit-`. |
| `src/kit.css` | FreedomKit's colour: four tokens in both schemes, over kitshelf-ui's defaults. |
| `public/favicon.svg`, `scripts/generate-icons.sh` | The icon and the PNGs made from it and from the maskable drawing in `docs/design/freedomkit/icons/`. |
| `src/app/`, `src/screens/` | The app shell, the router and the screens. |
| `.github/workflows/deploy.yml` | Tests, builds and publishes to GitHub Pages; started by hand until the release. |

## Icons

`public/favicon.svg` is the app icon and the mark on the home screen. After changing it, regenerate the PNGs (macOS
only, uses the built-in `sips`):

```bash
npm run icons -- docs/design/freedomkit/icons/freedomkit-maskable.svg
```
