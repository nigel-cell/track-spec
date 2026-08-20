# AGENTS.md

## Cursor Cloud specific instructions

Track Spec is a mobile-first PWA (Vite + React) for Forza Horizon tuning plus a
Node relay (`server.js`) for live UDP telemetry. Standard commands live in
`package.json` `scripts` and `README.md`; only the non-obvious caveats are below.

### Services / how to run
- `npm run dev` — Vite dev server on `:5173`. The landing page is `/`; the actual
  app is served at **`/app`** (open `http://localhost:5173/app`, not `/`).
- `npm run dev:full` — runs Vite (`:5173`) **and** the relay `server.js` together.
  The relay opens an HTTP/WebSocket server on `:3000` and a Forza UDP listener on
  `:9999`. Use this when you need the Live telemetry tab.
- Non-obvious: `server.js` serves the **built `dist/`** folder, not live source. So
  the relay's own UI on `:3000` only reflects the app after `npm run build`. During
  development, load the app UI from Vite on `:5173/app` and use `:3000` only for the
  telemetry WebSocket. The Live tab has a "Test mock" button to preview telemetry
  without a real Forza feed / UDP data.

### Test / lint / build
- `npm test` — a suite of standalone Node check scripts (tune invariants, garage
  merge, desktop updater, starter tunes, build parts, gamedb fixture). There is no
  test framework and **no lint script / ESLint config** in this repo.
- `npm run build` (Vite build) — non-obvious gotcha: `vite-plugin-pwa` fails the
  build (Workbox) if any single precached asset exceeds
  `workbox.maximumFileSizeToCacheInBytes` in `vite.config.mts` (currently 3 MiB).
  Large generated JSON such as `public/starterTunes.json` can push past this and
  break `build`, `build:cloud`, `start`, and the desktop pack while dev mode still
  works (dev does not run the Workbox precache step). If a build fails only at the
  service-worker step, check that asset's size against that limit.
