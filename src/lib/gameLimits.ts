/** FH6 in-game slider bounds. Springs are per-car; others are universal (or near-universal). */

import type { CalcTuneUnits } from "./calcTune.ts";

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

/** FH6 Low (left) on the ride slider — confirmed GR86 / 430 sweeps. */
export const FH6_RIDE_LOW_CM = 11.2;

/** Dummy High ends from the old weight estimate — not real per-car stock. */
const GENERIC_RIDE_HIGH_CM = new Set([24, 26, 28, 34]);

/**
 * Stock garage downforce is the OEM figure, not the race-aero slider max.
 * FH6 race kits land near 2.45× stock (26.01 → 63.7 vs in-game 63 kgf).
 * Values already in the race band (≥ 50 kgf) are treated as a real max.
 */
export function estimateRaceAeroMaxKg(
  stockKg: number | null | undefined,
  axle: "front" | "rear",
): number {
  const fallback = axle === "front" ? 110 : 160;
  if (stockKg == null || !Number.isFinite(stockKg) || stockKg <= 0) return fallback;
  if (stockKg >= 50) return +stockKg.toFixed(1);
  return +Math.min(200, stockKg * 2.45).toFixed(1);
}

export function resolveAeroSliderMax(
  raw: number | null | undefined,
  axle: "front" | "rear",
): number {
  return estimateRaceAeroMaxKg(raw, axle);
}

/**
 * FH6 ride sliders go Low (smaller cm) → High (larger cm).
 * Estimated / mis-typed envelopes often store stock height as min (15–23 cm),
 * which is actually the High end in-game — so a 15 cm race target shows as
 * GAME MIN while the in-game slider sits on High.
 */
export function normalizeRideEnvelope(
  ride: RideGameLimits,
  offRoad = false,
): RideGameLimits {
  const floor = offRoad ? 18 : FH6_RIDE_LOW_CM;
  const fix = (lo: number, hi: number): { min: number; max: number } => {
    let min = lo;
    let max = hi;
    if (min > max) {
      const t = min;
      min = max;
      max = t;
    }
    if (!offRoad && min >= 14.5) {
      const stockHigh = min;
      if (GENERIC_RIDE_HIGH_CM.has(max) || max - min < 4) {
        max = stockHigh;
      }
      min = floor;
      max = Math.max(max, stockHigh);
    }
    if (max < min + 2) max = +(min + 4).toFixed(1);
    return { min, max };
  };
  const front = fix(ride.frontMin, ride.frontMax);
  const rear = fix(ride.rearMin, ride.rearMax);
  return {
    frontMin: front.min,
    frontMax: front.max,
    rearMin: rear.min,
    rearMax: rear.max,
  };
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

  // Default ride envelope; per-car Low/High ends override when measured.
  const defRideMin = args.offRoad ? 18 : FH6_RIDE_LOW_CM;
  const defRideMax = args.offRoad ? 34 : 26;
  const ride = normalizeRideEnvelope(
    {
      frontMin: args.rideLimits?.frontMin ?? defRideMin,
      frontMax: args.rideLimits?.frontMax ?? defRideMax,
      rearMin: args.rideLimits?.rearMin ?? defRideMin,
      rearMax: args.rideLimits?.rearMax ?? defRideMax,
    },
    args.offRoad,
  );

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
      frontMax: resolveAeroSliderMax(args.aeroLimits?.frontMax, "front"),
      rearMin: args.aeroLimits?.rearMin ?? 0,
      rearMax: resolveAeroSliderMax(args.aeroLimits?.rearMax, "rear"),
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
