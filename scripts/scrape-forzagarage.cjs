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
  console.log("Fetching car list…");
  const html = await fetchText(LIST_URL);
  const cars = parseListPage(html);
  console.log(`Parsed ${cars.length} cars from list page`);

  if (withDetails) {
    console.log("Fetching detail pages (mastery + specs)…");
    await enrichDetails(cars);
  }

  const payload = {
    version: 1,
    importedAt: new Date().toISOString(),
    source: "https://forzagarage.com/",
    assetBase: ASSET_BASE,
    count: cars.length,
    cars,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(`Wrote ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);

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

module.exports = { parseListPage, parseDetailPage, parseFaceStats };
