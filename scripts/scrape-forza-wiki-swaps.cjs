/**
 * Import per-car FH6 conversions (engine swaps, drivetrain, body) from the
 * Forza Wiki (forza.fandom.com) via the MediaWiki API.
 *
 * Usage: node scripts/scrape-forza-wiki-swaps.cjs [--limit=N] [--out=public/forzaWikiSwaps.json]
 *
 * The wiki stores conversions as {{CarConversions|<kind>}} templates with one
 * line per game, so we only read the `fh6 =` line and ignore other titles.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const API = "https://forza.fandom.com/api.php";
const CATEGORY = "Category:Cars (FH6)";
const UA = "TrackSpec-Import/1.0 (personal)";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const outArg = args.find((a) => a.startsWith("--out="));
const LIMIT = limitArg ? parseInt(limitArg.slice("--limit=".length), 10) : Infinity;
const OUT_PATH = outArg
  ? path.resolve(process.cwd(), outArg.slice("--out=".length))
  : path.join(__dirname, "..", "public", "forzaWikiSwaps.json");

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
          // The wiki rate limits aggressively; back off and retry.
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

function api(params) {
  const qs = new URLSearchParams({ ...params, format: "json" }).toString();
  return fetchJson(`${API}?${qs}`);
}

async function listCarPages() {
  const titles = [];
  let cmcontinue;
  do {
    const data = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: CATEGORY,
      cmlimit: "500",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    for (const m of data.query?.categorymembers ?? []) {
      if (m.ns === 0) titles.push(m.title);
    }
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

/** Strip wiki link syntax: [[A|B]] → B, [[A]] → A. */
function cleanLinks(value) {
  return value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/^[[\]\s]+|[[\]\s]+$/g, "")
    .trim();
}

/** Entries are wiki links, but the source is inconsistent about separating them
 *  with commas, so treat each [[link]] as its own item when links are present. */
function splitList(value) {
  const stripped = value.replace(/<ref[\s\S]*?<\/ref>/g, "").replace(/<ref[^>]*\/>/g, "");
  const links = [...stripped.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)];

  if (links.length) {
    return links.map((m) => cleanLinks(m[2] ?? m[1])).filter(Boolean);
  }

  return cleanLinks(stripped)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pull the `fh6 = ...` line out of each {{CarConversions|<kind>}} block. */
function parseConversions(wikitext) {
  const out = {};
  const re = /\{\{CarConversions\|(\w+)([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(wikitext))) {
    const kind = m[1];
    const body = m[2];
    const fh6 = body.match(/^\s*\|\s*fh6\s*=\s*(.+)$/m);
    if (!fh6) continue;
    const items = splitList(fh6[1]);
    if (items.length) out[kind] = items;
  }
  return out;
}

/** Stock spec fields live in the car infobox. */
function parseInfobox(wikitext) {
  const grab = (field) => {
    const m = wikitext.match(new RegExp(`^\\s*\\|\\s*${field}\\s*=\\s*(.+)$`, "m"));
    return m ? cleanLinks(m[1]) : null;
  };
  const gears = grab("gears");
  const weight = grab("weight");
  return {
    aspiration: grab("aspiration"),
    engine: grab("engine"),
    gears: gears && /^\d+$/.test(gears) ? Number(gears) : null,
    weightLbs: weight && /^[\d,]+$/.test(weight) ? Number(weight.replace(/,/g, "")) : null,
  };
}

function isFh6(wikitext) {
  return /\{\{game\|[^}]*fh6=y/.test(wikitext);
}

async function main() {
  console.log(`Listing pages in ${CATEGORY}…`);
  const titles = (await listCarPages()).slice(0, LIMIT);
  console.log(`Found ${titles.length} car pages.`);

  const cars = [];
  let withSwaps = 0;
  let failed = 0;

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    try {
      const data = await api({ action: "parse", page: title, prop: "wikitext" });
      const wikitext = data.parse?.wikitext?.["*"] ?? "";
      if (!isFh6(wikitext)) continue;

      const conversions = parseConversions(wikitext);
      const info = parseInfobox(wikitext);
      const entry = { title, ...info };
      if (conversions.eng) entry.engineSwaps = conversions.eng;
      if (conversions.drive) entry.drivetrainSwaps = conversions.drive;
      if (conversions.body) entry.bodyKits = conversions.body;
      if (conversions.preset) entry.presets = conversions.preset;
      if (entry.engineSwaps) withSwaps++;
      cars.push(entry);
    } catch (err) {
      failed++;
      console.warn(`  ! ${title}: ${err.message}`);
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${titles.length} (${withSwaps} with engine swaps)`);
    }
    // Be polite to the wiki.
    await new Promise((r) => setTimeout(r, 120));
  }

  const payload = {
    version: 1,
    importedAt: new Date().toISOString(),
    source: "https://forza.fandom.com/wiki/Category:Cars_(FH6)",
    count: cars.length,
    withEngineSwaps: withSwaps,
    cars,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`  cars: ${cars.length}, with engine swaps: ${withSwaps}, failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
