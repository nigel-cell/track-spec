/**
 * Garage stock figures follow the user's Imperial / Metric setting.
 * Usage: node --experimental-strip-types scripts/check-garage-units.mts
 */
import { specGroups } from "../src/lib/tuneFromGarage.ts";
import type { ForzaGarageCar } from "../src/lib/forzaGarage.ts";
import {
  IMPERIAL_UNITS,
  METRIC_UNITS,
  garageStockFigures,
  garageStockSource,
  powerFromHp,
} from "../src/lib/units.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const scuderia: ForzaGarageCar = {
  slug: "ferrari-430-scuderia-2007",
  url: "",
  year: "2007",
  make: "Ferrari",
  model: "430 Scuderia",
  name: "Ferrari 430 Scuderia",
  cost: null,
  rarity: null,
  class: "S1",
  pi: 702,
  drive: "RWD",
  powerHp: 503,
  topSpeedMph: 211,
  weightLbs: 3150,
  torqueLbFt: 347,
  heroCode: null,
  image: null,
  stats: {},
  tuneSpecs: {
    powerHp: 503,
    maxTorqueLbFt: 347,
    weightLbs: 3150,
    topspeedMph: 211,
  },
};

if (powerFromHp(503, METRIC_UNITS) !== 375) fail(`503 hp → kW got ${powerFromHp(503, METRIC_UNITS)}`);
if (powerFromHp(503, IMPERIAL_UNITS) !== 503) fail("imperial power should stay hp");

const imperial = garageStockFigures(garageStockSource(scuderia), IMPERIAL_UNITS);
const metric = garageStockFigures(garageStockSource(scuderia), METRIC_UNITS);

function figure(list: typeof imperial, label: string) {
  const f = list.find((x) => x.label === label);
  if (!f) fail(`missing ${label}`);
  return f;
}

const iPower = figure(imperial, "Power");
if (iPower.value !== 503 || iPower.unit !== "hp") fail(`imperial power ${JSON.stringify(iPower)}`);
const iTorque = figure(imperial, "Torque");
if (iTorque.value !== 347 || iTorque.unit !== "lb-ft") fail(`imperial torque ${JSON.stringify(iTorque)}`);
const iWeight = figure(imperial, "Weight");
if (iWeight.value !== 3150 || iWeight.unit !== "lb") fail(`imperial weight ${JSON.stringify(iWeight)}`);
const iSpeed = figure(imperial, "Top speed");
if (iSpeed.value !== 211 || iSpeed.unit !== "mph") fail(`imperial speed ${JSON.stringify(iSpeed)}`);

const mPower = figure(metric, "Power");
if (mPower.value !== 375 || mPower.unit !== "kW") fail(`metric power ${JSON.stringify(mPower)}`);
const mTorque = figure(metric, "Torque");
if (mTorque.value !== 471 || mTorque.unit !== "Nm") fail(`metric torque ${JSON.stringify(mTorque)}`);
const mWeight = figure(metric, "Weight");
if (mWeight.value !== 1429 || mWeight.unit !== "kg") fail(`metric weight ${JSON.stringify(mWeight)}`);
const mSpeed = figure(metric, "Top speed");
if (mSpeed.value !== 339 || mSpeed.unit !== "km/h") fail(`metric speed ${JSON.stringify(mSpeed)}`);

const specMetric = specGroups(scuderia, METRIC_UNITS);
const engine = specMetric.find((g) => g.label === "Engine");
const chassis = specMetric.find((g) => g.label === "Weight & balance");
if (!engine) fail("Engine group missing");
if (!chassis) fail("Weight group missing");
const powerRow = engine.rows.find((r) => r.k === "Power")?.v;
const torqueRow = engine.rows.find((r) => r.k === "Torque")?.v;
const speedRow = engine.rows.find((r) => r.k === "Top speed")?.v;
const weightRow = chassis.rows.find((r) => r.k === "Weight")?.v;
if (powerRow !== `${(375).toLocaleString()} kW`) fail(`spec Power ${powerRow}`);
if (torqueRow !== `${(471).toLocaleString()} Nm`) fail(`spec Torque ${torqueRow}`);
if (speedRow !== `${(339).toLocaleString()} km/h`) fail(`spec Top speed ${speedRow}`);
if (weightRow !== `${(1429).toLocaleString()} kg`) fail(`spec Weight ${weightRow}`);

const specImperial = specGroups(scuderia, IMPERIAL_UNITS);
const iEngine = specImperial.find((g) => g.label === "Engine");
if (iEngine?.rows.find((r) => r.k === "Power")?.v !== "503 hp") fail("imperial spec Power");

console.log("check-garage-units: ok");
