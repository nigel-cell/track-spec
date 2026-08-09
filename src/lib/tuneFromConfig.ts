import { calcTune, type CalcTuneInput, type CalcTuneResult } from "./calcTune";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { TuneUnits } from "./units";
import {
  defaultMaxTorque,
  defaultTopSpeed,
  IMPERIAL_UNITS,
  resolveTuneUnits,
} from "./units";
import { applyTransPackage, brakePackageBias } from "./upgradeApply";

export function buildCalcInput(
  config: TuneConfig,
  feelBalance: number,
  feelAggression: number,
  appUnits: TuneUnits = IMPERIAL_UNITS,
): CalcTuneInput {
  const full = config.mode === "full";
  const units = resolveTuneUnits(config.units, appUnits);
  const brakes = brakePackageBias(config.brakePackage ?? "street");
  const trans = applyTransPackage({
    packageId: config.transPackage ?? "race",
    stockGears: config.gears,
  });

  const hasSpringLimits =
    config.springFrontMin != null ||
    config.springFrontMax != null ||
    config.springRearMin != null ||
    config.springRearMax != null;

  return {
    tuneId: config.tuneId,
    driveType: config.driveType,
    surface: config.surface ?? "Road",
    inputDevice: config.inputDevice ?? "controller",
    weight: config.weight,
    weightDist: config.weightDist,
    pi: config.pi,
    carClass: config.carClass,
    redlineRpm: full ? (config.redlineRpm ?? 7800) : 0,
    peakTorqueRpm: full ? (config.peakTorqueRpm ?? 5500) : 0,
    maxTorque: full ? (config.maxTorque ?? defaultMaxTorque(units)) : defaultMaxTorque(units),
    topspeed: full ? (config.topspeed ?? defaultTopSpeed(units)) : defaultTopSpeed(units),
    gears: full ? (config.gears ?? trans.gears) : 6,
    includeGearing: full && (config.includeGearing ?? trans.includeGearing),
    tireWF: config.tireWF ?? "275/35R19",
    tireWR: config.tireWR ?? "285/35R19",
    compound: config.compound ?? "Sport",
    hasAero: config.hasAero ?? false,
    aeroF: config.aeroF ?? 0,
    aeroR: config.aeroR ?? 0,
    dragCd: config.dragCd ?? 0.32,
    stockFd: config.stockFd ?? null,
    stockGears: config.stockGears ?? null,
    feelBalance,
    feelAggression,
    units,
    brakePressureDelta: brakes.pressureDelta,
    brakeBalDelta: brakes.balDelta,
    transFdMult: full ? trans.fdMult : 1,
    springLimits: hasSpringLimits
      ? {
          unit: units.springs,
          frontMin: config.springFrontMin,
          frontMax: config.springFrontMax,
          rearMin: config.springRearMin,
          rearMax: config.springRearMax,
        }
      : null,
    aeroLimits:
      config.hasAero ||
      config.aeroFrontMax != null ||
      config.aeroRearMax != null ||
      config.aeroF != null ||
      config.aeroR != null
        ? {
            frontMin: config.aeroFrontMin ?? 0,
            frontMax: config.aeroFrontMax ?? config.aeroF ?? null,
            rearMin: config.aeroRearMin ?? 0,
            rearMax: config.aeroRearMax ?? config.aeroR ?? null,
          }
        : null,
  };
}

export function computeTunePages(
  config: TuneConfig,
  feelBalance: number,
  feelAggression: number,
  appUnits: TuneUnits = IMPERIAL_UNITS,
): CalcTuneResult {
  return calcTune(buildCalcInput(config, feelBalance, feelAggression, appUnits));
}
