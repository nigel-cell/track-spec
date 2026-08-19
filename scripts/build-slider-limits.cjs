/**
 * Build per-car spring/aero/ride slider limit estimates from forzaGarage.json.
 * Race-suspension spring min/max are not published — we derive them from curb
 * weight using community-calibrated ratios, and take aero max from tuneSpecs.
 *
 * Usage: node scripts/build-slider-limits.cjs
 * Out:   public/carSliderLimits.json
 */

const fs = require("fs");
const path = require("path");

const GARAGE = path.join(__dirname, "..", "public", "forzaGarage.json");
const OUT = path.join(__dirname, "..", "public", "carSliderLimits.json");
const keepMeasured = process.argv.includes("--keep-measured");

const WEIGHT_DIST = { FWD: 63, RWD: 47, AWD: 53 };

/** Race-suspension spring slider estimate (lbs/in) — calibrated to forum examples. */
function estimateSpringsLbs(weightLbs, weightDist) {
  const w = Math.max(1200, Math.min(7000, weightLbs));
  const frontBias = Math.max(0.4, Math.min(0.6, weightDist / 100));
  // Forum samples: ~0.06–0.09×W min, ~0.38–0.45×W max, ~5–7× span.
  const baseMin = w * 0.07;
  const baseMax = w * 0.41;
  const fMin = Math.round(baseMin * (0.92 + frontBias * 0.16));
  const fMax = Math.round(baseMax * (0.94 + frontBias * 0.12));
  const rMin = Math.round(baseMin * (1.08 - frontBias * 0.16));
  const rMax = Math.round(baseMax * (1.06 - frontBias * 0.1));
  return {
    frontMin: Math.max(90, fMin),
    frontMax: Math.max(fMin + 100, fMax),
    rearMin: Math.max(90, rMin),
    rearMax: Math.max(rMin + 100, rMax),
  };
}

function estimateRideCm(carClass, offroadHint) {
  if (offroadHint) return { frontMin: 18, frontMax: 34, rearMin: 18, rearMax: 34 };
  // Road race chassis — game floor is typically 15 cm.
  const tall = carClass === "D" || carClass === "C";
  return {
    frontMin: 15,
    frontMax: tall ? 28 : 24,
    rearMin: 15,
    rearMax: tall ? 28 : 24,
  };
}

function main() {
  const garage = JSON.parse(fs.readFileSync(GARAGE, "utf8"));
  const cars = garage.cars ?? [];
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "estimated from forzaGarage weight + tuneSpecs aero",
    unitSprings: "lbs/in",
    unitAero: "kg",
    unitRide: "cm",
    count: 0,
    cars: {},
  };

  for (const car of cars) {
    const ts = car.tuneSpecs || {};
    const weightLbs = ts.weightLbs ?? car.weightLbs;
    if (!weightLbs) continue;
    const drive = ts.driveType ?? car.drive ?? "RWD";
    const weightDist = ts.weightDist ?? WEIGHT_DIST[drive] ?? 53;
    const springs = estimateSpringsLbs(weightLbs, weightDist);
    const offroad =
      /off-?road|rally|trophy|baja|crawler|truck|ute/i.test(`${car.model} ${car.name || ""}`);
    const ride = estimateRideCm(car.class, offroad);

    const aeroF = ts.downforceFront;
    const aeroR = ts.downforceRear;
    const hasAero = !!(ts.hasAero || (aeroF > 0 || aeroR > 0));

    const key = car.slug || `${car.make}-${car.model}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    out.cars[key] = {
      make: car.make,
      model: car.model,
      year: car.year || null,
      weightLbs: Math.round(weightLbs),
      weightDist,
      drive,
      carClass: car.class || null,
      source: "estimated",
      springs: { ...springs, unit: "lbs/in" },
      ride,
      aero: hasAero
        ? {
            frontMin: 0,
            frontMax: Number.isFinite(aeroF) ? +aeroF : null,
            rearMin: 0,
            rearMax: Number.isFinite(aeroR) ? +aeroR : null,
            unit: "kg",
          }
        : null,
    };
    out.count++;
  }

  if (keepMeasured && fs.existsSync(OUT)) {
    const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
    let kept = 0;
    for (const [key, car] of Object.entries(prev.cars || {})) {
      if (car?.source === "measured") {
        out.cars[key] = car;
        kept++;
      }
    }
    out.count = Object.keys(out.cars).length;
    if (kept) console.log(`Kept ${kept} measured slider cars`);
  }

  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`Wrote ${out.count} cars → ${path.relative(process.cwd(), OUT)}`);
}

main();
