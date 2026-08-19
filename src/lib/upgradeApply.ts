/** Apply upgrade packages to tune-relevant numbers. */

import {
  AERO_PACKAGES,
  BRAKE_PACKAGES,
  CHASSIS_PACKAGES,
  CLASS_PI_BANDS,
  POWER_STAGES,
  TIRE_PACKAGES,
  TRANS_PACKAGES,
  WEIGHT_PACKAGES,
  classForPi,
  findPackage,
  type AeroPackageId,
  type BrakePackageId,
  type ChassisPackageId,
  type PowerStageId,
  type TirePackageId,
  type TransPackageId,
  type WeightPackageId,
} from "../data/upgradePackages";
import { STOCK_DRIVETRAIN, type DriveType } from "./drivetrainSwap";

export interface UpgradeSelection {
  weightPackage?: WeightPackageId;
  chassisPackage?: ChassisPackageId;
  powerStage?: PowerStageId;
  tirePackage?: TirePackageId;
  transPackage?: TransPackageId;
  brakePackage?: BrakePackageId;
  aeroPackage?: AeroPackageId;
}

export function weightPackageDeltaLbs(
  weightId: WeightPackageId = "stock",
  chassisId: ChassisPackageId = "stock",
): number {
  const w = findPackage(WEIGHT_PACKAGES, weightId, "stock").deltaLbs;
  const c = findPackage(CHASSIS_PACKAGES, chassisId, "stock").deltaLbs;
  return w + c;
}

/** Shift curb weight when weight/chassis package changes. */
export function applyWeightPackageChange(
  currentWeightLbs: number,
  from: { weight: WeightPackageId; chassis: ChassisPackageId },
  to: { weight: WeightPackageId; chassis: ChassisPackageId },
): number {
  const delta =
    weightPackageDeltaLbs(to.weight, to.chassis) - weightPackageDeltaLbs(from.weight, from.chassis);
  return Math.max(600, Math.round(currentWeightLbs + delta));
}

export function applyPowerStage(args: {
  stage: PowerStageId;
  stockTorqueLbFt: number;
  stockRedline: number;
  stockPeak: number;
  engineSwap?: string;
}): { maxTorqueLbFt: number; redlineRpm: number; peakTorqueRpm: number } {
  const swapped = args.engineSwap && args.engineSwap !== "None (Stock)";
  if (swapped) {
    return {
      maxTorqueLbFt: args.stockTorqueLbFt,
      redlineRpm: args.stockRedline,
      peakTorqueRpm: args.stockPeak,
    };
  }
  const stage = findPackage(POWER_STAGES, args.stage, "stock");
  return {
    maxTorqueLbFt: Math.round(args.stockTorqueLbFt * stage.torqueMult),
    redlineRpm: Math.round(args.stockRedline + stage.redlineDelta),
    peakTorqueRpm: Math.round(args.stockPeak + stage.peakDelta),
  };
}

/** Parse "275/35R19" style sizes. */
export function parseTireSize(spec: string): { width: number; aspect: number; rim: number } | null {
  const m = spec.replace(/\s+/g, "").match(/^(\d{3})\/(\d{2})R(\d{2})$/i);
  if (!m) return null;
  return { width: +m[1], aspect: +m[2], rim: +m[3] };
}

export function formatTireSize(width: number, aspect: number, rim: number): string {
  return `${Math.round(width)}/${Math.round(aspect)}R${Math.round(rim)}`;
}

export function applyTirePackage(args: {
  packageId: TirePackageId;
  stockFront: string;
  stockRear: string;
}): { compound: string; tireWF: string; tireWR: string } {
  const pkg = findPackage(TIRE_PACKAGES, args.packageId, "stock");
  const f = parseTireSize(args.stockFront) ?? { width: 275, aspect: 35, rim: 19 };
  const r = parseTireSize(args.stockRear) ?? { width: 285, aspect: 35, rim: 19 };
  if (pkg.id === "stock") {
    return { compound: pkg.compound, tireWF: args.stockFront, tireWR: args.stockRear };
  }
  const fw = Math.min(355, f.width + pkg.widthDeltaMm);
  const rw = Math.min(365, r.width + pkg.widthDeltaMm + pkg.rearExtraMm);
  return {
    compound: pkg.compound,
    tireWF: formatTireSize(fw, f.aspect, f.rim),
    tireWR: formatTireSize(rw, r.aspect, r.rim),
  };
}

export function applyTransPackage(args: {
  packageId: TransPackageId;
  stockGears?: number | null;
}): { gears: number; includeGearing: boolean; fdMult: number } {
  const pkg = findPackage(TRANS_PACKAGES, args.packageId, "stock");
  return {
    gears: pkg.gears > 0 ? pkg.gears : args.stockGears && args.stockGears > 0 ? args.stockGears : 6,
    includeGearing: pkg.includeGearing,
    fdMult: pkg.fdMult,
  };
}

export function applyAeroPackage(id: AeroPackageId = "none") {
  return findPackage(AERO_PACKAGES, id, "none");
}

export function brakePackageBias(id: BrakePackageId = "street") {
  return findPackage(BRAKE_PACKAGES, id, "street");
}

/**
 * Rough PI estimator for class planning.
 * Anchored to stock PI, then deltas for power, weight, tires, aero, drivetrain.
 */
export function estimatePi(args: {
  stockPi: number;
  stockWeightLbs: number;
  currentWeightLbs: number;
  stockTorqueLbFt: number;
  currentTorqueLbFt: number;
  tirePackage?: TirePackageId;
  aeroPackage?: AeroPackageId;
  drivetrainSwap?: string;
  stockDrive?: DriveType;
  driveType?: DriveType;
  powerStage?: PowerStageId;
  engineSwap?: string;
}): number {
  let pi = args.stockPi;
  const torqueRatio =
    args.stockTorqueLbFt > 0 ? args.currentTorqueLbFt / args.stockTorqueLbFt : 1;
  pi += (torqueRatio - 1) * 140;

  const weightRatio =
    args.stockWeightLbs > 0 ? args.currentWeightLbs / args.stockWeightLbs : 1;
  pi += (1 - weightRatio) * 90;

  const tire = findPackage(TIRE_PACKAGES, args.tirePackage ?? "stock", "stock");
  const tirePts: Record<TirePackageId, number> = {
    stock: 0,
    sport: 12,
    semi: 28,
    slick: 40,
    rally: 18,
    drag: 22,
  };
  pi += tirePts[tire.id];

  const aero = findPackage(AERO_PACKAGES, args.aeroPackage ?? "none", "none");
  const aeroPts: Record<AeroPackageId, number> = {
    none: 0,
    splitter: 6,
    wing: 8,
    track: 18,
    max: 28,
  };
  pi += aeroPts[aero.id];

  if (args.drivetrainSwap && args.drivetrainSwap !== STOCK_DRIVETRAIN) {
    pi += args.driveType === "AWD" ? 18 : 10;
  }

  if (args.engineSwap && args.engineSwap !== "None (Stock)") {
    pi += 35;
  }

  return Math.max(100, Math.min(999, Math.round(pi)));
}

export interface ClassPlan {
  targetClass: string;
  targetPi: number;
  estimatedPi: number;
  weightPackage: WeightPackageId;
  chassisPackage: ChassisPackageId;
  powerStage: PowerStageId;
  tirePackage: TirePackageId;
  aeroPackage: AeroPackageId;
  note: string;
}

/**
 * Suggest a build that aims for the top of a target class (or mid-band).
 * Prefers tires + weight before heavy power when staying in-class.
 */
export function planForClass(args: {
  targetClass: string;
  stockPi: number;
  stockWeightLbs: number;
  stockTorqueLbFt: number;
  engineSwap?: string;
  drivetrainSwap?: string;
  driveType?: DriveType;
  stockDrive?: DriveType;
}): ClassPlan {
  const band = CLASS_PI_BANDS[args.targetClass] ?? CLASS_PI_BANDS.A;
  const targetPi = band.max - 8;

  const candidates: Array<{
    weightPackage: WeightPackageId;
    chassisPackage: ChassisPackageId;
    powerStage: PowerStageId;
    tirePackage: TirePackageId;
    aeroPackage: AeroPackageId;
  }> = [];

  const weights: WeightPackageId[] = ["stock", "street", "sport", "race"];
  const stages: PowerStageId[] =
    args.engineSwap && args.engineSwap !== "None (Stock)"
      ? ["stock"]
      : ["stock", "stage1", "stage2", "stage3", "race"];
  const tires: TirePackageId[] = ["stock", "sport", "semi", "slick"];
  const aeros: AeroPackageId[] = ["none", "splitter", "wing", "track"];

  for (const weightPackage of weights) {
    for (const powerStage of stages) {
      for (const tirePackage of tires) {
        for (const aeroPackage of aeros) {
          candidates.push({
            weightPackage,
            chassisPackage: "stock",
            powerStage,
            tirePackage,
            aeroPackage,
          });
        }
      }
    }
  }

  let best: ClassPlan | null = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const wDelta = weightPackageDeltaLbs(c.weightPackage, c.chassisPackage);
    const currentWeightLbs = Math.max(600, args.stockWeightLbs + wDelta);
    const power = applyPowerStage({
      stage: c.powerStage,
      stockTorqueLbFt: args.stockTorqueLbFt,
      stockRedline: 7800,
      stockPeak: 5500,
      engineSwap: args.engineSwap,
    });
    const estimatedPi = estimatePi({
      stockPi: args.stockPi,
      stockWeightLbs: args.stockWeightLbs,
      currentWeightLbs,
      stockTorqueLbFt: args.stockTorqueLbFt,
      currentTorqueLbFt: power.maxTorqueLbFt,
      tirePackage: c.tirePackage,
      aeroPackage: c.aeroPackage,
      drivetrainSwap: args.drivetrainSwap,
      driveType: args.driveType,
      stockDrive: args.stockDrive,
      powerStage: c.powerStage,
      engineSwap: args.engineSwap,
    });

    if (estimatedPi < band.min || estimatedPi > band.max) continue;
    const dist = Math.abs(estimatedPi - targetPi);
    const complexity =
      (c.weightPackage === "stock" ? 0 : 1) +
      (c.powerStage === "stock" ? 0 : 2) +
      (c.tirePackage === "stock" ? 0 : 1) +
      (c.aeroPackage === "none" ? 0 : 1);

    if (dist + complexity * 0.5 < bestDist) {
      bestDist = dist + complexity * 0.5;
      best = {
        targetClass: args.targetClass,
        targetPi,
        estimatedPi,
        ...c,
        note: `Aims ~${estimatedPi} PI in ${args.targetClass} (band ${band.min}–${band.max}).`,
      };
    }
  }

  if (best) return best;

  // Fallback: lightest build toward the band.
  return {
    targetClass: args.targetClass,
    targetPi,
    estimatedPi: args.stockPi,
    weightPackage: "street",
    chassisPackage: "stock",
    powerStage: "stock",
    tirePackage: "sport",
    aeroPackage: "none",
    note: `No combo stayed in ${args.targetClass} from stock ${args.stockPi} PI — apply a light street build and trim in-game.`,
  };
}

export function classForEstimatedPi(pi: number): string {
  return classForPi(pi);
}

export { brakePackageBias as getBrakePackage, findPackage };
