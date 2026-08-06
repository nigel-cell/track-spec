/**
 * Patch existing forzaGarage.json with mastery cells + perk icons.
 * Usage: node scripts/patch-garage-mastery.cjs
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const JSON_PATH = path.join(__dirname, "..", "public", "forzaGarage.json");

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

function parseMastery(html) {
  const cm = html.match(/<script type="application\/json" id="cm-data">([\s\S]*?)<\/script>/);
  if (!cm) return null;
  try {
    const mastery = JSON.parse(cm[1]);
    return {
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
    return null;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const cars = data.cars ?? [];
  let idx = 0;
  let done = 0;
  let ok = 0;

  async function worker() {
    while (idx < cars.length) {
      const i = idx++;
      const car = cars[i];
      try {
        const html = await fetchText(car.url);
        const mastery = parseMastery(html);
        if (mastery) {
          car.mastery = mastery;
          ok++;
        }
      } catch (e) {
        car.masteryError = String(e.message || e);
      }
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${cars.length}`);
      await sleep(100);
    }
  }

  console.log(`Patching mastery for ${cars.length} cars…`);
  await Promise.all(Array.from({ length: 6 }, () => worker()));

  data.masteryPatchedAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, JSON.stringify(data));
  console.log(`Done — ${ok} cars with mastery grid data`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
