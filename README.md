# Vinyl Spec = KFPS 3.1.7 (exact)

This repo is a **pinned copy of [Kloudy's Forza Painter Suite v3.1.7](https://github.com/heyitshestia/kloudys-forza-painter-suite/releases/tag/v3.1.7)**.

It is **not** Track Spec. It is meant to run like upstream KFPS 3.1.7.

## Fastest way (exact official app)

Download the official bundled release (includes Python):

https://github.com/heyitshestia/kloudys-forza-painter-suite/releases/download/v3.1.7/KFPS-3.1.7-bundled.zip

Or double-click **`GET_BUNDLED.bat`** in this folder.

Unzip → open the folder → double-click **`KFPS.exe`**.

## From this source tree

1. Double-click **`START.bat`** (launches `KFPS.exe`)
2. Or run `KFPS.exe` directly

Source checkout does **not** include the bundled `python/` runtime from the release zip. If the native app cannot find Python:

- Use the **bundled** zip above (recommended), or
- Install 64-bit Python 3.12 and:

```bat
py -3.12 -m pip install -r requirements.txt
```

## Version

Pinned to upstream tag **`v3.1.7`** (`VERSION` file = `3.1.7`).

Upstream: https://github.com/heyitshestia/kloudys-forza-painter-suite  
Release notes: https://github.com/heyitshestia/kloudys-forza-painter-suite/releases/tag/v3.1.7

## Credits / license

All KFPS / forza-painter / geometrize / Fabric licenses in this tree apply. Vinyl Spec here is only packaging/launch convenience for a separate app next to Track Spec.
