/** Maps Forza Garage scraped specs → TuneConfig fields */

import { findCarRecord, type CarRecord } from "../hooks/useCarDatabase";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import {
  IMPERIAL_UNITS,
  garageWeightLabel,
  powerFromHp,
  powerLabel,
  speedFromMph,
  speedLabel,
  torqueFromLbFt,
  torqueLabel,
  weightFromKg,
  weightFromLbs,
  type TuneUnits,
} from "./units";
import { findGarageCar, type ForzaGarageCar } from "./forzaGarage";
import { aspirationFromGarage } from "../data/engineData";

const WEIGHT_DIST: Record<string, number> = { FWD: 63, RWD: 47, AWD: 53 };

const COMPOUND_MAP: Record<string, string> = {
  "Semi-Slick": "Race Semi-Slick",
  Slick: "Race Slick",
  Sport: "Sport",
  Street: "Street",
  Offroad: "Offroad",
  Rally: "Rally",
  Drag: "Drag",
};

function mapCompound(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  for (const [k, v] of Object.entries(COMPOUND_MAP)) {
    if (raw.includes(k)) return v;
  }
  return undefined;
}

function displayModel(car: ForzaGarageCar): string {
  return car.year ? `${car.model} '${car.year.slice(-2)}` : car.model;
}

/** Normalize tire size from garage (e.g. "365/41 R18" → "365/41R18"). */
export function normalizeTireSize(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\s+/g, "").replace(/\s*R/i, "R");
}

/** Build tune input from garage record + optional cars.json match for fd/gears */
export function tuneDraftFromGarage(
  garage: ForzaGarageCar,
  cars: CarRecord[] = [],
  units: TuneUnits = IMPERIAL_UNITS,
): Partial<TuneConfig> {
  const ts = garage.tuneSpecs;
  const drive = (ts?.driveType ?? garage.drive ?? "AWD") as TuneConfig["driveType"];

  const draft: Partial<TuneConfig> = {
    make: garage.make,
    model: displayModel(garage),
    driveType: drive,
    weight:
      ts?.weightLbs != null
        ? weightFromLbs(ts.weightLbs, units)
        : garage.weightLbs != null
          ? weightFromLbs(garage.weightLbs, units)
          : undefined,
    weightDist: ts?.weightDist ?? WEIGHT_DIST[drive] ?? 53,
    pi: garage.pi ?? undefined,
    carClass: garage.class ?? undefined,
    topspeed:
      ts?.topspeedMph != null
        ? speedFromMph(ts.topspeedMph, units)
        : garage.topSpeedMph != null
          ? speedFromMph(garage.topSpeedMph, units)
          : undefined,
    redlineRpm: ts?.redlineRpm ?? undefined,
    peakTorqueRpm: ts?.peakTorqueRpm ?? undefined,
    maxTorque: ts?.maxTorqueLbFt != null ? torqueFromLbFt(ts.maxTorqueLbFt, units) : undefined,
    gears: ts?.gears ?? undefined,
    hasAero: ts?.hasAero ?? false,
    aeroF: ts?.downforceFront ?? undefined,
    aeroR: ts?.downforceRear ?? undefined,
    compound: mapCompound(ts?.stockCompound),
    tireWF: normalizeTireSize(ts?.tireFront),
    tireWR: normalizeTireSize(ts?.tireRear),
    mode: "full",
    includeGearing: true,
    aspiration: aspirationFromGarage(ts?.aspiration),
    inputDevice: "controller",
  };

  const db = findCarRecord(cars, garage.make, garage.model);
  if (db) {
    if (db.fd) draft.stockFd = db.fd;
    if (db.gears?.length) draft.stockGears = db.gears;
    if (db.weight && !draft.weight) draft.weight = weightFromKg(db.weight, units);
    if (db.pi && !draft.pi) draft.pi = db.pi;
    if (db.cls && !draft.carClass) draft.carClass = db.cls;
    if (db.gears?.length && !draft.gears) draft.gears = db.gears.length;
  }

  return draft;
}

export function findGarageForTune(
  garageCars: ForzaGarageCar[],
  make: string,
  model: string,
): ForzaGarageCar | null {
  return findGarageCar(garageCars, make, model);
}

export function mergeGarageIntoDraft(
  draft: Partial<TuneConfig>,
  garage: ForzaGarageCar | null,
  cars: CarRecord[] = [],
  units: TuneUnits = IMPERIAL_UNITS,
): Partial<TuneConfig> {
  if (!garage) return draft;
  return { ...tuneDraftFromGarage(garage, cars, units), ...draft };
}

/** Human-readable spec groups for Garage detail UI */
export function specGroups(
  garage: ForzaGarageCar,
  units: TuneUnits = IMPERIAL_UNITS,
): { label: string; rows: { k: string; v: string }[] }[] {
  const ts = garage.tuneSpecs;
  const groups: { label: string; rows: { k: string; v: string }[] }[] = [];

  const perf: { k: string; v: string }[] = [];
  if (garage.class && garage.pi) perf.push({ k: "Class / PI", v: `${garage.class} ${garage.pi}` });
  if (garage.stats) {
    for (const [k, v] of Object.entries(garage.stats)) {
      perf.push({ k: k, v: String(v) });
    }
  }
  if (perf.length) groups.push({ label: "In-game ratings", rows: perf });

  const drive: { k: string; v: string }[] = [];
  if (ts?.driveType ?? garage.drive) drive.push({ k: "Drivetrain", v: ts?.driveType ?? garage.drive ?? "—" });
  if (ts?.gears) drive.push({ k: "Gears", v: String(ts.gears) });
  if (ts?.enginePlacement) drive.push({ k: "Engine", v: ts.enginePlacement });
  if (ts?.aspiration) drive.push({ k: "Aspiration", v: ts.aspiration });
  if (ts?.engineConfig) drive.push({ k: "Layout", v: ts.engineConfig });
  if (drive.length) groups.push({ label: "Drivetrain", rows: drive });

  const engine: { k: string; v: string }[] = [];
  const powerHp = ts?.powerHp ?? garage.powerHp;
  if (powerHp != null) engine.push({ k: "Power", v: `${powerFromHp(powerHp, units).toLocaleString()} ${powerLabel(units)}` });
  const torqueLbFt = ts?.maxTorqueLbFt ?? garage.torqueLbFt;
  if (torqueLbFt != null) engine.push({ k: "Torque", v: `${torqueFromLbFt(torqueLbFt, units).toLocaleString()} ${torqueLabel(units)}` });
  if (ts?.displacementCc) engine.push({ k: "Displacement", v: `${ts.displacementCc.toLocaleString()} cc` });
  if (ts?.redlineRpm) engine.push({ k: "Redline", v: `${ts.redlineRpm.toLocaleString()} rpm` });
  if (ts?.peakTorqueRpm) engine.push({ k: "Peak torque RPM", v: `${ts.peakTorqueRpm.toLocaleString()} rpm` });
  const topspeedMph = ts?.topspeedMph ?? garage.topSpeedMph;
  if (topspeedMph != null)
    engine.push({ k: "Top speed", v: `${speedFromMph(topspeedMph, units).toLocaleString()} ${speedLabel(units)}` });
  if (engine.length) groups.push({ label: "Engine", rows: engine });

  const chassis: { k: string; v: string }[] = [];
  const weightLbs = ts?.weightLbs ?? garage.weightLbs;
  if (weightLbs != null)
    chassis.push({ k: "Weight", v: `${weightFromLbs(weightLbs, units).toLocaleString()} ${garageWeightLabel(units)}` });
  if (ts?.weightDist) chassis.push({ k: "Weight dist (front)", v: `${ts.weightDist}%` });
  if (chassis.length) groups.push({ label: "Weight & balance", rows: chassis });

  const tires: { k: string; v: string }[] = [];
  if (ts?.stockCompound) tires.push({ k: "Stock compound", v: ts.stockCompound });
  if (ts?.tireFront) tires.push({ k: "Front tire", v: ts.tireFront });
  if (ts?.tireRear) tires.push({ k: "Rear tire", v: ts.tireRear });
  if (tires.length) groups.push({ label: "Tires", rows: tires });

  if (ts?.hasAero) {
    groups.push({
      label: "Aero",
      rows: [
        { k: "Front DF", v: String(ts.downforceFront ?? "—") },
        { k: "Rear DF", v: String(ts.downforceRear ?? "—") },
      ],
    });
  }

  return groups;
}
