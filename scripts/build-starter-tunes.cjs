/**
 * Write public/starterTunes.json — Race, Touge, Drag, Rally per garage car.
 * Usage: node scripts/build-starter-tunes.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WEIGHT_DIST = { FWD: 63, RWD: 47, AWD: 53 };
const FALLBACK_TIRE = { width: 275, aspect: 35, rim: 19 };

const MODES = [
  {
    tuneId: "Race",
    name: "Track Day",
    note: "Stock engine. Street strip, race gearbox, semi-slicks, race brakes.",
    balance: 40,
    aggression: 45,
    surface: "Road",
    weightDelta: -80,
    weightPackage: "street",
    chassisPackage: "stock",
    tirePackage: "semi",
    tireDeltaF: 20,
    tireDeltaR: 30,
    compound: "Race Semi-Slick",
    brakePackage: "race",
    aero: "trackIfCarHasIt",
  },
  {
    tuneId: "Touge",
    name: "Touge Run",
    note: "Stock engine. Street strip, race gearbox, semi-slicks. Tight mountain.",
    balance: 65,
    aggression: 55,
    surface: "Road",
    weightDelta: -80,
    weightPackage: "street",
    chassisPackage: "stock",
    tirePackage: "semi",
    tireDeltaF: 20,
    tireDeltaR: 30,
    compound: "Race Semi-Slick",
    brakePackage: "race",
    aero: "splitterIfCarHasIt",
  },
  {
    tuneId: "Drag",
    name: "Drag Run",
    note: "Stock engine. Sport strip, race gearbox, drag radials. No aero.",
    balance: 25,
    aggression: 70,
    surface: "Road",
    weightDelta: -160,
    weightPackage: "sport",
    chassisPackage: "stock",
    tirePackage: "drag",
    tireDeltaF: 0,
    tireDeltaR: 40,
    compound: "Drag",
    brakePackage: "sport",
    aero: "none",
  },
  {
    tuneId: "Rally",
    name: "Rally Stage",
    note: "Stock engine. Street strip, chassis brace, rally tires. Mixed surface.",
    balance: 40,
    aggression: 35,
    surface: "Mixed",
    weightDelta: -55,
    weightPackage: "street",
    chassisPackage: "braced",
    tirePackage: "rally",
    tireDeltaF: 0,
    tireDeltaR: 0,
    compound: "Rally",
    brakePackage: "sport",
    aero: "none",
  },
];

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
  return m ? { width: +m[1], aspect: +m[2], rim: +m[3] } : null;
}

function formatTire(width, aspect, rim) {
  return `${Math.round(width)}/${Math.round(aspect)}R${Math.round(rim)}`;
}

function displayModel(car) {
  return car.year ? `${car.model} '${String(car.year).slice(-2)}` : car.model;
}

function aeroFor(mode, carHasAero) {
  if (mode.aero === "trackIfCarHasIt" && carHasAero) {
    return { aeroPackage: "track", hasAero: true, aeroF: 70, aeroR: 110, dragCd: 0.36 };
  }
  if (mode.aero === "splitterIfCarHasIt" && carHasAero) {
    return { aeroPackage: "splitter", hasAero: true, aeroF: 45, aeroR: 15, dragCd: 0.33 };
  }
  return { aeroPackage: "none", hasAero: false, aeroF: 0, aeroR: 0, dragCd: 0.32 };
}

function makeTune(car, limits, mode) {
  const ts = car.tuneSpecs || {};
  const drive = ts.driveType || car.drive || "RWD";
  const stockLbs = ts.weightLbs ?? car.weightLbs ?? 2800;
  const stockTq = ts.maxTorqueLbFt ?? car.torqueLbFt ?? 200;
  const redline = estimateRedline(car);
  const peak = ts.peakTorqueRpm ?? Math.round(redline * 0.65);
  const weightLbs = Math.max(600, stockLbs + mode.weightDelta);
  const f = parseTire(ts.tireFront) ?? FALLBACK_TIRE;
  const r = parseTire(ts.tireRear) ?? FALLBACK_TIRE;
  const springs = limits?.springs;
  const ride = limits?.ride;
  const carHasAero = !!(ts.hasAero || ts.downforceFront || ts.downforceRear);
  const aero = aeroFor(mode, carHasAero);
  const useGarageAero = mode.aero === "trackIfCarHasIt" && carHasAero;
  const downF = useGarageAero ? ts.downforceFront || aero.aeroF : aero.aeroF;
  const downR = useGarageAero ? ts.downforceRear || aero.aeroR : aero.aeroR;

  return {
    slug: car.slug,
    name: mode.name,
    note: mode.note,
    balance: mode.balance,
    aggression: mode.aggression,
    config: {
      make: car.make,
      model: displayModel(car),
      driveType: drive,
      stockDriveType: drive,
      weight: weightLbs,
      weightDist: ts.weightDist ?? WEIGHT_DIST[drive] ?? 53,
      pi: car.pi ?? 500,
      carClass: car.class ?? "A",
      tuneId: mode.tuneId,
      mode: "full",
      surface: mode.surface,
      compound: mode.compound,
      redlineRpm: redline,
      peakTorqueRpm: peak,
      maxTorque: stockTq,
      topspeed: ts.topspeedMph ?? car.topSpeedMph ?? 180,
      gears: 6,
      includeGearing: true,
      hasAero: aero.hasAero,
      aeroF: aero.hasAero ? downF : 0,
      aeroR: aero.hasAero ? downR : 0,
      dragCd: aero.dragCd,
      tireWF: formatTire(Math.min(355, f.width + mode.tireDeltaF), f.aspect, f.rim),
      tireWR: formatTire(Math.min(365, r.width + mode.tireDeltaR), r.aspect, r.rim),
      engineSwap: "None (Stock)",
      drivetrainSwap: "None (Stock)",
      weightPackage: mode.weightPackage,
      chassisPackage: mode.chassisPackage,
      powerStage: "stock",
      tirePackage: mode.tirePackage,
      transPackage: "race",
      brakePackage: mode.brakePackage,
      aeroPackage: aero.aeroPackage,
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
  const cars = (garage.cars ?? []).filter((c) => c.slug);
  const tunes = cars.flatMap((car) =>
    MODES.map((mode) => makeTune(car, limitsFile.cars?.[car.slug] ?? null, mode)),
  );

  const out = {
    version: 2,
    updatedAt: new Date().toISOString().slice(0, 10),
    count: tunes.length,
    tunes,
  };
  const dest = path.join(ROOT, "public/starterTunes.json");
  fs.writeFileSync(dest, JSON.stringify(out));
  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`Wrote ${tunes.length} starter tunes (${cars.length} cars × ${MODES.length} modes) → public/starterTunes.json (${kb} KB)`);
}

main();
