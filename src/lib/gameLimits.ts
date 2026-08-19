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

export interface AeroGameLimits {
  frontMin: number;
  frontMax: number | null;
  rearMin: number;
  rearMax: number | null;
}

export interface RideGameLimits {
  frontMin: number;
  frontMax: number;
  rearMin: number;
  rearMax: number;
}

export interface GameLimits {
  arb: { min: number; max: number };
  damping: { min: number; max: number };
  camber: { min: number; max: number }; // more negative = min
  toe: { min: number; max: number };
  caster: { min: number; max: number };
  rideCm: RideGameLimits;
  brakeBal: { min: number; max: number };
  brakePressure: { min: number; max: number };
  diff: { min: number; max: number };
  tirePsi: { min: number; max: number };
  tireBar: { min: number; max: number };
  finalDrive: { min: number; max: number };
  gearRatio: { min: number; max: number };
  springs: SpringLimits;
  aero: AeroGameLimits;
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
 * Calibrated to community min/max examples (~0.07×W – ~0.41×W lbs/in).
 * Per-car ranges vary — override with in-game min/max or carSliderLimits.json.
 */
export function estimateSpringLimitsLbs(
  weightLbs: number,
  weightDist = 50,
): Omit<SpringLimits, "unit"> {
  const w = Math.max(1200, Math.min(7000, weightLbs));
  const frontBias = Math.max(0.4, Math.min(0.6, weightDist / 100));
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

export function buildGameLimits(args: {
  weightLbs: number;
  weightDist: number;
  units: CalcTuneUnits;
  springLimits?: Partial<SpringLimits> | null;
  aeroLimits?: Partial<AeroGameLimits> | null;
  rideLimits?: Partial<RideGameLimits> | null;
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

  // Default ride envelope; per-car Soft/High ends override when measured.
  const defRideMin = args.offRoad ? 18 : 11.2;
  const defRideMax = args.offRoad ? 34 : 26;
  const ride: RideGameLimits = {
    frontMin: args.rideLimits?.frontMin ?? defRideMin,
    frontMax: args.rideLimits?.frontMax ?? defRideMax,
    rearMin: args.rideLimits?.rearMin ?? defRideMin,
    rearMax: args.rideLimits?.rearMax ?? defRideMax,
  };
  for (const side of ["front", "rear"] as const) {
    const lo = `${side}Min` as const;
    const hi = `${side}Max` as const;
    if (ride[lo] > ride[hi]) {
      const t = ride[lo];
      ride[lo] = ride[hi];
      ride[hi] = t;
    }
  }

  return {
    // Confirmed Soft/Stiff ends from FH6 gameplay sweeps (GR86 + 430 Scuderia).
    arb: { min: 1, max: 65 },
    damping: { min: 1, max: 20 },
    camber: { min: -5, max: 0 },
    toe: { min: -1, max: 1 },
    caster: { min: args.offRoad ? 1.5 : 5.0, max: 7.0 },
    rideCm: ride,
    brakeBal: { min: 0, max: 100 },
    brakePressure: { min: 0, max: 200 },
    diff: { min: 0, max: 100 },
    // Tire pressure: 1.0–3.8 bar confirmed in-game (≈14.5–55.1 psi).
    tirePsi: { min: 14.5, max: 55.1 },
    tireBar: { min: 1.0, max: 3.8 },
    finalDrive: { min: 2.2, max: 6.1 },
    gearRatio: { min: 0.5, max: 6.0 },
    springs,
    aero: {
      frontMin: args.aeroLimits?.frontMin ?? 0,
      frontMax: args.aeroLimits?.frontMax ?? null,
      rearMin: args.aeroLimits?.rearMin ?? 0,
      rearMax: args.aeroLimits?.rearMax ?? null,
    },
  };
}

/** 0–100 position on a min→max slider. */
export function sliderPercent(value: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(((value - min) / (max - min)) * 100)));
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
