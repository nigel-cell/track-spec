/**
 * Patch forzaGarage.json with tuning-relevant specs from detail pages.
 * Usage: node scripts/patch-garage-specs.cjs
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const JSON_PATH = path.join(__dirname, "..", "public", "forzaGarage.json");
const missingOnly = process.argv.includes("--missing");
const WEIGHT_DIST = { FWD: 63, RWD: 47, AWD: 53 };

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

function decodeHtml(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function parseSpecRows(html) {
  const specs = {};
  const re = /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/g;
  let m;
  while ((m = re.exec(html))) {
    specs[decodeHtml(m[1].trim())] = decodeHtml(m[2].trim());
  }
  return specs;
}

function radToRpm(rad) {
  const n = parseFloat(rad);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 9.5493);
}

function parseCarLd(html) {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const [, raw] of scripts) {
    try {
      const j = JSON.parse(raw);
      if (j["@type"] === "Car") return j;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseWeightDist(rows, fallback) {
  const raw =
    rows["Weight distribution (front %)"] ??
    rows["Weight distribution (front)"] ??
    rows["Weight distribution"];
  if (!raw) return fallback;
  const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(n) && n >= 35 && n <= 70) return n;
  return fallback;
}

function parsePeakTorqueRpm(rows) {
  const candidates = [
    rows["SimPeakTorqueAngVel (rad/s)"],
    rows["Peak torque RPM (sim, rad/s)"],
    rows["Peak torque (sim, rad/s)"],
    rows["Dyno peak torque RPM"],
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const asRpm = radToRpm(raw);
    if (asRpm && asRpm > 1000) return asRpm;
    const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && n > 1000) return n;
  }
  return radToRpm(rows["Peak power RPM (sim, rad/s)"]);
}

function parseTuneSpecs(html, car) {
  const rows = parseSpecRows(html);
  const ld = parseCarLd(html);

  const driveRaw = rows["Drive type"] || car.drive || "";
  const driveType = driveRaw.toUpperCase().replace(/[^A-Z]/g, "") || null;
  const normalizedDrive = driveType === "ALLWHEEL" ? "AWD" : driveType;
  const driveKey = normalizedDrive && ["FWD", "RWD", "AWD"].includes(normalizedDrive) ? normalizedDrive : car.drive;

  const gearsRaw = rows["Gears"];
  const gears = gearsRaw ? parseInt(String(gearsRaw).replace(/\D/g, ""), 10) : null;

  const dfF = parseFloat(rows["Downforce front"]);
  const dfR = parseFloat(rows["Downforce rear"]);
  const hasAero = (dfF > 0 || dfR > 0) && !(dfF === 0 && dfR === 0);

  const tuneSpecs = {
    driveType: driveKey,
    weightLbs: ld?.weightTotal?.value ?? car.weightLbs ?? null,
    weightDist: parseWeightDist(rows, WEIGHT_DIST[driveKey] ?? WEIGHT_DIST[car.drive] ?? 53),
    powerHp: ld?.vehicleEngine?.enginePower?.value ?? car.powerHp ?? null,
    maxTorqueLbFt: ld?.vehicleEngine?.torque?.value ?? car.torqueLbFt ?? null,
    displacementCc: ld?.vehicleEngine?.engineDisplacement?.value ?? null,
    topspeedMph: ld?.speed?.value ?? car.topSpeedMph ?? null,
    redlineRpm: radToRpm(rows["Redline (sim, rad/s)"]),
    peakTorqueRpm: parsePeakTorqueRpm(rows),
    gears: Number.isFinite(gears) ? gears : null,
    aspiration: rows["Aspiration"] || null,
    engineConfig: rows["Engine config"]?.replace(/'/g, "") || null,
    enginePlacement: rows["Engine placement"] || null,
    cylinders: rows["Cylinders"] ? parseInt(rows["Cylinders"], 10) : null,
    stockCompound: rows["Stock tire compound"] || null,
    tireFront: rows["Front tire"] || null,
    tireRear: rows["Rear tire"] || null,
    hasAero: !!hasAero,
    downforceFront: Number.isFinite(dfF) ? dfF : null,
    downforceRear: Number.isFinite(dfR) ? dfR : null,
  };

  if (ld?.vehicleEngine?.torque?.value) car.torqueLbFt = ld.vehicleEngine.torque.value;
  if (ld?.weightTotal?.value) car.weightLbs = ld.weightTotal.value;
  if (ld?.vehicleEngine?.enginePower?.value) car.powerHp = ld.vehicleEngine.enginePower.value;
  if (ld?.speed?.value) car.topSpeedMph = ld.speed.value;

  return tuneSpecs;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const cars = data.cars ?? [];
  const queue = missingOnly
    ? cars
        .map((car, i) => ({ car, i }))
        .filter(
          ({ car }) => !(car.tuneSpecs && (car.tuneSpecs.redlineRpm || car.tuneSpecs.tireFront)),
        )
    : cars.map((car, i) => ({ car, i }));
  let idx = 0;
  let done = 0;
  let ok = cars.filter((c) => c.tuneSpecs).length;

  if (queue.length === 0) {
    console.log("Tune specs: nothing missing");
    return;
  }

  async function worker() {
    while (idx < queue.length) {
      const { car } = queue[idx++];
      try {
        const html = await fetchText(car.url);
        car.tuneSpecs = parseTuneSpecs(html, car);
        ok++;
      } catch (e) {
        car.tuneSpecsError = String(e.message || e);
      }
      done++;
      if (done % 50 === 0) console.log(`  ${done}/${queue.length}`);
      await sleep(100);
    }
  }

  console.log(
    `Patching tune specs for ${queue.length} cars${missingOnly ? " (missing only)" : ""}…`,
  );
  await Promise.all(Array.from({ length: 6 }, () => worker()));

  data.tuneSpecsPatchedAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, JSON.stringify(data));
  console.log(`Done — ${ok} cars with tuneSpecs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
