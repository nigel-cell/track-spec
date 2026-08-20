/**
 * Write public/starterTunes.json for Series 4 cars.
 * Usage: node scripts/build-starter-tunes.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
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

const WEIGHT_DIST = { FWD: 63, RWD: 47, AWD: 53 };

function aspirationId(raw) {
  if (!raw) return "na";
  const s = String(raw).toLowerCase();
  if (s.includes("electric")) return "electric";
  if (s.includes("twin")) return "twin";
  if (s.includes("turbo")) return s.includes("super") ? "super" : "turbo";
  if (s.includes("super")) return "super";
  return "na";
}

function estimateRedline(car) {
  const ts = car.tuneSpecs || {};
  if (ts.redlineRpm) return ts.redlineRpm;
  const liters = (ts.displacementCc ?? 2000) / 1000;
  if (liters <= 1.0) return 8200;
  if (liters <= 1.6) return 7800;
  if (liters <= 2.5) return 7200;
  if (liters <= 4.5) return 6800;
  if (liters <= 6.5) return 6500;
  return 6000;
}

function parseTire(spec) {
  const m = String(spec || "").replace(/\s+/g, "").match(/^(\d{3})\/(\d{2})R(\d{2})$/i);
  return m ? { width: +m[1], aspect: +m[2], rim: +m[3] } : { width: 205, aspect: 55, rim: 16 };
}

function formatTire(width, aspect, rim) {
  return `${Math.round(width)}/${Math.round(aspect)}R${Math.round(rim)}`;
}

function displayModel(car) {
  return car.year ? `${car.model} '${String(car.year).slice(-2)}` : car.model;
}

function makeRaceTune(car, limits) {
  const ts = car.tuneSpecs || {};
  const drive = ts.driveType || car.drive || "RWD";
  const stockLbs = ts.weightLbs ?? car.weightLbs ?? 2800;
  const stockTq = ts.maxTorqueLbFt ?? 200;
  const redline = estimateRedline(car);
  const peak = ts.peakTorqueRpm ?? Math.round(redline * 0.65);
  const weightLbs = Math.max(600, stockLbs - 80);
  const f = parseTire(ts.tireFront);
  const r = parseTire(ts.tireRear);
  const springs = limits?.springs;
  const ride = limits?.ride;

  return {
    slug: car.slug,
    name: "Series 4 Race",
    note: "Stock engine. Street strip, race gearbox, semi-slicks, race brakes.",
    balance: 40,
    aggression: 45,
    config: {
      make: car.make,
      model: displayModel(car),
      driveType: drive,
      stockDriveType: drive,
      weight: weightLbs,
      weightDist: ts.weightDist ?? WEIGHT_DIST[drive] ?? 53,
      pi: car.pi ?? 500,
      carClass: car.class ?? "A",
      tuneId: "Race",
      mode: "full",
      surface: "Road",
      compound: "Race Semi-Slick",
      redlineRpm: redline,
      peakTorqueRpm: peak,
      maxTorque: stockTq,
      topspeed: ts.topspeedMph ?? car.topSpeedMph ?? 180,
      gears: 6,
      includeGearing: true,
      hasAero: false,
      aeroF: 0,
      aeroR: 0,
      dragCd: 0.32,
      tireWF: formatTire(Math.min(355, f.width + 20), f.aspect, f.rim),
      tireWR: formatTire(Math.min(365, r.width + 30), r.aspect, r.rim),
      engineSwap: "None (Stock)",
      drivetrainSwap: "None (Stock)",
      weightPackage: "street",
      chassisPackage: "stock",
      powerStage: "stock",
      tirePackage: "semi",
      transPackage: "race",
      brakePackage: "race",
      aeroPackage: "none",
      aspiration: aspirationId(ts.aspiration),
      inputDevice: "controller",
      sliderLimitsSource: limits?.source,
      springFrontMin: springs?.frontMin,
      springFrontMax: springs?.frontMax,
      springRearMin: springs?.rearMin,
      springRearMax: springs?.rearMax,
      rideFrontMin: ride?.frontMin,
      rideFrontMax: ride?.frontMax,
      rideRearMin: ride?.rearMin,
      rideRearMax: ride?.rearMax,
      units: { weight: "lbs", springs: "lbs/in", pressure: "psi", speed: "mph" },
    },
  };
}

function main() {
  const garage = JSON.parse(fs.readFileSync(path.join(ROOT, "public/forzaGarage.json"), "utf8"));
  const limitsFile = JSON.parse(fs.readFileSync(path.join(ROOT, "public/carSliderLimits.json"), "utf8"));
  const bySlug = new Map((garage.cars ?? []).map((c) => [c.slug, c]));
  const tunes = [];

  for (const slug of SLUGS) {
    const car = bySlug.get(slug);
    if (!car) {
      console.error(`missing garage car ${slug}`);
      process.exit(1);
    }
    tunes.push(makeRaceTune(car, limitsFile.cars?.[slug] ?? null));
  }

  const out = {
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    count: tunes.length,
    tunes,
  };
  const dest = path.join(ROOT, "public/starterTunes.json");
  fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Wrote ${tunes.length} starter tunes → public/starterTunes.json`);
}

main();
