# FreedomKit

How long your savings would carry you: their value in Turkish lira today, divided by what a month costs you, shown
as "3 ay 24 gün özgürsün". One of the [KitShelf](https://kitshelf.app) kits: free, no account, works offline, and the
data stays on the device, backed up as a file. It lives at [freedom.kitshelf.app](https://freedom.kitshelf.app).
FreedomKit gives no investment advice.

Built from [kit-template](https://github.com/TolgaSenerHollyPalm/kit-template) on
[kitshelf-ui](https://github.com/TolgaSenerHollyPalm/kitshelf-ui), which brings the theme, the components and the
backups. The designs are in `docs/design/freedomkit/`; the plan it is built from is `docs/plans/04-freedomkit/PLAN.md`
in the quiz-trip repository.

## Development

Requires Node 26 (see `.github/workflows/deploy.yml`).

```bash
npm install
npm run dev        # http://localhost:5176/
npm test           # unit tests (Vitest), no network
npm run lint       # oxlint
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ with the service worker at http://localhost:4176/
```

The ports come from `.env` and are FreedomKit's own: on a port another kit has used, that kit's service worker would
open instead. The service worker only runs in the production build, so test offline behaviour with
`npm run build && npm run preview`.

## Savings and the month

A saving is a list of movements: lira, dollars, euros, gram gold and four gold coins (çeyrek, yarım, tam,
Cumhuriyet), each in or out on a day, with amounts kept as whole hundredths of their unit. A coin is worth its fine
gold only, its weight × 22/24 at the gram price, so the app shows coins as "≈"; a jeweller's price differs. A month
is the monthly expense the user typed, or, for those who do not know it, the value of one tam altın today.
Durations count 30-day months and round to whole days. Adding, editing or deleting a movement is refused when it
would take a kind below zero on some day, lower than it already was there; a negative left by merging two devices'
backups stays, and the home screen points to it. `src/money/` holds every rule, with the plan's fixed prices in its
tests.

## Prices

`src/prices/service.ts` asks the free, keyless [exchange-api](https://github.com/fawazahmed0/exchange-api) for what a
lira buys in dollars, euros and gold, from two mirrors at once (jsDelivr and Cloudflare Pages), and keeps the newer
answer. A rate that moved more than half within a week is refused as a fault. Today's prices are asked for when the
app opens with prices older than six hours, and when the connection returns while they are still that old or the
last try failed; each address is given up after ten seconds. The history chart needs month ends: those are fetched one at a time from the dated addresses, up to three
days back when a day has no answer, and stored, so they are not fetched again. Only the asking travels; amounts never
leave the device. A price typed in by hand ("Elle gir") is used instead of the service's until it is taken back.

## Backups

`Ayarlar › Yedeği kaydet` writes `freedomkit-yedek-<date>.json` through kitshelf-ui's backup format: kit `freedomkit`,
data version 1, `data: { movements, settings, overrides }`. Price records stay out: today's are fetched again and the
month ends download again after a restore. Merging keeps the newer of each movement (`updatedAt`), of the settings
and of each price typed by hand (`setAt`), deletes nothing, and lets any backup's settings replace the ones the
welcome saved without a stamp; replacing takes all three from the file. The welcome's "Yedeğin var mı? Geri yükle"
opens the same restore, and restored settings skip the welcome. `src/backup/` holds the kit's side: the texts, the
checks a file has to pass, and the restore plan.

## Where things are

| Path | What |
| --- | --- |
| `.env` | The kit's id, name, description and ports; `kit.config.ts` checks them and stops the build on a bad value. |
| `src/kit.ts` | The same identity for the code, and `KEYS`: every localStorage key, all starting with `freedomkit-`. |
| `src/kit.css` | FreedomKit's colour: four tokens in both schemes, and the home card's fixed navy. |
| `public/favicon.svg`, `scripts/generate-icons.sh` | The icon and the PNGs made from it and from the maskable drawing in `docs/design/freedomkit/icons/`. |
| `src/money/` | Kinds, amounts, dates, holdings, the freedom card, the chart's series, the daily sentence and every text with a number. |
| `src/prices/` | The price service, with recorded answers for the tests. |
| `src/backup/` | The backup adapter, the restore plan and the restore flow the settings and the welcome share. |
| `src/storage/` | IndexedDB (`movements`, `prices`, `meta`) through `idb`, the migration steps, and what "Tüm verileri sil" removes. |
| `src/app/`, `src/screens/`, `src/ui/` | The app shell, the data and the router; the screens; the ring, the chart, the pickers and the count field. |
| `.github/workflows/deploy.yml` | Tests, builds and publishes to GitHub Pages on every push to `main`. |

## Publishing

A push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, the tests, the build and the upload to GitHub Pages.
The custom domain `freedom.kitshelf.app` is a CNAME to `tolgasenerhollypalm.github.io` in Cloudflare, DNS only, set
in the repository's Pages settings; no CNAME file is needed with an Actions deployment. Pages serves files with
`cache-control: max-age=600`, so a deploy can take up to ten minutes to show. Visits are counted by Cloudflare Web
Analytics, without cookies, with the snippet the other kits use.

## Icons

`public/favicon.svg` is the app icon and the mark on the home screen. After changing it, regenerate the PNGs (macOS
only, uses the built-in `sips`):

```bash
npm run icons -- docs/design/freedomkit/icons/freedomkit-maskable.svg
```
