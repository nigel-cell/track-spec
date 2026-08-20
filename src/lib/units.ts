import type { CalcTuneUnits } from "./calcTune";

export type TuneUnits = CalcTuneUnits;

export const IMPERIAL_UNITS: TuneUnits = {
  weight: "lbs",
  springs: "lbs/in",
  pressure: "psi",
  speed: "mph",
};

export const METRIC_UNITS: TuneUnits = {
  weight: "kg",
  springs: "kgf/mm",
  pressure: "bar",
  speed: "kmh",
};

const STORAGE_KEY = "tl_v1_units";

export function isMetric(units: TuneUnits): boolean {
  return units.weight === "kg";
}

export function normalizeUnits(raw: Partial<TuneUnits> | null | undefined): TuneUnits {
  const speed = raw?.speed === "km/h" || raw?.speed === "kmh" ? "kmh" : "mph";
  const weight = raw?.weight === "kg" ? "kg" : "lbs";
  const springs =
    raw?.springs === "lbs/in"
      ? "lbs/in"
      : "kgf/mm";
  const pressure = raw?.pressure === "bar" ? "bar" : "psi";
  return { weight, springs, pressure, speed };
}

export function loadUnits(): TuneUnits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return IMPERIAL_UNITS;
    return normalizeUnits(JSON.parse(raw) as Partial<TuneUnits>);
  } catch {
    return IMPERIAL_UNITS;
  }
}

export function saveUnits(units: TuneUnits): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  } catch {
    /* ignore quota errors */
  }
}

export function weightLabel(units: TuneUnits): string {
  return units.weight === "kg" ? "kg" : "lbs";
}

export function speedLabel(units: TuneUnits): string {
  return units.speed === "kmh" ? "km/h" : "mph";
}

export function torqueLabel(units: TuneUnits): string {
  return units.weight === "kg" ? "Nm" : "lb-ft";
}

export function defaultWeight(units: TuneUnits, lbs = 3980): number {
  return units.weight === "kg" ? Math.round(lbs / 2.205) : lbs;
}

export function defaultTopSpeed(units: TuneUnits, mph = 180): number {
  return units.speed === "kmh" ? Math.round(mph * 1.609) : mph;
}

export function defaultMaxTorque(units: TuneUnits, lbFt = 500): number {
  return units.weight === "kg" ? Math.round(lbFt * 1.356) : lbFt;
}

export function convertWeight(value: number, from: TuneUnits["weight"], to: TuneUnits["weight"]): number {
  if (from === to) return value;
  return to === "kg" ? Math.round(value / 2.205) : Math.round(value * 2.205);
}

export function convertSpeed(value: number, from: TuneUnits["speed"], to: TuneUnits["speed"]): number {
  if (from === to) return value;
  return to === "kmh" ? Math.round(value * 1.609) : Math.round(value / 1.609);
}

export function convertTorque(value: number, from: TuneUnits["weight"], to: TuneUnits["weight"]): number {
  if (from === to) return value;
  return to === "kg" ? Math.round(value * 1.356) : Math.round(value / 1.356);
}

/** Convert stored imperial garage/db values into the user's display units. */
export function weightFromLbs(lbs: number, units: TuneUnits): number {
  return units.weight === "kg" ? Math.round(lbs / 2.205) : Math.round(lbs);
}

export function weightFromKg(kg: number, units: TuneUnits): number {
  return units.weight === "kg" ? Math.round(kg) : Math.round(kg * 2.205);
}

export function speedFromMph(mph: number, units: TuneUnits): number {
  return units.speed === "kmh" ? Math.round(mph * 1.609) : Math.round(mph);
}

/** Convert telemetry km/h into the user's display units. */
export function speedFromKmh(kmh: number, units: TuneUnits): number {
  return units.speed === "kmh" ? Math.round(kmh) : Math.round(kmh / 1.609);
}

export function formatSpeedKmh(kmh: number | null | undefined, units: TuneUnits): string {
  if (kmh == null || !Number.isFinite(kmh) || kmh <= 0) return "—";
  return `${speedFromKmh(kmh, units)} ${speedLabel(units)}`;
}

export function torqueFromLbFt(lbFt: number, units: TuneUnits): number {
  return units.weight === "kg" ? Math.round(lbFt * 1.356) : Math.round(lbFt);
}

export function convertValuesForUnits(
  values: {
    weight?: number;
    topspeed?: number;
    maxTorque?: number;
  },
  from: TuneUnits,
  to: TuneUnits,
): typeof values {
  const out = { ...values };
  if (out.weight != null) out.weight = convertWeight(out.weight, from.weight, to.weight);
  if (out.topspeed != null) out.topspeed = convertSpeed(out.topspeed, from.speed, to.speed);
  if (out.maxTorque != null) out.maxTorque = convertTorque(out.maxTorque, from.weight, to.weight);
  return out;
}

/** Prefer units stored on a tune config; fall back to app preference. */
export function resolveTuneUnits(
  configUnits?: Partial<TuneUnits> | null,
  appUnits?: TuneUnits,
): TuneUnits {
  if (configUnits) return normalizeUnits(configUnits);
  return appUnits ?? IMPERIAL_UNITS;
}
