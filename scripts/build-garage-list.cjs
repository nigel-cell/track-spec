/**
 * Build a slim garage index for fast mobile list rendering.
 * Strips mastery / tuneSpecs / description (~90% of payload).
 * Adds thumb paths when public/garage/thumbs/<file> exists.
 *
 * Usage: node scripts/build-garage-list.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FULL = path.join(ROOT, "public", "forzaGarage.json");
const OUT = path.join(ROOT, "public", "forzaGarage-list.json");
const THUMB_DIR = path.join(ROOT, "public", "garage", "thumbs");

const KEEP = [
  "slug",
  "url",
  "year",
  "make",
  "model",
  "name",
  "cost",
  "rarity",
  "class",
  "pi",
  "drive",
  "powerHp",
  "topSpeedMph",
  "weightLbs",
  "heroCode",
  "logoCode",
  "image",
  "stats",
];

const full = JSON.parse(fs.readFileSync(FULL, "utf8"));
const assetBase = (full.assetBase || "").replace(/\/$/, "");
let withThumb = 0;

const cars = (full.cars || []).map((car) => {
  const slim = {};
  for (const key of KEEP) {
    if (car[key] !== undefined) slim[key] = car[key];
  }

  // Prefer local thumb for grid; keep full image for detail / desktop.
  const heroFile = car.image && String(car.image).split("/").pop();
  if (heroFile && fs.existsSync(path.join(THUMB_DIR, heroFile))) {
    slim.thumb = `/garage/thumbs/${heroFile}`;
    withThumb++;
  }

  // Remote full hero for Cloudflare cloud builds (no local /garage/heros).
  if (heroFile && assetBase) {
    slim.imageRemote = `${assetBase}/heros/${heroFile}`;
  }

  return slim;
});

const out = {
  version: full.version ?? 1,
  importedAt: full.importedAt ?? new Date().toISOString(),
  source: full.source ?? "https://forzagarage.com/",
  assetBase: full.assetBase ?? "",
  count: cars.length,
  cars,
};

fs.writeFileSync(OUT, JSON.stringify(out));
const fullKb = (fs.statSync(FULL).size / 1024).toFixed(0);
const listKb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Wrote ${OUT}`);
console.log(`  cars: ${cars.length} (${withThumb} with thumbs)`);
console.log(`  full: ${fullKb} KB → list: ${listKb} KB`);
