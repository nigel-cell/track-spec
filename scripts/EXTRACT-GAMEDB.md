# Extract per-car spring / aero limits from GameDB

Track Spec can clamp spring (and aero) recommendations to **each car’s real in-game slider range**. Those ranges live in Forza’s **GameDB**, not on forzagarage.com or the UDP telemetry stream.

## What you need

1. A local Forza Horizon install (FH4 / FH5 / FH6) that includes:

   `media/Stripped/gamedbRC.slt`

   Typical Windows paths:

   - Xbox / MS Store: `C:\XboxGames\Forza Horizon 6\Content\media\Stripped\gamedbRC.slt`
   - Steam (varies): `...\steamapps\common\ForzaHorizon6\media\Stripped\gamedbRC.slt`

2. A **decrypted** copy of that file (plain SQLite). The shipping `gamedbRC.slt` is Arxan / TransformIT encrypted — Node cannot open it until decrypted.

3. Node.js 22+ (this repo uses `node:sqlite`).

Track Spec **does not ship decryption keys** and will not download decrypted GameDBs.

## Decrypt (user-side)

Community tools (keys are **not** in their public repos — obtain them yourself from the usual ForzaTech modding sources):

- [Doliman100/ForzaTech-crypto-tool](https://github.com/Doliman100/ForzaTech-crypto-tool) — GameDB decrypt / deobfuscate
- [Nenkai/ForzaTools](https://github.com/Nenkai/ForzaTools) — ForzaDecryptor reference

Example (paths/keys vary by title):

```bat
CryptoTool.exe -i "C:\XboxGames\Forza Horizon 6\Content\media\Stripped\gamedbRC.slt" -o "gamedbRC_decrypted.slt"
```

Verify the output starts with the SQLite magic header `SQLite format 3`. If it does not, decryption failed.

Optional helper (Windows): `scripts/find-gamedb.ps1` locates candidate installs and checks the magic header.

## Extract

```bash
# Inspect discovered spring / ride / aero columns
node scripts/extract-gamedb-slider-limits.cjs --db gamedbRC_decrypted.slt --dump-schema

# Write measured limits (merges over estimated defaults when --merge is set)
node scripts/extract-gamedb-slider-limits.cjs --db gamedbRC_decrypted.slt --out public/carSliderLimits.json --merge

# Prefer Race-tier upgrade rows (default)
node scripts/extract-gamedb-slider-limits.cjs --db gamedbRC_decrypted.slt --level race
```

Or via npm:

```bash
npm run extract:gamedb -- --db path/to/gamedbRC_decrypted.slt --merge
```

### Flags

| Flag | Meaning |
|------|---------|
| `--db <path>` | Decrypted GameDB (required) |
| `--out <path>` | Output JSON (default `public/carSliderLimits.json`) |
| `--garage <path>` | `forzaGarage.json` for make/model/slug join |
| `--level stock\|sport\|race\|any` | Which upgrade tier to prefer (default `race`) |
| `--merge` | Keep estimated cars; overwrite with measured when found |
| `--dump-schema` | Print scored tables/columns and exit |

## Output shape

`public/carSliderLimits.json`:

```json
{
  "version": 2,
  "source": "extracted from decrypted Forza GameDB",
  "unitSprings": "lbs/in",
  "cars": {
    "toyota-gr-supra-2020": {
      "make": "Toyota",
      "model": "GR Supra",
      "source": "measured",
      "springs": { "frontMin": 280, "frontMax": 1450, "rearMin": 260, "rearMax": 1380, "unit": "lbs/in" },
      "aero": { "frontMin": 0, "frontMax": 45, "rearMin": 0, "rearMax": 80, "unit": "kg" }
    }
  }
}
```

Without a decrypted DB, ship the **estimated** file instead:

```bash
npm run build:slider-limits
```

The app loads `carSliderLimits.json` on car select, fills Specs → spring min/max, and shows each result as a **slider %**.

## Schema discovery

Forza table names drift between titles (`Data_Car`, upgrade spring lists, body aero caps, etc.). The extractor scores column names for `spring` / `ride` / `aero` + `min` / `max` + `front` / `rear` and picks Race-tier rows when a level column exists.

If your dump finds zero cars:

1. Re-run with `--dump-schema` and check which roles were mapped.
2. Open the SQLite file in DB Browser and confirm spring min/max columns exist.
3. Open an issue with the role list (table + column names only — not the full DB).

## Legal / ethics

- Only decrypt GameDB from **your** purchased install.
- Do not commit encryption keys or a full GameDB dump to this repo.
- Prefer committing the derived `carSliderLimits.json` (numeric ranges only).

## Smoke test (no game install)

```bash
node scripts/create-gamedb-fixture.cjs
node scripts/extract-gamedb-slider-limits.cjs --db scripts/fixtures/gamedb-sample.slt --out /tmp/limits-test.json
```
