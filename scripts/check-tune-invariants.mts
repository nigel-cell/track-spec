/**
 * Invariants for Manual upgrades + measured slider limits.
 * Usage: node --experimental-strip-types scripts/check-tune-invariants.mts
 */
import { readFileSync } from "node:fs";
import { applyDrivetrainConversion } from "../src/lib/drivetrainSwap.ts";
import { buildGameLimits, clampNumber } from "../src/lib/gameLimits.ts";
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

console.log("check-tune-invariants: ok");
