# Grand Minaro — Meta Ads Intelligence Dashboard

A dark-premium, single-page analytics dashboard for Grand Minaro Resort's Meta (Facebook &
Instagram) advertising. It reads **live data from a published Google Sheet** at runtime and
falls back to a baked snapshot (`gm-data.js`) if the sheet is unreachable.

## Stack
Static site — no build step. `index.html` + React (UMD CDN) + in-browser Babel for the
`*.jsx` modules + `gm-source.js` (fetches the Google Sheet via the CORS-enabled gviz endpoint).

## Run locally
It must be served over HTTP (the `.jsx` loading and the cross-origin sheet fetch don't work
from `file://`):

```bash
npx serve .
# then open the printed http://localhost:PORT
```

## Deploy (Vercel)
This repo is a zero-config static site (`vercel.json` sets `framework: null`, no build).
Import it at https://vercel.com/new — Vercel serves the folder as-is.

## Files
- `index.html` — shell + full CSS design system
- `gm-app.jsx` — header, hero, period filter, KPI cards, layout, live-sync wiring
- `gm-charts.jsx` / `gm-insights.jsx` / `gm-table.jsx` / `gm-core.jsx` — components
- `gm-source.js` — live Google Sheets fetch + CSV parsing
- `gm-data.js` — baked offline fallback snapshot
- `assets/` — brand monogram + lockup

## Data
Currency LKR. Conversions = WhatsApp/Messenger chats started. No purchase pixel → no ROAS.
