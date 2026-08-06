/**
 * Download perk icons (+ SP icons) referenced in forzaGarage.json
 * Usage: node scripts/download-perk-icons.cjs
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const JSON_PATH = path.join(__dirname, "..", "public", "forzaGarage.json");
const PERK_DIR = path.join(__dirname, "..", "public", "garage", "perk-icons");
const ICON_DIR = path.join(__dirname, "..", "public", "garage", "icons");
const FG = "https://forzagarage.com";

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

async function downloadFile(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return "cached";
  const buf = await fetchBuffer(url);
  fs.writeFileSync(dest, buf);
  return "ok";
}

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const icons = new Set();

  for (const car of data.cars ?? []) {
    if (!car.mastery?.perks) continue;
    for (const p of Object.values(car.mastery.perks)) {
      if (p.icon) icons.add(p.icon);
    }
  }

  fs.mkdirSync(PERK_DIR, { recursive: true });
  fs.mkdirSync(ICON_DIR, { recursive: true });

  console.log(`Downloading ${icons.size} perk icons…`);
  let n = 0;
  for (const icon of icons) {
    const dest = path.join(PERK_DIR, `${icon}.webp`);
    try {
      await downloadFile(`${FG}/perk-icons/${icon}.webp`, dest);
      n++;
      if (n % 30 === 0) console.log(`  ${n}/${icons.size}`);
    } catch (e) {
      console.warn(`  miss ${icon}: ${e.message}`);
    }
  }

  for (const sp of ["sp-gold.webp", "sp-white.webp"]) {
    await downloadFile(`${FG}/icons/${sp}`, path.join(ICON_DIR, sp));
  }

  data.perkIconsLocal = true;
  data.perkIconsDir = "/garage/perk-icons";
  fs.writeFileSync(JSON_PATH, JSON.stringify(data));
  console.log(`Done — ${n} perk icons in public/garage/perk-icons/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
