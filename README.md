# Grand Minaro — Meta Ads Intelligence Dashboard

Version 2.2 adds a refined Apple-inspired light workspace, compact performance charts,
an explicit monthly chart readout, labeled exports, and keyboard/touch chart exploration.

A light, Apple-style single-page analytics dashboard for Grand Minaro Resort's Meta (Facebook &
Instagram) advertising. It reads **live data from a published Google Sheet** at runtime,
caches the last successful sync in `localStorage` for instant repeat loads, and falls back
to a baked snapshot (`src/gm-data.js`) if the sheet is unreachable.

**Live:** https://grand-minaro-dashboard.vercel.app

## Stack
Vite 8 + React 19 (production build). Data layer (`src/gm-source.js`) fetches the Google
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
- `src/App.jsx` — Mac-style section sidebar, toolbar, title + period picker, KPI tiles, layout, live-sync wiring
- `src/gm-charts.jsx` / `gm-highlights.jsx` / `gm-insights.jsx` / `gm-table.jsx` / `gm-core.jsx` — components
- `src/gm-source.js` — live Google Sheets fetch, CSV parsing, localStorage cache
- `src/gm-data.js` — baked offline fallback snapshot (regenerable)
- `src/styles.css` — the design system: Apple light-mode colour tokens, and Liquid Glass used
  only on floating controls (toolbar, menu, chart tooltip), with reduced-transparency,
  increased-contrast and reduced-motion fallbacks
- `public/` — favicons + social link-preview card
- `assets/` — brand monogram + lockup
- `scripts/refresh-snapshot.mjs` — snapshot regenerator

The workspace uses a white and soft-gray light appearance, native system typography,
blue action controls, and restrained gold brand accents. On phones the sidebar becomes
compact section navigation. Section links follow scrolling, a skip link supports keyboard
navigation, and printed reports omit workspace navigation. The interface stays light
regardless of the device's preferred color scheme.

## Data
Currency LKR. Conversions = WhatsApp/Messenger chats started. No purchase pixel → no ROAS.
The current calendar month renders as a dashed **MTD** tail on the trajectory chart.
