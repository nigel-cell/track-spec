/**
 * Invariants for Manual upgrades + measured slider limits.
 * Usage: node --experimental-strip-types scripts/check-tune-invariants.mts
 */
import { readFileSync } from "node:fs";
import { applyDrivetrainConversion } from "../src/lib/drivetrainSwap.ts";
import { calcTune, type CalcTuneInput } from "../src/lib/calcTune.ts";
import {
  buildGameLimits,
  clampNumber,
  estimateRaceAeroMaxKg,
  normalizeRideEnvelope,
} from "../src/lib/gameLimits.ts";
import { METRIC_UNITS } from "../src/lib/units.ts";
import type { SliderLimitsFile } from "../src/lib/sliderLimits.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const limits = JSON.parse(
  readFileSync(new URL("../public/carSliderLimits.json", import.meta.url), "utf8"),
) as SliderLimitsFile;

if (limits.count !== Object.keys(limits.cars).length) {
  fail(`count ${limits.count} != cars ${Object.keys(limits.cars).length}`);
}

const gr86 = limits.cars["toyota-gr86-2022"];
const f430 = limits.cars["ferrari-430-scuderia-2007"];
if (!gr86 || gr86.source !== "measured") fail("GR86 missing measured limits");
if (!f430 || f430.source !== "measured") fail("430 Scuderia missing measured limits");
if (!gr86.ride || gr86.ride.frontMin !== 11.2 || gr86.ride.frontMax !== 15.5) {
  fail(`GR86 ride ends unexpected: ${JSON.stringify(gr86.ride)}`);
}
if (!f430.ride || f430.ride.frontMin !== 11.9 || f430.ride.frontMax !== 24) {
  fail(`430 ride ends unexpected: ${JSON.stringify(f430.ride)}`);
}
if (!gr86.springs || !f430.springs) fail("measured cars missing springs");

const skyline = limits.cars["nissan-skyline-2000-turbo-rs-1983"];
if (!skyline || skyline.source !== "estimated") fail("Skyline missing estimated limits");
if (!skyline.ride || skyline.ride.frontMin !== 11.2 || skyline.ride.frontMax !== 26) {
  fail(`estimated ride should be 11.2–26 cm, got ${JSON.stringify(skyline.ride)}`);
}

const awd = applyDrivetrainConversion({
  label: "AWD Drivetrain",
  stockDrive: "RWD",
  currentDrive: "RWD",
  currentWeightLbs: 2800,
  stockWeightDist: 47,
});
if (awd.driveType !== "AWD") fail(`expected AWD, got ${awd.driveType}`);
if (awd.weightLbs !== 2910) fail(`RWD→AWD weight ${awd.weightLbs}, expected 2910`);
if (awd.weightDist !== 53) fail(`AWD dist ${awd.weightDist}, expected 53`);

const stock = applyDrivetrainConversion({
  label: "None (Stock)",
  stockDrive: "RWD",
  currentDrive: "AWD",
  currentWeightLbs: awd.weightLbs,
  stockWeightDist: 47,
});
if (stock.driveType !== "RWD") fail(`stock restore drive ${stock.driveType}`);
if (stock.weightLbs !== 2800) fail(`stock restore weight ${stock.weightLbs}`);
if (stock.weightDist !== 47) fail(`stock restore dist ${stock.weightDist}`);

const clamped = clampNumber(70, 1, 65);
if (clamped.value !== 65 || clamped.hit !== "max") {
  fail(`ARB clamp expected 65/max, got ${clamped.value}/${clamped.hit}`);
}

const game = buildGameLimits({
  weightLbs: 2800,
  weightDist: 53,
  units: { weight: "lbs", springs: "kgf/mm", pressure: "bar", speed: "mph" },
  rideLimits: gr86.ride,
  offRoad: false,
});
if (game.rideCm.frontMin !== 11.2 || game.rideCm.frontMax !== 15.5) {
  fail(`game ride not using GR86 measured ends: ${JSON.stringify(game.rideCm)}`);
}
if (game.tireBar.min !== 1.0 || game.tireBar.max !== 3.8) {
  fail(`tire bar envelope ${game.tireBar.min}-${game.tireBar.max}`);
}

if (METRIC_UNITS.springs !== "kgf/mm") fail(`metric springs ${METRIC_UNITS.springs}, expected kgf/mm`);
const calcSrc = readFileSync(new URL("../src/lib/calcTune.ts", import.meta.url), "utf8");
if (!calcSrc.includes('springs: "kgf/mm"')) fail("calcTune should force spring output to kgf/mm");
if (calcSrc.includes("/ 2.54")) fail("ride height still converts to inches");
if (!calcSrc.includes(".toFixed(1)} cm`")) fail("ride height should print cm");
if (!calcSrc.includes("kgf")) fail("aero output should use kgf");

const aero26 = estimateRaceAeroMaxKg(26.01, "front");
if (Math.abs(aero26 - 63.7) > 0.2) fail(`stock 26.01 kgf should scale to ~63.7, got ${aero26}`);
const aero32 = estimateRaceAeroMaxKg(31.78, "rear");
if (Math.abs(aero32 - 77.9) > 0.5) fail(`stock 31.78 kgf should scale to ~77.9, got ${aero32}`);
if (estimateRaceAeroMaxKg(58.3, "front") !== 58.3) {
  fail("measured aero max ≥50 kgf must stay as-is");
}

const inverted = normalizeRideEnvelope({
  frontMin: 15.9,
  frontMax: 24,
  rearMin: 22.5,
  rearMax: 28,
});
if (inverted.frontMin !== 11.2 || inverted.frontMax !== 15.9) {
  fail(`stock-as-min ride should become 11.2–15.9 F, got ${JSON.stringify(inverted)}`);
}
if (inverted.rearMin !== 11.2 || inverted.rearMax !== 22.5) {
  fail(`stock-as-min rear should become 11.2–22.5, got ${JSON.stringify(inverted)}`);
}

const measuredRide = normalizeRideEnvelope({
  frontMin: 11.2,
  frontMax: 15.5,
  rearMin: 11.2,
  rearMax: 15.9,
});
if (measuredRide.frontMin !== 11.2 || measuredRide.frontMax !== 15.5) {
  fail(`GR86 measured ride must not be rewritten: ${JSON.stringify(measuredRide)}`);
}

function row(pages: ReturnType<typeof calcTune>, page: string, key: string) {
  const p = pages[page];
  if (!p) fail(`missing page ${page}`);
  const r = p.values.find((v) => v.key === key);
  if (!r) fail(`missing ${page} / ${key}`);
  return r;
}

function num(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) fail(`not a number: ${value}`);
  return n;
}

const screenshot: CalcTuneInput = {
  tuneId: "Race",
  driveType: "RWD",
  surface: "Road",
  inputDevice: "controller",
  weight: 1400,
  weightDist: 52,
  pi: 700,
  carClass: "A",
  redlineRpm: 7800,
  peakTorqueRpm: 5500,
  maxTorque: 400,
  topspeed: 180,
  gears: 7,
  includeGearing: true,
  tireWF: "275/35R19",
  tireWR: "285/35R19",
  compound: "Race Semi-Slick",
  hasAero: true,
  aeroF: 70,
  aeroR: 110,
  dragCd: 0.36,
  feelBalance: 40,
  feelAggression: 45,
  units: METRIC_UNITS,
  transFdMult: 1.05,
  aeroLimits: { frontMin: 0, frontMax: 26.01, rearMin: 0, rearMax: 31.78 },
  rideLimits: { frontMin: 15.9, frontMax: 24, rearMin: 22.5, rearMax: 28 },
};

const pages = calcTune(screenshot);
const frontDf = row(pages, "Aero", "Front Downforce");
const rearDf = row(pages, "Aero", "Rear Downforce");
if (num(frontDf.value) < 50) fail(`track aero clamped to stock DF: ${frontDf.value}`);
if (num(rearDf.value) < 60) fail(`track rear aero clamped to stock DF: ${rearDf.value}`);
if (!frontDf.value.includes("kgf") || !rearDf.value.includes("kgf")) {
  fail(`aero should print kgf, got ${frontDf.value} / ${rearDf.value}`);
}

const fRide = row(pages, "Springs", "Front Ride Height");
const rRide = row(pages, "Springs", "Rear Ride Height");
if (num(fRide.value) >= 15.5) fail(`front ride still sitting on fake min/high: ${fRide.value}`);
if (num(rRide.value) >= 20) fail(`rear ride still sitting on fake min/high: ${rRide.value}`);
if (fRide.clamped === "min" && num(fRide.value) >= 15.5) {
  fail("front ride still labelled GAME MIN at stock height");
}

const fd = row(pages, "Gearing", "Final Drive");
const lastGear = [...(pages.Gearing?.values ?? [])].reverse().find((v) => v.key.includes("Gear"));
if (!lastGear) fail("missing top gear");
const circM = (() => {
  const [tw, ta, tr] = "285/35R19".split(/[\/R]/).map(Number);
  const sidewall = tw * (ta / 100);
  const radiusMm = (tr * 25.4) / 2 + sidewall;
  return (2 * Math.PI * radiusMm) / 1000;
})();
const impliedKmh =
  (7800 * circM * 3.6) / (num(lastGear.value) * num(fd.value) * 60);
if (impliedKmh < 170) {
  fail(`Race tune top speed ${impliedKmh.toFixed(1)} km/h (FD ${fd.value}, ${lastGear.key} ${lastGear.value}) — must clear 161`);
}
if (num(fd.value) >= 5.5) fail(`final drive still pinned at short 5.50: ${fd.value}`);

console.log("check-tune-invariants: ok");
