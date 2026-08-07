# Track Spec



A mobile-first **PWA** for Forza Horizon tuning and live telemetry. Forked from [TuneLab](https://github.com/super-android/tunelab).



## Features



- **Tune tab** — Full FH6 tuning calculator (offline, works on iPhone)

- **Live tab** — Real-time telemetry: speed, RPM, gears, tire temps/slip, G-forces, understeer/oversteer

- **Garage tab** — FH6 car browser: autoshow cost, rarity, PI, mastery perks, collection tracker, hero photos

- **Setup tab** — Step-by-step connection guide for PC and Xbox

- **PWA** — Install on iPhone via Safari → Share → Add to Home Screen



## How to run (pick one)



| What you want | How |
|---------------|-----|
| **Phone Tune + Garage** | Cloudflare URL (light pack — thumbs, no 50MB heros) |
| **Live telemetry while racing** | Desktop **TrackSpec-Live.exe** or `START.bat` on the gaming PC |
| **Dev UI only** | `npm run dev` → `http://localhost:5173` |



### Phone (Cloudflare)



```bash

npm run deploy:cf

```



Needs Wrangler login / API token. Install the `*.workers.dev` (or Pages) URL to Home Screen.



### Live on PC (easiest)



```bash

npm run desktop:pack

```



Creates `release/TrackSpec-Live.exe`. Double-click it — UI + UDP relay start together. In Forza: Data Out → this PC → port **9999**.



Or without packaging:



```bash

npm run desktop

```



### Dev (no pack)



```bash

npm install

npm run dev

```



Open `http://localhost:5173`. Tap **Test mock** on the Live tab to preview telemetry.



### Refresh FH6 garage data (forzagarage.com)



```bash

npm run import:garage

```



Writes `public/forzaGarage.json` and downloads hero images to `public/garage/heros/` (~50 MB). Rebuild/restart the server after importing.



To re-download images only (without re-scraping):



```bash

npm run import:garage:images

```



### Tuning + live telemetry



```bash

npm install

npm run start

```



Or double-click **START.bat** on Windows.



This starts Track Spec's own relay:

- **PWA** on port **3000** (iPhone / desktop browser)

- **UDP listener** on port **9999** (Forza Data Out)

- **WebSocket** broadcast on port **3000** (Live tab)



Open `http://YOUR-PC-IP:3000` on iPhone, then Add to Home Screen.



### Development



```bash

npm run dev:full   # Vite :5173 + relay :3000

```



During dev, point the Live tab at your PC IP — the relay still runs on **3000**.



## Forza game settings



Options → HUD and Gameplay → bottom of page:



| Setting | PC (same machine) | Xbox |

|---|---|---|

| Data Out | ON | ON |

| Data Out IP | `127.0.0.1` | Your PC's local IP |

| Data Out Port | `9999` | `9999` |



On iPhone, open the **Live** tab and enter your PC's IP (e.g. `192.168.1.15`).



## Roadmap (telemetry)



Built in-house, no third-party dependencies:



- [x] Live dashboard (speed, RPM, tires, G-force, inputs)

- [x] Tire slip + understeer/oversteer detection

- [x] Lap timer + session-best delta (elapsed-time)
- [x] Live track map
- [x] Distance-aligned live delta (vs session best at same track distance)
- [x] Session recording + lap comparison
- [x] Live understeer/oversteer → Fine Tune



## Roadmap (tuning)



- [x] `calcTune()` physics engine (ported from TuneLab)
- [x] Live results from config + feel sliders (balance / aggression)
- [x] Car database search (`cars.json`, 644 cars)
- [x] Full Fine Tune phase fixes (`PHASE_FIXES` from legacy TuneTab)
- [x] Share / Save tune presets
- [x] Quick Tune + Manual setup from Garage & Live
- [x] Engine swaps, aspiration, input device (Manual tune)
- [x] Build profiles per car (local)
- [x] Tune library export/import + compare
- [x] Metric / Imperial tuning units
- [x] AI enhance — in-app API (Gemini, Grok, OpenAI, Claude) + copy prompt fallback
- [x] Car name lookup by telemetry ordinal
- [x] FH6 Garage tab — 622 cars, costs, mastery, photos (imported from forzagarage.com)



## Credits



- Tuning engine: [TuneLab](https://github.com/super-android/tunelab) (MIT)


