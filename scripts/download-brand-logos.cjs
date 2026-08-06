/**
 * Download brand logos + write public/garage/brands.json
 * Usage: node scripts/download-brand-logos.cjs
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "public", "forzaGarage.json");
const BRANDS_PATH = path.join(ROOT, "public", "garage", "brands.json");
const LOGO_DIR = path.join(ROOT, "public", "garage", "logos");
const LOGO_BASE = "https://pub-b1b0dda9cb0644008ffedffa8be50cbf.r2.dev/logos";
const LIST_URL = "https://forzagarage.com/cars/";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "TrackSpec-Import/1.0 (personal)" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} → HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "TrackSpec-Import/1.0 (personal)" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`${url} → HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function scrapeMakeLogoMap(html) {
  const re = /data-make="([^"]+)"[^>]*>[\s\S]*?logos\/([A-Z0-9_]+)\.webp/g;
  const map = {};
  let m;
  while ((m = re.exec(html))) map[m[1]] = m[2];
  return map;
}

async function main() {
  console.log("Fetching make → logo map…");
  const html = await fetchText(LIST_URL);
  const byMake = scrapeMakeLogoMap(html);

  const garage = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  for (const car of garage.cars ?? []) {
    if (byMake[car.make]) car.logoCode = byMake[car.make];
  }

  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const codes = [...new Set(Object.values(byMake))];
  console.log(`Downloading ${codes.length} brand logos…`);

  let ok = 0;
  for (const code of codes) {
    const dest = path.join(LOGO_DIR, `${code}.webp`);
    try {
      const buf = await fetchBuffer(`${LOGO_BASE}/${code}.webp`);
      fs.writeFileSync(dest, buf);
      ok++;
    } catch (e) {
      console.warn(`  miss ${code}: ${e.message}`);
    }
  }

  const brands = Object.entries(byMake)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([make, code]) => ({ make, code }));

  const payload = {
    version: 1,
    downloadedAt: new Date().toISOString(),
    count: brands.length,
    byMake,
    brands,
  };

  fs.writeFileSync(BRANDS_PATH, JSON.stringify(payload));
  fs.writeFileSync(JSON_PATH, JSON.stringify(garage));

  console.log(`Done — ${ok} logos, ${brands.length} brands`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
