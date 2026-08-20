/**
 * Race builds list the FH6 upgrade parts you have to buy.
 * Usage: node --experimental-strip-types scripts/check-build-parts.mts
 */
import { readFileSync } from "node:fs";
import { buildPartsList, formatBuildPartsText } from "../src/lib/buildParts.ts";
import type { StarterTuneFile } from "../src/lib/makeStarterTune.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const raceInput = {
  includeGearing: true,
  engineSwap: "None (Stock)",
  drivetrainSwap: "None (Stock)",
  weightPackage: "street",
  chassisPackage: "stock",
  powerStage: "stock",
  tirePackage: "semi",
  transPackage: "race",
  brakePackage: "race",
  aeroPackage: "none",
  compound: "Race Semi-Slick",
  tireWF: "225/55R16",
  tireWR: "235/55R16",
};

const race = buildPartsList(raceInput);
const slots = new Map(race.groups.flatMap((g) => g.items.map((i) => [i.slot, i.part])));

if (slots.get("Springs") !== "Race") fail("needs Race springs");
if (slots.get("Dampers") !== "Race") fail("needs Race dampers");
if (slots.get("Anti-roll Bars") !== "Race") fail("needs Race ARBs");
if (slots.get("Transmission") !== "Race") fail("needs Race trans");
if (slots.get("Clutch") !== "Race") fail("needs Race clutch");
if (slots.get("Differential") !== "Race") fail("needs Race diff");
if (slots.get("Brakes") !== "Race") fail("needs Race brakes");
if (slots.get("Alignment") !== "Race") fail("needs Race alignment");
if (!String(slots.get("Weight Reduction")).startsWith("Street")) fail("needs Street WR");
if (slots.get("Engine upgrades") !== "Leave stock") fail("engine should stay stock");
if (slots.get("Compound") !== "Race Semi-Slick") fail("semi-slick compound");
if (race.groups.some((g) => g.menu === "Aero and Appearance")) fail("no aero when package is none");

const text = formatBuildPartsText(raceInput);
if (!text.includes("Parts to buy")) fail("copy text missing Parts to buy");
if (!text.includes("Buy these in Upgrades first")) fail("copy text missing buy hint");

const aero = buildPartsList({
  tirePackage: "semi",
  transPackage: "race",
  brakePackage: "race",
  weightPackage: "street",
  aeroPackage: "track",
  includeGearing: true,
});
const aeroSlots = new Map(aero.groups.flatMap((g) => g.items.map((i) => [i.slot, i.part])));
if (!aero.groups.some((g) => g.menu === "Aero and Appearance")) fail("track aero missing bumper/wing");
if (!aeroSlots.has("Front Bumper")) fail("track aero missing front bumper");
if (!aeroSlots.has("Rear Wing")) fail("track aero missing rear wing");

const starters = JSON.parse(
  readFileSync(new URL("../public/starterTunes.json", import.meta.url), "utf8"),
) as StarterTuneFile;
const n600 = starters.tunes.find((t) => t.slug === "honda-n600-1970");
if (!n600) fail("N600 starter missing");
const fromStarter = buildPartsList(n600.config);
const starterSlots = new Map(fromStarter.groups.flatMap((g) => g.items.map((i) => [i.slot, i.part])));
if (starterSlots.get("Springs") !== "Race") fail("N600 starter needs Race springs");
if (starterSlots.get("Transmission") !== "Race") fail("N600 starter needs Race trans");
if (starterSlots.get("Engine upgrades") !== "Leave stock") fail("N600 starter should leave engine stock");

console.log("check-build-parts: ok");
