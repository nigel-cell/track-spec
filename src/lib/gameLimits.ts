/** FH6 in-game slider bounds. Springs are per-car; others are universal (or near-universal). */

import type { CalcTuneUnits } from "./calcTune";

export interface SpringLimits {
  frontMin: number;
  frontMax: number;
  rearMin: number;
  rearMax: number;
  /** Unit the numbers are expressed in. */
  unit: CalcTuneUnits["springs"];
}

export interface GameLimits {
  arb: { min: number; max: number };
  damping: { min: number; max: number };
  camber: { min: number; max: number }; // more negative = min
  toe: { min: number; max: number };
  caster: { min: number; max: number };
  rideCm: { min: number; max: number };
  brakeBal: { min: number; max: number };
  brakePressure: { min: number; max: number };
  diff: { min: number; max: number };
  tirePsi: { min: number; max: number };
  tireBar: { min: number; max: number };
  finalDrive: { min: number; max: number };
  gearRatio: { min: number; max: number };
  springs: SpringLimits;
}

/** Convert true lbs/in ↔ game display spring units (same factors as calcTune). */
export function convertSpringValue(
  value: number,
  from: CalcTuneUnits["springs"],
  to: CalcTuneUnits["springs"],
): number {
  if (from === to) return value;
  // Normalize to lbs/in first.
  let lbsIn = value;
  if (from === "n/mm") lbsIn = value / 1.75127;
  else if (from === "kgf/mm") lbsIn = value / 0.17858;
  if (to === "lbs/in") return lbsIn;
  if (to === "n/mm") return lbsIn * 1.75127;
  return lbsIn * 0.17858;
}

/**
 * Estimate race-suspension spring slider range from curb weight.
 * Per-car ranges vary — override with in-game min/max when known.
 */
export function estimateSpringLimitsLbs(
  weightLbs: number,
  weightDist = 50,
): Omit<SpringLimits, "unit"> {
  const w = Math.max(1200, Math.min(7000, weightLbs));
  // Soft floor / stiff ceiling scale with mass; front gets a bit more span when nose-heavy.
  const frontBias = Math.max(0.4, Math.min(0.6, weightDist / 100));
  const baseMin = w * 0.055;
  const baseMax = w * 0.3;
  const fMin = Math.round(baseMin * (0.9 + frontBias * 0.2));
  const fMax = Math.round(baseMax * (0.95 + frontBias * 0.15));
  const rMin = Math.round(baseMin * (1.05 - frontBias * 0.2));
  const rMax = Math.round(baseMax * (1.05 - frontBias * 0.1));
  return {
    frontMin: Math.max(80, fMin),
    frontMax: Math.max(fMin + 80, fMax),
    rearMin: Math.max(80, rMin),
    rearMax: Math.max(rMin + 80, rMax),
  };
}

export function buildGameLimits(args: {
  weightLbs: number;
  weightDist: number;
  units: CalcTuneUnits;
  springLimits?: Partial<SpringLimits> | null;
  offRoad?: boolean;
}): GameLimits {
  const est = estimateSpringLimitsLbs(args.weightLbs, args.weightDist);
  const unit = args.units.springs;
  const srcUnit = args.springLimits?.unit ?? "lbs/in";

  const toDisplay = (lbsIn: number, override?: number) => {
    const v = override != null ? convertSpringValue(override, srcUnit, unit) : convertSpringValue(lbsIn, "lbs/in", unit);
    return unit === "kgf/mm" ? +v.toFixed(2) : +v.toFixed(1);
  };

  const springs: SpringLimits = {
    unit,
    frontMin: toDisplay(est.frontMin, args.springLimits?.frontMin),
    frontMax: toDisplay(est.frontMax, args.springLimits?.frontMax),
    rearMin: toDisplay(est.rearMin, args.springLimits?.rearMin),
    rearMax: toDisplay(est.rearMax, args.springLimits?.rearMax),
  };

  // Ensure min < max after conversion/overrides.
  if (springs.frontMin > springs.frontMax) {
    const t = springs.frontMin;
    springs.frontMin = springs.frontMax;
    springs.frontMax = t;
  }
  if (springs.rearMin > springs.rearMax) {
    const t = springs.rearMin;
    springs.rearMin = springs.rearMax;
    springs.rearMax = t;
  }

  return {
    arb: { min: 1, max: 65 },
    damping: { min: 1, max: 20 },
    camber: { min: -5, max: 0 },
    toe: { min: -1, max: 1 },
    caster: { min: args.offRoad ? 1.5 : 5.0, max: 7.0 },
    rideCm: { min: args.offRoad ? 18 : 15, max: args.offRoad ? 34 : 26 },
    brakeBal: { min: 1, max: 100 },
    brakePressure: { min: 1, max: 200 },
    diff: { min: 0, max: 100 },
    tirePsi: { min: 15, max: 50 },
    tireBar: { min: 1.0, max: 3.5 },
    finalDrive: { min: 2.2, max: 6.1 },
    gearRatio: { min: 0.5, max: 6.0 },
    springs,
  };
}

export type ClampHit = "min" | "max" | null;

export function clampNumber(
  value: number,
  min: number,
  max: number,
  digits = 1,
): { value: number; hit: ClampHit } {
  let hit: ClampHit = null;
  let v = value;
  if (v < min) {
    v = min;
    hit = "min";
  } else if (v > max) {
    v = max;
    hit = "max";
  }
  const factor = 10 ** digits;
  v = Math.round(v * factor) / factor;
  return { value: v, hit };
}

export function clampNote(hit: ClampHit, bound: number, unit = ""): string | undefined {
  if (!hit) return undefined;
  const u = unit ? ` ${unit}` : "";
  return hit === "max" ? `Clamped to game max (${bound}${u})` : `Clamped to game min (${bound}${u})`;
}
