/**
 * Download hero images from forzaGarage.json to public/garage/heros/
 * Usage: node scripts/download-garage-images.cjs [--force] [--concurrency=8]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "public", "forzaGarage.json");
const HERO_DIR = path.join(ROOT, "public", "garage", "heros");
const REMOTE_BASE = "https://pub-b1b0dda9cb0644008ffedffa8be50cbf.r2.dev/heros";

const args = process.argv.slice(2);
const force = args.includes("--force");
const concArg = args.find((a) => a.startsWith("--concurrency="));
const concurrency = concArg ? parseInt(concArg.split("=")[1], 10) : 8;

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

function remoteUrl(car) {
  if (car.image?.startsWith("http")) return car.image;
  if (car.heroCode) return `${REMOTE_BASE}/${car.heroCode}.webp`;
  return null;
}

function localPath(car) {
  const file = car.heroCode ? `${car.heroCode}.webp` : `${car.slug}.webp`;
  return `/garage/heros/${file}`;
}

function localFile(car) {
  return path.join(HERO_DIR, path.basename(localPath(car)));
}

async function downloadOne(car) {
  const dest = localFile(car);
  const url = remoteUrl(car);
  if (!url) {
    car.imageError = "no remote url";
    return "skip";
  }

  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    car.image = localPath(car);
    return "cached";
  }

  try {
    const buf = await fetchBuffer(url);
    fs.writeFileSync(dest, buf);
    car.image = localPath(car);
    return "ok";
  } catch (e) {
    car.imageError = String(e.message || e);
    return "fail";
  }
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Missing ${JSON_PATH} — run npm run import:garage first`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const cars = data.cars ?? [];
  fs.mkdirSync(HERO_DIR, { recursive: true });

  console.log(`Downloading ${cars.length} hero images → public/garage/heros/`);

  let idx = 0;
  let done = 0;
  const counts = { ok: 0, cached: 0, skip: 0, fail: 0 };

  async function worker() {
    while (idx < cars.length) {
      const i = idx++;
      const result = await downloadOne(cars[i]);
      counts[result]++;
      done++;
      if (done % 50 === 0 || done === cars.length) {
        console.log(`  ${done}/${cars.length} (${counts.ok} new, ${counts.cached} cached, ${counts.fail} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  data.imagesLocal = true;
  data.imagesDir = "/garage/heros";
  data.imagesDownloadedAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, JSON.stringify(data));

  const bytes = fs.readdirSync(HERO_DIR).reduce((s, f) => s + fs.statSync(path.join(HERO_DIR, f)).size, 0);
  console.log(`Done. ${(bytes / 1024 / 1024).toFixed(1)} MB on disk. Updated ${JSON_PATH}`);
}

module.exports = { downloadOne, localPath, remoteUrl, main };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
