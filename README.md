# Grand Minaro — Meta Ads Intelligence Dashboard

A dark-premium, single-page analytics dashboard for Grand Minaro Resort's Meta (Facebook &
Instagram) advertising. It reads **live data from a published Google Sheet** at runtime,
caches the last successful sync in `localStorage` for instant repeat loads, and falls back
to a baked snapshot (`src/gm-data.js`) if the sheet is unreachable.

**Live:** https://grand-minaro-dashboard.vercel.app

## Stack
Vite + React 18 (production build). Data layer (`src/gm-source.js`) fetches the Google
Sheet via the CORS-enabled gviz CSV endpoint, auto-discovering months from the Monthly
Summary tab — new month tabs appear on the dashboard with no code change.

## Develop

```bash
npm install
npm run dev        # dev server on :3002
npm run build      # production bundle -> dist/
npm run preview    # serve the production bundle on :3002
```

## Refresh the offline fallback snapshot

```bash
npm run refresh-snapshot   # regenerates src/gm-data.js from the live sheet
```

## Deploy
Pushes to `main` auto-deploy via the Vercel Git integration (framework: Vite).
Security headers (CSP, HSTS, anti-clickjacking, etc.) are set in `vercel.json`.

## Files
- `index.html` — entry + meta/OG tags
- `src/App.jsx` — header, hero, period filter, KPI cards, layout, live-sync wiring
- `src/gm-charts.jsx` / `gm-insights.jsx` / `gm-table.jsx` / `gm-core.jsx` — components
- `src/gm-source.js` — live Google Sheets fetch, CSV parsing, localStorage cache
- `src/gm-data.js` — baked offline fallback snapshot (regenerable)
- `src/styles.css` — the full design system
- `public/` — favicons + social link-preview card
- `assets/` — brand monogram + lockup
- `scripts/refresh-snapshot.mjs` — snapshot regenerator

## Data
Currency LKR. Conversions = WhatsApp/Messenger chats started. No purchase pixel → no ROAS.
The current calendar month renders as a dashed **MTD** tail on the trajectory chart.
