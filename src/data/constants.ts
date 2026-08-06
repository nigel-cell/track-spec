export interface TuneMode {
  id: string;
  code: string;
  label: string;
  sub: string;
  color: string;
}

export const TUNE_MODES: TuneMode[] = [
  { id: "Race", code: "TARMAC", label: "Track Day", sub: "Circuit & road", color: "#FF3333" },
  { id: "Touge", code: "MOUNTAIN", label: "Touge Run", sub: "Tight corners", color: "#7ecc3a" },
  { id: "Wangan", code: "HIGHWAY", label: "Wangan", sub: "High speed", color: "#00cfff" },
  { id: "Drift", code: "ANGLE", label: "Drift Session", sub: "Sideways", color: "#ff6b35" },
  { id: "Drag", code: "STRAIGHT", label: "Drag Run", sub: "Launch focus", color: "#e6b800" },
  { id: "Rally", code: "LOOSE", label: "Rally Stage", sub: "Gravel & dirt", color: "#d4a855" },
  { id: "General", code: "GENERAL", label: "All-Round", sub: "Balanced setup", color: "#8899aa" },
  { id: "Rain", code: "WET", label: "Wet Control", sub: "Rain & puddles", color: "#6ab0d4" },
];

export const DRIVE_TYPES = ["FWD", "RWD", "AWD"] as const;
export const CLASSES = ["D", "C", "B", "A", "S1", "S2", "R", "X"] as const;

export const DEFAULT_CAR = {
  make: "Nissan",
  model: "GT-R Black Edition (R35)",
  driveType: "AWD" as const,
  weight: 3980,
  weightDist: 53,
  pi: 850,
  carClass: "S1" as const,
  tuneId: "Race",
};

export interface TuneRow {
  key: string;
  value: string;
  note?: string;
}

export interface TunePageData {
  values: TuneRow[];
  tip?: string;
}

export type TunePages = Record<string, TunePageData>;

export const GTR_TUNE_PAGES: TunePages = {
  Tires: {
    values: [
      { key: "Front Pressure", value: "28.0 psi" },
      { key: "Rear Pressure", value: "27.5 psi" },
      { key: "Front Width", value: "275 mm" },
      { key: "Rear Width", value: "285 mm" },
      { key: "Compound", value: "Sport" },
    ],
    tip: "Adjust ±0.5 psi front if you feel mid-corner push.",
  },
  Gearing: {
    values: [
      { key: "Final Drive", value: "3.87" },
      { key: "1st", value: "3.98" },
      { key: "2nd", value: "2.61" },
      { key: "3rd", value: "1.89" },
      { key: "4th", value: "1.44" },
      { key: "5th", value: "1.14" },
      { key: "6th", value: "0.92" },
    ],
    tip: "Final drive is most reliable. Adjust individual ratios in-game to taste.",
  },
  Alignment: {
    values: [
      { key: "Front Camber", value: "-1.5°" },
      { key: "Rear Camber", value: "-1.0°" },
      { key: "Front Toe", value: "0.0°" },
      { key: "Rear Toe", value: "0.1°" },
      { key: "Front Caster", value: "6.2°" },
    ],
    tip: "Adjust camber in 0.2° steps — too much kills straight-line grip.",
  },
  "Antiroll Bars": {
    values: [
      { key: "Front ARB", value: "24.0" },
      { key: "Rear ARB", value: "32.0" },
    ],
    tip: "If the car snaps on entry: soften rear ARB. If it understeers: soften front ARB.",
  },
  Springs: {
    values: [
      { key: "Front Spring", value: "612 lbs/in" },
      { key: "Rear Spring", value: "598 lbs/in" },
      { key: "Front Ride Height", value: "5.9 in" },
      { key: "Rear Ride Height", value: "5.9 in" },
    ],
    tip: "Front equal to or slightly lower than rear for high-speed stability.",
  },
  Damping: {
    values: [
      { key: "Front Rebound", value: "8.2" },
      { key: "Rear Rebound", value: "8.0" },
      { key: "Front Bump", value: "5.1" },
      { key: "Rear Bump", value: "4.9" },
    ],
    tip: "Rebound always higher than bump. Bouncy over bumps: increase bump.",
  },
  Aero: {
    values: [
      { key: "Front Downforce", value: "220 lbs" },
      { key: "Rear Downforce", value: "330 lbs" },
      { key: "Aero Balance", value: "40% F / 60% R" },
    ],
    tip: "Rear-heavy aero balance keeps the car planted without inducing understeer.",
  },
  Brake: {
    values: [
      { key: "Brake Balance", value: "52% F" },
      { key: "Brake Pressure", value: "100%" },
    ],
    tip: "Trail brake: gradually release as you turn in.",
  },
  Differential: {
    values: [
      { key: "Front Accel", value: "28%" },
      { key: "Front Decel", value: "0%" },
      { key: "Rear Accel", value: "65%" },
      { key: "Rear Decel", value: "12%" },
      { key: "Center Balance", value: "68% R" },
    ],
    tip: "Rear accel controls exit traction. Reduce 5–10% if spinning on exit.",
  },
};

export const TUNE_TAB_ORDER = [
  "Tires",
  "Gearing",
  "Alignment",
  "Antiroll Bars",
  "Springs",
  "Damping",
  "Aero",
  "Brake",
  "Differential",
] as const;

export const FEEL_PRESETS = [
  { label: "Stable", balance: 20, aggression: 25 },
  { label: "Balanced", balance: 40, aggression: 45 },
  { label: "Tail-Happy", balance: 65, aggression: 55 },
  { label: "Oversteer", balance: 80, aggression: 70 },
  { label: "Late Brake", balance: 25, aggression: 60 },
  { label: "Drift", balance: 90, aggression: 100 },
] as const;
