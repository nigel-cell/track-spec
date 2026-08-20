/**
 * Every garage car has a bundled Race build.
 * Usage: node scripts/check-starter-tunes.cjs
 */
const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const root = path.join(__dirname, "..");
const garage = JSON.parse(fs.readFileSync(path.join(root, "public/forzaGarage.json"), "utf8"));
const file = JSON.parse(fs.readFileSync(path.join(root, "public/starterTunes.json"), "utf8"));
const slugs = (garage.cars ?? []).map((c) => c.slug).filter(Boolean);

if (file.tunes.length !== slugs.length) {
  fail(`starter count ${file.tunes.length} != garage ${slugs.length}`);
}

const bySlug = new Map(file.tunes.map((t) => [t.slug, t]));
let missingSprings = 0;

for (const slug of slugs) {
  const tune = bySlug.get(slug);
  if (!tune) fail(`missing starter for ${slug}`);
  const c = tune.config;
  if (c.tuneId !== "Race") fail(`${slug} tuneId ${c.tuneId}`);
  if (c.transPackage !== "race") fail(`${slug} trans ${c.transPackage}`);
  if (c.tirePackage !== "semi") fail(`${slug} tires ${c.tirePackage}`);
  if (c.engineSwap !== "None (Stock)") fail(`${slug} swap ${c.engineSwap}`);
  if (c.weightPackage !== "street") fail(`${slug} weight ${c.weightPackage}`);
  if (!(c.springFrontMin > 0) || !(c.springFrontMax > c.springFrontMin)) missingSprings++;
}

if (missingSprings > slugs.length * 0.05) {
  fail(`too many cars missing spring limits: ${missingSprings}/${slugs.length}`);
}

const n600 = bySlug.get("honda-n600-1970");
if (!n600 || n600.config.driveType !== "FWD") fail("N600 Race tune missing");

console.log(`check-starter-tunes: ok (${file.tunes.length} cars, ${missingSprings} without spring ends)`);
