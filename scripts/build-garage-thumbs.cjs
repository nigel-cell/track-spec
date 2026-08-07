/**
 * Build small WebP thumbs for mobile / Cloudflare garage grid.
 * Usage: node scripts/build-garage-thumbs.cjs
 */
const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp is required. Run: npm install -D sharp");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const HERO_DIR = path.join(ROOT, "public", "garage", "heros");
const OUT_DIR = path.join(ROOT, "public", "garage", "thumbs");

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(HERO_DIR).filter((f) => /\.webp$/i.test(f));
let done = 0;
let skipped = 0;

async function run() {
  console.log(`Building ${files.length} thumbs → public/garage/thumbs/`);
  for (const file of files) {
    const src = path.join(HERO_DIR, file);
    const dest = path.join(OUT_DIR, file);
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
      skipped++;
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${files.length}`);
      continue;
    }
    await sharp(src)
      .resize({ width: 360, height: 200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 58, effort: 4 })
      .toFile(dest);
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${files.length}`);
  }
  const sizeMb = (
    fs.readdirSync(OUT_DIR).reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0) / 1024 / 1024
  ).toFixed(1);
  console.log(`Done. ${files.length} thumbs (${skipped} cached). ~${sizeMb} MB on disk.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
