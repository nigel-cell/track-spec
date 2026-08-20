/**
 * One-time / refresh import from forzagarage.com (personal Track Spec use).
 * Usage: node scripts/scrape-forzagarage.cjs [--details] [--local-images] [--out public/forzaGarage.json]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ASSET_BASE = "https://pub-b1b0dda9cb0644008ffedffa8be50cbf.r2.dev";
const LIST_URL = "https://forzagarage.com/cars/";
const BASE = "https://forzagarage.com";

const args = process.argv.slice(2);
const withDetails = args.includes("--details");
const detailsAll = args.includes("--details-all");
const withMerge = args.includes("--merge");
const withLocalImages = args.includes("--local-images");
const outArg = args.find((a) => a.startsWith("--out="));
const outPath = outArg
  ? outArg.slice("--out=".length)
  : path.join(__dirname, "..", "public", "forzaGarage.json");

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

function parseFaceStats(chunk) {
  const stats = {};
  const re = /<span class="fk">(\w+)<\/span>\s*<span class="fv">([\d.]+)<\/span>/g;
  let m;
  while ((m = re.exec(chunk))) stats[m[1]] = parseFloat(m[2]);
  return stats;
}

function parseDataAttrs(chunk) {
  const attrs = {};
  const re = /data-([\w-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(chunk))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function parseListPage(html) {
  const re = /<div class="car-cell"([^>]*)>([\s\S]*?)<\/a>\s*<\/div>/g;
  const cars = [];
  let m;

  while ((m = re.exec(html))) {
    const chunk = m[2];
    const data = parseDataAttrs(`${m[1]} ${chunk}`);

    const href = chunk.match(/href="(\/cars\/[^"]+)"/);
    const cost = chunk.match(/<b>([\d,]+)<\/b>/);
    const hero = chunk.match(/heros\/([^"]+\.webp)/);
    const model = chunk.match(/<div class="car-name">([^<]*)<\/div>/);
    const yearLine = chunk.match(/<div class="car-year">(\d{4})\s*([^<]*)<\/div>/);

    if (!href || !model || !yearLine) continue;

    const slug = href[1].replace(/^\/cars\//, "").replace(/\/$/, "");
    const make = (data.make || yearLine[2]).trim();
    const year = data.year || yearLine[1];
    const modelName = model[1].trim();

    cars.push({
      slug,
      url: `${BASE}${href[1]}`,
      year,
      make,
      model: modelName,
      name: `${year} ${make} ${modelName}`,
      cost: cost ? parseInt(cost[1].replace(/,/g, ""), 10) : null,
      rarity: data.rarity ? capitalize(data.rarity) : null,
      class: data.class ? data.class.toUpperCase() : null,
      pi: data.pi ? parseInt(data.pi, 10) : null,
      drive: data.drive || null,
      powerHp: data.power ? parseInt(data.power, 10) : null,
      topSpeedMph: data.speed ? parseInt(data.speed, 10) : null,
      weightLbs: data.weight ? parseInt(data.weight, 10) : null,
      heroCode: hero ? hero[1].replace(".webp", "") : null,
      image: hero ? `${ASSET_BASE}/heros/${hero[1]}` : null,
      stats: parseFaceStats(chunk),
    });
  }

  return cars;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseDetailPage(html) {
  const out = {};

  const cm = html.match(/<script type="application\/json" id="cm-data">([\s\S]*?)<\/script>/);
  if (cm) {
    try {
      const mastery = JSON.parse(cm[1]);
      out.mastery = {
        totalCost: mastery.totCost ?? null,
        perkCount: mastery.perkN ?? null,
        cells: mastery.cells ?? [],
        perks: Object.fromEntries(
          Object.entries(mastery.perks ?? {}).map(([cellId, p]) => [
            cellId,
            {
              perkId: p.perkId,
              name: p.name,
              desc: p.desc,
              cost: p.cost,
              effect: p.effect,
              icon: p.icon ?? null,
              uses: p.uses ?? 0,
            },
          ]),
        ),
      };
    } catch {
      /* ignore */
    }
  }

  const ldScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of ldScripts) {
    try {
      const j = JSON.parse(raw);
      if (j["@type"] !== "Car") continue;
      out.description = j.description;
      out.topSpeedMph = j.speed?.value ?? null;
      out.weightLbs = j.weightTotal?.value ?? null;
      out.powerHp = j.vehicleEngine?.enginePower?.value ?? null;
      out.torqueLbFt = j.vehicleEngine?.torque?.value ?? null;
      out.displacementCc = j.vehicleEngine?.engineDisplacement?.value ?? null;
      out.driveConfig = j.driveWheelConfiguration ?? null;
      if (j.image) out.image = j.image;
    } catch {
      /* ignore */
    }
  }

  const media = html.match(/<dt[^>]*>Media name<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/);
  if (media) out.mediaName = media[1].trim();

  const faq = ldScripts.map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  }).find((j) => j && j["@type"] === "FAQPage");

  if (faq?.mainEntity) {
    for (const q of faq.mainEntity) {
      const text = q.acceptedAnswer?.text ?? "";
      if (/cost|price|autoshow/i.test(q.name ?? "")) {
        const n = text.match(/([\d,]+)\s*CR/);
        if (n) out.costNote = text;
      }
      if (/how to get|acquisition|unlock/i.test(q.name ?? "")) {
        out.acquisition = text;
      }
    }
  }

  return out;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const LIST_FIELDS = [
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
];

const DETAIL_FIELDS = [
  "description",
  "torqueLbFt",
  "displacementCc",
  "driveConfig",
  "costNote",
  "acquisition",
  "mediaName",
  "mastery",
];

function isLocalImage(image) {
  return typeof image === "string" && image.startsWith("/garage/");
}

function needsDetails(car) {
  if (!car) return true;
  const masteryOk = car.mastery && Array.isArray(car.mastery.cells) && car.mastery.cells.length > 0;
  const specsOk = car.tuneSpecs && (car.tuneSpecs.redlineRpm || car.tuneSpecs.tireFront);
  return !masteryOk || !specsOk;
}

/** Overlay a fresh list/detail scrape onto a previous garage record. */
function mergeCar(prev, scraped) {
  if (!prev) return scraped;
  const out = { ...prev };
  for (const key of LIST_FIELDS) {
    const next = scraped[key];
    if (next == null || next === "") continue;
    // List page uses 0 when speed/power/weight is unknown — don't treat 0 as data.
    if (
      typeof next === "number" &&
      next === 0 &&
      (key === "topSpeedMph" || key === "powerHp" || key === "weightLbs")
    ) {
      continue;
    }
    out[key] = next;
  }
  if (scraped.stats && Object.keys(scraped.stats).length) out.stats = scraped.stats;
  for (const key of DETAIL_FIELDS) {
    if (scraped[key] != null) out[key] = scraped[key];
  }
  if (isLocalImage(prev.image)) out.image = prev.image;
  else if (scraped.image) out.image = scraped.image;
  if (prev.logoCode && !out.logoCode) out.logoCode = prev.logoCode;
  if (prev.tuneSpecs && !scraped.tuneSpecs) out.tuneSpecs = prev.tuneSpecs;
  return out;
}

function mergeGarage(existing, scrapedCars) {
  const prevBySlug = new Map((existing?.cars ?? []).map((c) => [c.slug, c]));
  const merged = scrapedCars.map((scraped) => mergeCar(prevBySlug.get(scraped.slug), scraped));
  const added = merged.filter((c) => !prevBySlug.has(c.slug)).length;
  const dropped = (existing?.cars ?? []).filter((c) => !scrapedCars.some((s) => s.slug === c.slug));
  return { cars: merged, added, dropped: dropped.length, kept: merged.length - added };
}

async function enrichDetails(cars, concurrency = 6) {
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < cars.length) {
      const i = idx++;
      const car = cars[i];
      try {
        const html = await fetchText(car.url);
        Object.assign(car, parseDetailPage(html));
      } catch (e) {
        car.detailError = String(e.message || e);
      }
      done++;
      if (done % 50 === 0) console.log(`  detail ${done}/${cars.length}`);
      await sleep(120);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

async function main() {
  let existing = null;
  if (withMerge && fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    console.log(`Merge into existing garage (${existing.count ?? existing.cars?.length ?? 0} cars)`);
  }

  console.log("Fetching car list…");
  const html = await fetchText(LIST_URL);
  let cars = parseListPage(html);
  console.log(`Parsed ${cars.length} cars from list page`);

  if (withDetails || detailsAll) {
    const prevBySlug = new Map((existing?.cars ?? []).map((c) => [c.slug, c]));
    const targets = detailsAll
      ? cars
      : cars.filter((c) => needsDetails(prevBySlug.get(c.slug)));
    if (targets.length === 0) {
      console.log("Detail pages: all cars already have mastery + tuneSpecs — skip");
    } else {
      console.log(
        `Fetching detail pages for ${targets.length}/${cars.length} cars (${detailsAll ? "all" : "new/incomplete"})…`,
      );
      await enrichDetails(targets);
    }
  }

  let added = cars.filter((c) => !(existing?.cars ?? []).some((p) => p.slug === c.slug)).length;
  let dropped = 0;
  let kept = cars.length - added;
  if (withMerge && existing) {
    const merged = mergeGarage(existing, cars);
    cars = merged.cars;
    added = merged.added;
    dropped = merged.dropped;
    kept = merged.kept;
    console.log(`Merged: ${kept} updated, ${added} new, ${dropped} dropped`);
  }

  const payload = {
    version: existing?.version ?? 1,
    importedAt: new Date().toISOString(),
    source: "https://forzagarage.com/",
    assetBase: ASSET_BASE,
    count: cars.length,
    cars,
  };
  if (existing) {
    for (const key of [
      "imagesLocal",
      "imagesDir",
      "imagesDownloadedAt",
      "tuneSpecsPatchedAt",
      "masteryPatchedAt",
      "perkIconsLocal",
      "perkIconsDir",
    ]) {
      if (existing[key] != null) payload[key] = existing[key];
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(`Wrote ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB, ${cars.length} cars)`);

  if (withLocalImages) {
    const { main: downloadImages } = require("./download-garage-images.cjs");
    await downloadImages();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { parseListPage, parseDetailPage, parseFaceStats, mergeCar, mergeGarage, needsDetails };
