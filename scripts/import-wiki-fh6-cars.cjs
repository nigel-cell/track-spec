/**
 * Add FH6 cars that forzagarage.com does not list yet (Series 4, Car Pass, etc.)
 * from the Forza Wiki. Existing garage rows are left alone.
 *
 * Usage: node scripts/import-wiki-fh6-cars.cjs
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const GARAGE_PATH = path.join(ROOT, "public", "forzaGarage.json");
const HERO_DIR = path.join(ROOT, "public", "garage", "heros");
const LOGO_DIR = path.join(ROOT, "public", "garage", "logos");
const BRANDS_PATH = path.join(ROOT, "public", "garage", "brands.json");
const SWAPS_PATH = path.join(ROOT, "public", "forzaWikiSwaps.json");
const API = "https://forza.fandom.com/api.php";
const UA = "TrackSpec-Import/1.0 (personal)";

/** Series 4 cars missing from forzagarage.com (Horizon Mascot Party, Aug 2026). */
const SERIES4 = [
  {
    wiki: "Honda N600",
    slug: "honda-n600-1970",
    class: "D",
    heroCode: "HON_N600_70",
    logoCode: "HON",
    acquisition:
      "Festival Playlist Series 4 (Horizon Mascot Party) — 80 PTS series reward, Aug 13 – Sep 10.",
  },
  {
    wiki: "Exomotive Exocet Sport V8 XP-5",
    slug: "exomotive-exocet-sport-v8-xp-5-2018",
    class: "S2",
    heroCode: "EXO_ExocetSportV8_18",
    logoCode: null,
    acquisition: "Festival Playlist Series 4 — Summer, 20 PTS, Aug 13 – Aug 20.",
  },
  {
    wiki: "Chevrolet Camaro ZL1 (2024)",
    slug: "chevrolet-camaro-zl1-2024",
    class: "S1",
    heroCode: "CHE_CamaroZL1_24",
    logoCode: "CHE",
    acquisition: "Festival Playlist Series 4 — Autumn, 20 PTS, Aug 20 – Aug 27.",
  },
  {
    wiki: "Toyota Celica GT",
    slug: "toyota-celica-gt-1974",
    class: "D",
    heroCode: "TOY_CelicaGT_74",
    logoCode: "TOY",
    acquisition: "Festival Playlist Series 4 — Winter, 20 PTS, Aug 27 – Sep 3.",
  },
  {
    wiki: "Mitsubishi Starion ESI-R",
    slug: "mitsubishi-starion-esi-r-1988",
    class: "C",
    heroCode: "MIT_StarionESIR_88",
    logoCode: "MIT",
    acquisition: "Festival Playlist Series 4 — Spring, 20 PTS, Sep 3 – Sep 10.",
  },
  {
    wiki: "Porsche 203 Porsche AG 961",
    slug: "porsche-203-porsche-ag-961-1987",
    class: "S2",
    drive: "AWD",
    heroCode: "POR_203_961_87",
    logoCode: "POR",
    acquisition: "Forza Horizon 6 Car Pass — available Aug 13.",
  },
  {
    wiki: "Ford Thunderbird",
    slug: "ford-thunderbird-1957",
    class: "D",
    heroCode: "FOR_Thunderbird_57",
    logoCode: "FOR",
    powerHp: 289,
    torqueLbFt: 320,
    acquisition: "Forza Horizon 6 Car Pass — available Aug 20.",
  },
  {
    wiki: "Alfa Romeo Autodelta Tipo 33/2 Daytona",
    slug: "alfa-romeo-autodelta-tipo-33-2-daytona-1968",
    class: "A",
    heroCode: "ALF_Tipo332_68",
    logoCode: "ALF",
    powerHp: 269,
    torqueLbFt: 160,
    acquisition: "Forza Horizon 6 Car Pass — available Aug 27.",
  },
  {
    wiki: "Nissan Skyline 2000 Turbo RS",
    slug: "nissan-skyline-2000-turbo-rs-1983",
    class: "C",
    heroCode: "NIS_SkylineTurboRS_83",
    logoCode: "NIS",
    powerHp: 187,
    torqueLbFt: 166,
    acquisition: "Forza Horizon 6 Car Pass — available Sep 3.",
  },
];

/** Series 5 cars missing from forzagarage.com (British Automotive, Sep 2026). */
const SERIES5 = [
  {
    wiki: "Bentley Continental GT Speed (2025)",
    slug: "bentley-continental-gt-speed-2025",
    class: "A",
    pi: 699,
    drive: "AWD",
    heroCode: "BEN_ContinentalGTSpeed_25",
    logoCode: "BEN",
    powerHp: 771,
    torqueLbFt: 737,
    acquisition:
      "Festival Playlist Series 5 (British Automotive) — 80 PTS series reward, Sep 10 – Oct 8.",
  },
  {
    wiki: "Ginetta G40 Junior",
    slug: "ginetta-g40-junior-2019",
    class: "B",
    pi: 560,
    drive: "RWD",
    heroCode: "GIN_G40Junior_19",
    logoCode: "GIN",
    powerHp: 100,
    torqueLbFt: 103,
    acquisition: "Festival Playlist Series 5 — Summer, 20 PTS, Sep 10 – Sep 17.",
  },
  {
    wiki: "Jaguar XKR-S GT",
    slug: "jaguar-xkr-s-gt-2015",
    class: "A",
    pi: 671,
    drive: "RWD",
    heroCode: "JAG_XKRSGT_15",
    logoCode: "JAG",
    powerHp: 542,
    torqueLbFt: 501,
    acquisition: "Festival Playlist Series 5 — Autumn, 20 PTS, Sep 17 – Sep 24.",
  },
  {
    wiki: "Vauxhall Astra VXR (2006)",
    slug: "vauxhall-astra-vxr-2006",
    class: "B",
    pi: 512,
    drive: "FWD",
    heroCode: "VAU_AstraVXR_06",
    logoCode: "VAU",
    powerHp: 236,
    torqueLbFt: 236,
    acquisition: "Festival Playlist Series 5 — Winter, 20 PTS, Sep 24 – Oct 1.",
  },
  {
    wiki: "Lotus Esprit V8",
    slug: "lotus-esprit-v8-2002",
    class: "A",
    pi: 619,
    drive: "RWD",
    heroCode: "LOT_EspritV8_02",
    logoCode: "LOT",
    powerHp: 350,
    torqueLbFt: 295,
    acquisition: "Festival Playlist Series 5 — Spring, 20 PTS, Oct 1 – Oct 8.",
  },
  {
    wiki: "Jaguar XJ-S",
    slug: "jaguar-xj-s-1990",
    heroCode: "JAG_XJS_90",
    logoCode: "JAG",
    acquisition: "Autoshow — added with Series 5 (British Automotive).",
  },
  {
    wiki: "McLaren W1",
    slug: "mclaren-w1-2025",
    class: "R",
    pi: 918,
    drive: "RWD",
    heroCode: "MCL_W1_25",
    logoCode: "MCL",
    powerHp: 1258,
    torqueLbFt: 987,
    acquisition: "Forza Horizon 6 Car Pass — available Sep 10.",
  },
  {
    wiki: "Dodge Challenger SRT Demon 170",
    slug: "dodge-challenger-srt-demon-170-2023",
    class: "A",
    pi: 683,
    drive: "RWD",
    heroCode: "DOD_ChallengerSRTDemon170_23",
    logoCode: "DOD",
    powerHp: 1025,
    torqueLbFt: 945,
    acquisition: "Forza Horizon 6 Car Pass — available Sep 17.",
  },
  {
    wiki: "Renault Sport Spider",
    slug: "renault-sport-spider-1998",
    class: "B",
    pi: 508,
    drive: "RWD",
    heroCode: "REN_SportSpider_98",
    logoCode: "REN",
    powerHp: 145,
    torqueLbFt: 137,
    acquisition: "Forza Horizon 6 Car Pass — available Sep 24.",
  },
  {
    wiki: "Porsche 911 Carrera Coupe 'Luftauto 002'",
    slug: "porsche-911-carrera-coupe-luftauto-002-1987",
    class: "B",
    pi: 561,
    drive: "RWD",
    heroCode: "POR_911Luftauto002_87",
    logoCode: "POR",
    powerHp: 250,
    torqueLbFt: 232,
    acquisition: "Forza Horizon 6 Car Pass — available Oct 1.",
  },
];

const MAKE_NAMES = {
  honda: "Honda",
  chevrolet: "Chevrolet",
  exomotive: "Exomotive",
  toyota: "Toyota",
  mitsubishi: "Mitsubishi",
  porsche: "Porsche",
  ford: "Ford",
  alfa: "Alfa Romeo",
  nissan: "Nissan",
  bentley: "Bentley",
  ginetta: "Ginetta",
  jaguar: "Jaguar",
  vauxhall: "Vauxhall",
  lotus: "Lotus",
  mclaren: "McLaren",
  dodge: "Dodge",
  renault: "Renault",
};

const LAYOUT_DRIVE = {
  ff: "FWD",
  fr: "RWD",
  mr: "RWD",
  rr: "RWD",
  ra: "AWD",
  fa: "AWD",
  "4wd": "AWD",
  awd: "AWD",
};

const ASPIRATION = {
  na: "Naturally Aspirated",
  t: "Turbocharged",
  st: "Turbocharged",
  tt: "Twin Turbocharged",
  sc: "Positive Displacement Supercharged",
};

function fetchJson(url, attempt = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchJson(res.headers.location, attempt).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (attempt < 4) {
            setTimeout(() => fetchJson(url, attempt + 1).then(resolve, reject), 2 ** attempt * 500);
            return;
          }
          reject(new Error(`${url} → HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", (err) => {
        if (attempt < 4) {
          setTimeout(() => fetchJson(url, attempt + 1).then(resolve, reject), 2 ** attempt * 500);
          return;
        }
        reject(err);
      });
  });
}

function fetchBuffer(url, attempt = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchBuffer(res.headers.location, attempt).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (attempt < 4) {
            setTimeout(() => fetchBuffer(url, attempt + 1).then(resolve, reject), 2 ** attempt * 500);
            return;
          }
          reject(new Error(`${url} → HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", (err) => {
        if (attempt < 4) {
          setTimeout(() => fetchBuffer(url, attempt + 1).then(resolve, reject), 2 ** attempt * 500);
          return;
        }
        reject(err);
      });
  });
}

function api(params) {
  const qs = new URLSearchParams({ ...params, format: "json" }).toString();
  return fetchJson(`${API}?${qs}`);
}

function cleanLinks(value) {
  return String(value)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/^[[\]\s]+|[[\]\s]+$/g, "")
    .trim();
}

function infobox(wikitext, field) {
  const m = wikitext.match(new RegExp(`^\\s*\\|\\s*${field}\\s*=\\s*(.+)$`, "m"));
  return m ? cleanLinks(m[1]) : null;
}

function parseCarStatsFh6(wikitext) {
  const m = wikitext.match(
    /\{\{CarStats\|fh6\s*\n\|([0-9.]+)\|([0-9.]+)\|([0-9.]+)\|([0-9.]+)\|([0-9.]+)\|([0-9.]+)\|(\d+)/,
  );
  const price = wikitext.match(/\|\s*price\s*=\s*([\d,]+)/);
  const block = wikitext.match(/\{\{CarStats\|fh6([\s\S]*?)\}\}/);
  const tier = block?.[1]?.match(/\|\s*tier\s*=\s*([a-z0-9]+)/i);
  const cls = tier ? tier[1].toUpperCase() : null;
  if (!m) return { stats: {}, pi: null, cost: price ? parseInt(price[1].replace(/,/g, ""), 10) : null, class: cls };
  return {
    stats: {
      SPD: parseFloat(m[1]),
      HND: parseFloat(m[2]),
      ACC: parseFloat(m[3]),
      LCH: parseFloat(m[4]),
      BRK: parseFloat(m[5]),
      OFF: parseFloat(m[6]),
    },
    pi: parseInt(m[7], 10),
    cost: price ? parseInt(price[1].replace(/,/g, ""), 10) : null,
    class: cls,
  };
}

function splitList(value) {
  const stripped = value.replace(/<ref[\s\S]*?<\/ref>/g, "").replace(/<ref[^>]*\/>/g, "");
  const links = [...stripped.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)];
  if (links.length) return links.map((x) => cleanLinks(x[2] ?? x[1])).filter(Boolean);
  return cleanLinks(stripped)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseConversions(wikitext) {
  const out = {};
  const re = /\{\{CarConversions\|(\w+)([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(wikitext))) {
    const fh6 = m[2].match(/^\s*\|\s*fh6\s*=\s*(.+)$/m);
    if (!fh6) continue;
    const items = splitList(fh6[1]);
    if (items.length) out[m[1]] = items;
  }
  return out;
}

function rarityFromCost(cost) {
  if (cost == null) return null;
  if (cost >= 400000) return "Epic";
  if (cost >= 100000) return "Rare";
  return "Common";
}

function engineConfig(engine) {
  if (!engine) return null;
  const e = engine.toUpperCase();
  if (e.startsWith("I")) return "Inline Engine";
  if (e.startsWith("V")) return "V Engine";
  if (e.startsWith("F")) return "Flat Engine";
  if (e.startsWith("W")) return "W Engine";
  return null;
}

function cylindersFromEngine(engine) {
  const m = String(engine || "").match(/[VIFWR](\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function placementFromLayout(layout) {
  if (!layout) return null;
  if (layout === "mr") return "Mid-engine";
  if (layout === "rr" || layout === "ra") return "Rear-engine";
  return "Front-engine";
}

function wikiUrl(title) {
  return `https://forza.fandom.com/wiki/${encodeURIComponent(title).replace(/%20/g, "_")}`;
}

async function pageImageUrl(title) {
  const data = await api({ action: "query", titles: title, prop: "pageimages", piprop: "original" });
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  return page?.original?.source || null;
}

async function saveHero(url, heroCode) {
  fs.mkdirSync(HERO_DIR, { recursive: true });
  const dest = path.join(HERO_DIR, `${heroCode}.webp`);
  const buf = await fetchBuffer(url);
  const sharp = require("sharp");
  await sharp(buf)
    .resize({ width: 1340, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(dest);
  return `/garage/heros/${heroCode}.webp`;
}

async function saveLogo(url, code) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const dest = path.join(LOGO_DIR, `${code}.webp`);
  if (fs.existsSync(dest)) return;
  const buf = await fetchBuffer(url);
  const sharp = require("sharp");
  await sharp(buf)
    .resize({ width: 256, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(dest);
}

function rememberBrand(make, code) {
  if (!make || !code || !fs.existsSync(BRANDS_PATH)) return;
  const brands = JSON.parse(fs.readFileSync(BRANDS_PATH, "utf8"));
  brands.byMake = brands.byMake || {};
  if (!brands.byMake[make]) {
    brands.byMake[make] = code;
    brands.brands = brands.brands || [];
    if (!brands.brands.some((b) => b.code === code)) {
      brands.brands.push({ make, code });
      brands.brands.sort((a, b) => a.make.localeCompare(b.make));
    }
    brands.count = brands.brands.length;
    brands.downloadedAt = new Date().toISOString();
    fs.writeFileSync(BRANDS_PATH, `${JSON.stringify(brands)}\n`);
  }
}

async function ensureManufacturerLogo(make, code) {
  if (!make || !code) return;
  const dest = path.join(LOGO_DIR, `${code}.webp`);
  if (!fs.existsSync(dest)) {
    const imgUrl = await pageImageUrl(make);
    if (imgUrl) {
      await saveLogo(imgUrl, code);
      console.log(`logo ${code} ← ${make}`);
    }
  }
  rememberBrand(make, code);
}

function buildCar(seed, wikitext, image) {
  const year = infobox(wikitext, "year") || seed.year || null;
  const manufacturer = (infobox(wikitext, "manufacturer") || "").toLowerCase();
  const model = infobox(wikitext, "model") || seed.model;
  const make = MAKE_NAMES[manufacturer] || manufacturer.replace(/^\w/, (c) => c.toUpperCase());
  const layout = (infobox(wikitext, "layout") || "").toLowerCase();
  const drive = LAYOUT_DRIVE[layout] || seed.drive || null;
  const powerHp = seed.powerHp ?? (infobox(wikitext, "power") ? parseInt(infobox(wikitext, "power"), 10) : null);
  const torqueLbFt =
    seed.torqueLbFt ?? (infobox(wikitext, "torque") ? parseInt(infobox(wikitext, "torque"), 10) : null);
  const weightLbs = infobox(wikitext, "weight")
    ? parseInt(String(infobox(wikitext, "weight")).replace(/,/g, ""), 10)
    : null;
  const disp = infobox(wikitext, "disp");
  const displacementCc = disp ? Math.round(parseFloat(disp) * 1000) : null;
  const engine = infobox(wikitext, "engine");
  const gearsRaw = infobox(wikitext, "gears");
  const gears = gearsRaw && /^\d+$/.test(gearsRaw) ? parseInt(gearsRaw, 10) : null;
  const front = infobox(wikitext, "front");
  const weightDist = front ? parseInt(front, 10) : null;
  const aspirationCode = (infobox(wikitext, "aspiration") || "").toLowerCase();
  const fh6 = parseCarStatsFh6(wikitext);
  const cost = fh6.cost;
  const quote = wikitext.match(/\{\{quotation\|([^|]+)\|Official description/i);

  const car = {
    slug: seed.slug,
    url: wikiUrl(seed.wiki),
    year,
    make,
    model,
    name: `${year} ${make} ${model}`,
    cost,
    rarity: rarityFromCost(cost),
    class: seed.class || fh6.class || undefined,
    pi: fh6.pi ?? seed.pi ?? undefined,
    drive,
    powerHp,
    torqueLbFt,
    weightLbs,
    heroCode: seed.heroCode,
    logoCode: seed.logoCode,
    image,
    stats: fh6.stats,
    acquisition: seed.acquisition,
    description: quote ? quote[1].trim() : undefined,
    tuneSpecs: {
      driveType: drive,
      weightLbs,
      weightDist: Number.isFinite(weightDist) ? weightDist : undefined,
      powerHp,
      maxTorqueLbFt: torqueLbFt,
      displacementCc,
      gears,
      aspiration: ASPIRATION[aspirationCode] || null,
      engineConfig: engineConfig(engine),
      enginePlacement: placementFromLayout(layout),
      cylinders: cylindersFromEngine(engine),
      hasAero: false,
    },
  };

  return { car, engine, gears, weightLbs, aspirationCode, conversions: parseConversions(wikitext) };
}

async function main() {
  const garage = JSON.parse(fs.readFileSync(GARAGE_PATH, "utf8"));
  const bySlug = new Map((garage.cars ?? []).map((c) => [c.slug, c]));
  const added = [];
  const swapRows = [];

  for (const seed of [...SERIES4, ...SERIES5]) {
    if (bySlug.has(seed.slug)) {
      console.log(`skip ${seed.slug} (already in garage)`);
      continue;
    }
    console.log(`wiki ${seed.wiki}`);
    const parsed = await api({ action: "parse", page: seed.wiki, prop: "wikitext" });
    const wikitext = parsed.parse?.wikitext?.["*"] ?? "";
    if (!wikitext) throw new Error(`empty wikitext for ${seed.wiki}`);

    const imgUrl = await pageImageUrl(seed.wiki);
    if (!imgUrl) throw new Error(`no page image for ${seed.wiki}`);
    const image = await saveHero(imgUrl, seed.heroCode);

    const { car, engine, gears, weightLbs, aspirationCode, conversions } = buildCar(seed, wikitext, image);
    garage.cars.unshift(car);
    bySlug.set(car.slug, car);
    added.push(car.slug);
    if (car.make && car.logoCode) await ensureManufacturerLogo(car.make, car.logoCode);

    const swap = {
      title: seed.wiki,
      aspiration: aspirationCode || null,
      engine: engine || null,
      gears: gears ?? null,
      weightLbs: weightLbs ?? null,
    };
    if (conversions.eng) swap.engineSwaps = conversions.eng;
    if (conversions.drive) swap.drivetrainSwaps = conversions.drive;
    if (conversions.body) swap.bodyKits = conversions.body;
    if (conversions.preset) swap.presets = conversions.preset;
    swapRows.push(swap);

    await new Promise((r) => setTimeout(r, 200));
  }

  garage.count = garage.cars.length;
  garage.importedAt = new Date().toISOString();
  fs.writeFileSync(GARAGE_PATH, JSON.stringify(garage));
  console.log(`Garage now ${garage.count} cars (+${added.length})`);
  if (added.length) console.log(`  added: ${added.join(", ")}`);

  if (swapRows.length && fs.existsSync(SWAPS_PATH)) {
    const swaps = JSON.parse(fs.readFileSync(SWAPS_PATH, "utf8"));
    const titles = new Set((swaps.cars ?? []).map((c) => c.title));
    for (const row of swapRows) {
      if (titles.has(row.title)) continue;
      swaps.cars.push(row);
      titles.add(row.title);
    }
    swaps.count = swaps.cars.length;
    swaps.withEngineSwaps = swaps.cars.filter((c) => c.engineSwaps?.length).length;
    swaps.importedAt = new Date().toISOString();
    fs.writeFileSync(SWAPS_PATH, `${JSON.stringify(swaps, null, 2)}\n`);
    console.log(`Wiki swaps now ${swaps.count} cars`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
