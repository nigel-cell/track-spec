/**
 * Series 4 bundled Race tunes exist with a Race build.
 * Usage: node scripts/check-starter-tunes.cjs
 */
const fs = require("fs");
const path = require("path");

const SLUGS = [
  "honda-n600-1970",
  "exomotive-exocet-sport-v8-xp-5-2018",
  "chevrolet-camaro-zl1-2024",
  "toyota-celica-gt-1974",
  "mitsubishi-starion-esi-r-1988",
  "porsche-203-porsche-ag-961-1987",
  "ford-thunderbird-1957",
  "alfa-romeo-autodelta-tipo-33-2-daytona-1968",
  "nissan-skyline-2000-turbo-rs-1983",
];

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const file = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "starterTunes.json"), "utf8"));
if (file.tunes.length !== SLUGS.length) fail(`starter count ${file.tunes.length} != ${SLUGS.length}`);

for (const slug of SLUGS) {
  const tune = file.tunes.find((t) => t.slug === slug);
  if (!tune) fail(`missing starter for ${slug}`);
  const c = tune.config;
  if (c.tuneId !== "Race") fail(`${slug} tuneId ${c.tuneId}`);
  if (c.transPackage !== "race") fail(`${slug} trans ${c.transPackage}`);
  if (c.tirePackage !== "semi") fail(`${slug} tires ${c.tirePackage}`);
  if (c.engineSwap !== "None (Stock)") fail(`${slug} swap ${c.engineSwap}`);
  if (c.weightPackage !== "street") fail(`${slug} weight ${c.weightPackage}`);
  if (!(c.springFrontMin > 0) || !(c.springFrontMax > c.springFrontMin)) {
    fail(`${slug} missing spring limits`);
  }
}

console.log("check-starter-tunes: ok");
