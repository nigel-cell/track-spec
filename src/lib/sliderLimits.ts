/** Per-car spring / aero / ride slider limits + local overrides. */

import { assetUrl } from "./assetUrl";
import {
  convertSpringValue,
  estimateSpringLimitsLbs,
  sliderPercent,
  type SpringLimits,
} from "./gameLimits";
import type { CalcTuneUnits } from "./calcTune";

export { sliderPercent };

export interface AeroLimits {
  frontMin: number;
  frontMax: number | null;
  rearMin: number;
  rearMax: number | null;
  unit: "kg";
}

export interface RideLimits {
  frontMin: number;
  frontMax: number;
  rearMin: number;
  rearMax: number;
}

export interface CarSliderLimits {
  make: string;
  model: string;
  year?: string | null;
  weightLbs: number;
  weightDist: number;
  drive?: string;
  carClass?: string | null;
  source: "estimated" | "user" | "measured";
  springs?: SpringLimits;
  ride?: RideLimits;
  aero?: AeroLimits | null;
}

export interface SliderLimitsFile {
  version: number;
  generatedAt: string;
  source: string;
  unitSprings: string;
  count: number;
  cars: Record<string, CarSliderLimits>;
}

const OVERRIDE_KEY = "ts_v1_slider_limits";

let fileCache: SliderLimitsFile | null = null;
let loadPromise: Promise<SliderLimitsFile | null> | null = null;

export async function loadSliderLimitsFile(): Promise<SliderLimitsFile | null> {
  if (fileCache) return fileCache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const url = assetUrl("./carSliderLimits.json");
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      fileCache = (await res.json()) as SliderLimitsFile;
      return fileCache;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function carLimitsKey(make: string, model: string): string {
  return `${make} ${model.split(" '")[0]}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readOverrides(): Record<string, Partial<CarSliderLimits>> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: Record<string, Partial<CarSliderLimits>>) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** Persist user-entered spring / ride / aero limits for a car. */
export function saveUserSliderLimits(
  make: string,
  model: string,
  patch: {
    springs?: Partial<SpringLimits>;
    ride?: Partial<RideLimits>;
    aero?: Partial<AeroLimits> | null;
  },
): void {
  const key = carLimitsKey(make, model);
  const all = readOverrides();
  const prev = all[key] ?? { make, model, source: "user" as const };
  all[key] = {
    ...prev,
    make,
    model,
    source: "user",
    springs: patch.springs
      ? ({ ...(prev.springs as SpringLimits | undefined), ...patch.springs } as SpringLimits)
      : prev.springs,
    ride: patch.ride
      ? ({ ...(prev.ride as RideLimits | undefined), ...patch.ride } as RideLimits)
      : prev.ride,
    aero:
      patch.aero === undefined
        ? prev.aero
        : patch.aero
          ? ({ ...(prev.aero as AeroLimits | undefined), ...patch.aero } as AeroLimits)
          : null,
  };
  writeOverrides(all);
}

export function findSliderLimits(
  file: SliderLimitsFile | null,
  make: string,
  model: string,
): CarSliderLimits | null {
  const key = carLimitsKey(make, model);
  const overrides = readOverrides();
  const user = overrides[key];

  let base: CarSliderLimits | null = null;
  if (file?.cars) {
    if (file.cars[key]) base = file.cars[key];
    else {
      const target = norm(`${make} ${model.split(" '")[0]}`);
      let best: CarSliderLimits | null = null;
      let bestLen = 0;
      for (const car of Object.values(file.cars)) {
        const title = norm(`${car.make} ${car.model}`);
        if (title === target) {
          best = car;
          break;
        }
        if ((target.includes(title) || title.includes(target)) && title.length > bestLen) {
          best = car;
          bestLen = title.length;
        }
      }
      base = best;
    }
  }

  if (!base && !user) return null;
  if (!base) {
    return {
      make,
      model,
      weightLbs: 0,
      weightDist: 50,
      source: "user",
      springs: {
        unit: "lbs/in",
        frontMin: user!.springs?.frontMin ?? 0,
        frontMax: user!.springs?.frontMax ?? 0,
        rearMin: user!.springs?.rearMin ?? 0,
        rearMax: user!.springs?.rearMax ?? 0,
      },
      ride: (user!.ride as RideLimits | undefined) ?? undefined,
      aero: (user!.aero as AeroLimits | null | undefined) ?? null,
    };
  }

  const springs = {
    ...(base.springs ?? {
      unit: "lbs/in" as const,
      frontMin: 0,
      frontMax: 0,
      rearMin: 0,
      rearMax: 0,
    }),
    ...(user?.springs ?? {}),
    unit:
      (user?.springs?.unit as SpringLimits["unit"]) ??
      base.springs?.unit ??
      ("lbs/in" as const),
  };

  return {
    ...base,
    source: user?.springs || user?.ride ? "user" : base.source,
    springs,
    ride: user?.ride
      ? ({ ...(base.ride ?? {}), ...user.ride } as RideLimits)
      : base.ride,
    aero: user?.aero !== undefined ? (user.aero as AeroLimits | null) : base.aero,
  };
}

/** Resolve spring limits in the active display unit for calcTune. */
export function springsForCalc(
  limits: CarSliderLimits | null,
  weightLbs: number,
  weightDist: number,
  units: CalcTuneUnits,
): SpringLimits {
  const est = estimateSpringLimitsLbs(weightLbs, weightDist);
  const src = limits?.springs;
  const srcUnit = src?.unit ?? "lbs/in";
  const pick = (estLbs: number, override?: number) => {
    const v =
      override != null
        ? convertSpringValue(override, srcUnit, units.springs)
        : convertSpringValue(estLbs, "lbs/in", units.springs);
    return units.springs === "kgf/mm" ? +v.toFixed(2) : +v.toFixed(1);
  };
  return {
    unit: units.springs,
    frontMin: pick(est.frontMin, src?.frontMin),
    frontMax: pick(est.frontMax, src?.frontMax),
    rearMin: pick(est.rearMin, src?.rearMin),
    rearMax: pick(est.rearMax, src?.rearMax),
  };
}

export function formatSliderPct(pct: number | undefined): string | undefined {
  if (pct == null) return undefined;
  return `${pct}%`;
}
