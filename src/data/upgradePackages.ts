/** FH6-style upgrade packages that feed Manual tune inputs. */

export type WeightPackageId = "stock" | "street" | "sport" | "race";
export type ChassisPackageId = "stock" | "braced" | "cage";
export type PowerStageId = "stock" | "stage1" | "stage2" | "stage3" | "race";
export type TirePackageId = "stock" | "sport" | "semi" | "slick" | "rally" | "drag";
export type TransPackageId = "stock" | "sport" | "race" | "sequential";
export type BrakePackageId = "stock" | "street" | "sport" | "race" | "carbon";
export type AeroPackageId = "none" | "splitter" | "wing" | "track" | "max";

export interface PackageOption<T extends string> {
  id: T;
  label: string;
  desc: string;
}

/** Curb-weight delta vs un-stripped chassis (lb). */
export const WEIGHT_PACKAGES: (PackageOption<WeightPackageId> & { deltaLbs: number })[] = [
  { id: "stock", label: "Stock weight", desc: "OEM curb weight", deltaLbs: 0 },
  { id: "street", label: "Street strip", desc: "Spare, tools, light interior", deltaLbs: -80 },
  { id: "sport", label: "Sport lightening", desc: "Seats, battery, glass trim", deltaLbs: -160 },
  { id: "race", label: "Race weight", desc: "Full strip + polycarb", deltaLbs: -240 },
];

/** Chassis reinforcement adds mass back (lb). */
export const CHASSIS_PACKAGES: (PackageOption<ChassisPackageId> & { deltaLbs: number })[] = [
  { id: "stock", label: "Stock chassis", desc: "No reinforcement", deltaLbs: 0 },
  { id: "braced", label: "Chassis brace", desc: "Strut / underbody brace", deltaLbs: 25 },
  { id: "cage", label: "Roll cage", desc: "Half / full cage", deltaLbs: 55 },
];

/** Power path for the stock engine (ignored when an engine swap is active). */
export const POWER_STAGES: (PackageOption<PowerStageId> & {
  torqueMult: number;
  redlineDelta: number;
  peakDelta: number;
})[] = [
  { id: "stock", label: "Stock power", desc: "OEM engine output", torqueMult: 1, redlineDelta: 0, peakDelta: 0 },
  { id: "stage1", label: "Stage 1", desc: "Intake, exhaust, tune", torqueMult: 1.08, redlineDelta: 0, peakDelta: 0 },
  { id: "stage2", label: "Stage 2", desc: "+ cams / headers", torqueMult: 1.18, redlineDelta: 100, peakDelta: 50 },
  { id: "stage3", label: "Stage 3", desc: "+ forced induction path", torqueMult: 1.32, redlineDelta: 200, peakDelta: 0 },
  { id: "race", label: "Race internals", desc: "Forged / race ECU", torqueMult: 1.48, redlineDelta: 400, peakDelta: 100 },
];

export const TIRE_PACKAGES: (PackageOption<TirePackageId> & {
  compound: string;
  widthDeltaMm: number;
  rearExtraMm: number;
})[] = [
  { id: "stock", label: "Stock tires", desc: "OEM compound & width", compound: "Stock", widthDeltaMm: 0, rearExtraMm: 0 },
  { id: "sport", label: "Sport tires", desc: "Street performance", compound: "Sport", widthDeltaMm: 10, rearExtraMm: 0 },
  { id: "semi", label: "Semi-slick", desc: "Race Semi-Slick + wider", compound: "Race Semi-Slick", widthDeltaMm: 20, rearExtraMm: 10 },
  { id: "slick", label: "Slicks", desc: "Race Slick max width", compound: "Race Slick", widthDeltaMm: 30, rearExtraMm: 10 },
  { id: "rally", label: "Rally tires", desc: "Gravel / dirt", compound: "Rally", widthDeltaMm: 0, rearExtraMm: 0 },
  { id: "drag", label: "Drag radials", desc: "Staggered rear bias", compound: "Drag", widthDeltaMm: 0, rearExtraMm: 40 },
];

export const TRANS_PACKAGES: (PackageOption<TransPackageId> & {
  gears: number;
  includeGearing: boolean;
  fdMult: number;
})[] = [
  { id: "stock", label: "Stock gearbox", desc: "OEM ratios", gears: 0, includeGearing: false, fdMult: 1 },
  { id: "sport", label: "Sport transmission", desc: "Closer street ratios", gears: 6, includeGearing: true, fdMult: 1.02 },
  { id: "race", label: "Race transmission", desc: "Full custom ratios", gears: 6, includeGearing: true, fdMult: 1.05 },
  { id: "sequential", label: "Sequential", desc: "Dog-box spacing", gears: 6, includeGearing: true, fdMult: 1.08 },
];

/** Brake pressure / balance bias vs baseline calc. */
export const BRAKE_PACKAGES: (PackageOption<BrakePackageId> & {
  pressureDelta: number;
  balDelta: number;
})[] = [
  { id: "stock", label: "Stock brakes", desc: "OEM pads & rotors", pressureDelta: -5, balDelta: 0 },
  { id: "street", label: "Street brakes", desc: "Upgraded pads", pressureDelta: 0, balDelta: 0 },
  { id: "sport", label: "Sport brakes", desc: "Larger rotors", pressureDelta: 5, balDelta: 0 },
  { id: "race", label: "Race brakes", desc: "Big brake kit", pressureDelta: 10, balDelta: -1 },
  { id: "carbon", label: "Carbon ceramics", desc: "Max bite & fade resistance", pressureDelta: 15, balDelta: -2 },
];

/** Aero part presets → downforce kg + Cd (game-ish ranges). */
export const AERO_PACKAGES: (PackageOption<AeroPackageId> & {
  hasAero: boolean;
  aeroF: number;
  aeroR: number;
  dragCd: number;
})[] = [
  { id: "none", label: "No aero", desc: "Stock body", hasAero: false, aeroF: 0, aeroR: 0, dragCd: 0.32 },
  { id: "splitter", label: "Front splitter", desc: "Front bumper / lip", hasAero: true, aeroF: 45, aeroR: 15, dragCd: 0.33 },
  { id: "wing", label: "Rear wing", desc: "Wing only", hasAero: true, aeroF: 15, aeroR: 70, dragCd: 0.34 },
  { id: "track", label: "Track aero", desc: "Splitter + wing", hasAero: true, aeroF: 70, aeroR: 110, dragCd: 0.36 },
  { id: "max", label: "Max downforce", desc: "Full aero kit", hasAero: true, aeroF: 110, aeroR: 160, dragCd: 0.4 },
];

export function findPackage<T extends string, P extends PackageOption<T>>(
  list: P[],
  id: T | undefined,
  fallback: T,
): P {
  return list.find((p) => p.id === id) ?? list.find((p) => p.id === fallback)!;
}

/** Rough PI class bands used by the class builder. */
export const CLASS_PI_BANDS: Record<string, { min: number; max: number }> = {
  D: { min: 100, max: 300 },
  C: { min: 301, max: 400 },
  B: { min: 401, max: 500 },
  A: { min: 501, max: 600 },
  S1: { min: 601, max: 700 },
  S2: { min: 701, max: 800 },
  R: { min: 801, max: 900 },
  X: { min: 901, max: 999 },
};

export function classForPi(pi: number): string {
  for (const [cls, band] of Object.entries(CLASS_PI_BANDS)) {
    if (pi >= band.min && pi <= band.max) return cls;
  }
  return pi > 900 ? "X" : "D";
}
