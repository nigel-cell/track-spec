/**
 * Every garage car has bundled Race, Touge, Drag, and Rally builds.
 * Usage: node scripts/check-starter-tunes.cjs
 */
const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const MODES = ["Race", "Touge", "Drag", "Rally"];
const root = path.join(__dirname, "..");
const garage = JSON.parse(fs.readFileSync(path.join(root, "public/forzaGarage.json"), "utf8"));
const file = JSON.parse(fs.readFileSync(path.join(root, "public/starterTunes.json"), "utf8"));
const slugs = (garage.cars ?? []).map((c) => c.slug).filter(Boolean);

if (file.tunes.length !== slugs.length * MODES.length) {
  fail(`starter count ${file.tunes.length} != garage ${slugs.length} × ${MODES.length}`);
}

const bySlug = new Map();
for (const tune of file.tunes) {
  const list = bySlug.get(tune.slug) ?? [];
  list.push(tune);
  bySlug.set(tune.slug, list);
}

let missingSprings = 0;

for (const slug of slugs) {
  const list = bySlug.get(slug);
  if (!list) fail(`missing starters for ${slug}`);
  if (list.length !== MODES.length) fail(`${slug} has ${list.length} starters`);
  const ids = list.map((t) => t.config.tuneId);
  for (const mode of MODES) {
    if (!ids.includes(mode)) fail(`${slug} missing ${mode}`);
  }
  for (const tune of list) {
    const c = tune.config;
    if (c.engineSwap !== "None (Stock)") fail(`${slug} ${c.tuneId} swap ${c.engineSwap}`);
    if (c.transPackage !== "race") fail(`${slug} ${c.tuneId} trans ${c.transPackage}`);
    if (!(c.springFrontMin > 0) || !(c.springFrontMax > c.springFrontMin)) missingSprings++;
  }
  const race = list.find((t) => t.config.tuneId === "Race");
  const touge = list.find((t) => t.config.tuneId === "Touge");
  const drag = list.find((t) => t.config.tuneId === "Drag");
  const rally = list.find((t) => t.config.tuneId === "Rally");
  if (race.config.tirePackage !== "semi") fail(`${slug} Race tires ${race.config.tirePackage}`);
  if (race.config.weightPackage !== "street") fail(`${slug} Race weight ${race.config.weightPackage}`);
  if (touge.config.tirePackage !== "semi") fail(`${slug} Touge tires ${touge.config.tirePackage}`);
  if (touge.config.surface !== "Road") fail(`${slug} Touge surface ${touge.config.surface}`);
  if (drag.config.tirePackage !== "drag") fail(`${slug} Drag tires ${drag.config.tirePackage}`);
  if (drag.config.compound !== "Drag") fail(`${slug} Drag compound ${drag.config.compound}`);
  if (drag.config.aeroPackage !== "none") fail(`${slug} Drag aero ${drag.config.aeroPackage}`);
  if (drag.config.weightPackage !== "sport") fail(`${slug} Drag weight ${drag.config.weightPackage}`);
  if (rally.config.tirePackage !== "rally") fail(`${slug} Rally tires ${rally.config.tirePackage}`);
  if (rally.config.compound !== "Rally") fail(`${slug} Rally compound ${rally.config.compound}`);
  if (rally.config.surface !== "Mixed") fail(`${slug} Rally surface ${rally.config.surface}`);
  if (rally.config.chassisPackage !== "braced") fail(`${slug} Rally chassis ${rally.config.chassisPackage}`);
}

if (missingSprings > slugs.length * MODES.length * 0.05) {
  fail(`too many cars missing spring limits: ${missingSprings}/${file.tunes.length}`);
}

const n600 = bySlug.get("honda-n600-1970");
if (!n600 || !n600.some((t) => t.config.tuneId === "Race" && t.config.driveType === "FWD")) {
  fail("N600 Race tune missing");
}

console.log(
  `check-starter-tunes: ok (${slugs.length} cars, ${file.tunes.length} tunes, ${missingSprings} without spring ends)`,
);
