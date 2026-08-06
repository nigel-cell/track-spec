export const ENGINE_SWAPS = [
  "None (Stock)",
  "LS V8 (6.2L NA)",
  "LS V8 (Supercharged)",
  "LS V8 (Twin-Turbo)",
  "2JZ-GTE (Single Turbo)",
  "2JZ-GTE (Twin Turbo)",
  "RB26DETT (Twin Turbo)",
  "RB26 (Single Turbo)",
  "Coyote 5.0 V8 (NA)",
  "Coyote 5.0 V8 (Supercharged)",
  "Barra I6 (Turbo)",
  "SR20DET (Turbo)",
  "K20/K24 (NA)",
  "K24 (Turbo)",
  "EJ257 Boxer (Turbo)",
  "FA20 Boxer (NA)",
  "VR38DETT (Twin Turbo)",
  "CA18DET (Turbo)",
  "4G63T (Turbo)",
  "B16/B18 VTEC (NA)",
  "Ferrari V12 (NA)",
  "Lamborghini V10 (NA)",
  "Dodge Hellcat V8 (SC)",
  "Viper V10 (NA)",
] as const;

export type EngineSwapId = (typeof ENGINE_SWAPS)[number];

export type AspirationId = "na" | "turbo" | "twin" | "super" | "electric";

export type InputDeviceId = "controller" | "wheel" | "keyboard";

export const ASPIRATIONS: { id: AspirationId; label: string; desc: string }[] = [
  { id: "na", label: "Naturally Aspirated", desc: "Linear power — high-rev character" },
  { id: "turbo", label: "Single Turbo", desc: "Lag below spool — diff accel is critical" },
  { id: "twin", label: "Twin Turbo", desc: "Lower lag, wider powerband" },
  { id: "super", label: "Supercharged", desc: "Instant torque, no lag" },
  { id: "electric", label: "Electric / Hybrid", desc: "Instant max torque" },
];

export const INPUT_DEVICES: { id: InputDeviceId; label: string; desc: string }[] = [
  { id: "controller", label: "Controller", desc: "ABS-friendly brake bias" },
  { id: "wheel", label: "Racing Wheel", desc: "Trail braking for linear pedal" },
  { id: "keyboard", label: "Keyboard", desc: "Wide stability margins" },
];

/** Relative engine swap modifiers vs stock (approximate FH6 character). */
export interface SwapModifiers {
  aspiration: AspirationId;
  weightLbsDelta: number;
  torqueMult: number;
  redlineRpm?: number;
  peakTorqueRpm?: number;
  weightDistDelta?: number;
}

const SWAP_TABLE: Record<string, SwapModifiers> = {
  "None (Stock)": { aspiration: "na", weightLbsDelta: 0, torqueMult: 1 },
  "LS V8 (6.2L NA)": { aspiration: "na", weightLbsDelta: 80, torqueMult: 1.15, redlineRpm: 6500, peakTorqueRpm: 4200 },
  "LS V8 (Supercharged)": { aspiration: "super", weightLbsDelta: 120, torqueMult: 1.35, redlineRpm: 6500, peakTorqueRpm: 3800 },
  "LS V8 (Twin-Turbo)": { aspiration: "twin", weightLbsDelta: 140, torqueMult: 1.55, redlineRpm: 6800, peakTorqueRpm: 4200 },
  "2JZ-GTE (Single Turbo)": { aspiration: "turbo", weightLbsDelta: 60, torqueMult: 1.25, redlineRpm: 7200, peakTorqueRpm: 4000 },
  "2JZ-GTE (Twin Turbo)": { aspiration: "twin", weightLbsDelta: 90, torqueMult: 1.45, redlineRpm: 7200, peakTorqueRpm: 4200 },
  "RB26DETT (Twin Turbo)": { aspiration: "twin", weightLbsDelta: 70, torqueMult: 1.3, redlineRpm: 7800, peakTorqueRpm: 4400 },
  "RB26 (Single Turbo)": { aspiration: "turbo", weightLbsDelta: 50, torqueMult: 1.2, redlineRpm: 7800, peakTorqueRpm: 4200 },
  "Coyote 5.0 V8 (NA)": { aspiration: "na", weightLbsDelta: 40, torqueMult: 1.1, redlineRpm: 7500, peakTorqueRpm: 4500 },
  "Coyote 5.0 V8 (Supercharged)": { aspiration: "super", weightLbsDelta: 100, torqueMult: 1.4, redlineRpm: 7200, peakTorqueRpm: 4000 },
  "Barra I6 (Turbo)": { aspiration: "turbo", weightLbsDelta: 50, torqueMult: 1.35, redlineRpm: 6500, peakTorqueRpm: 3500 },
  "SR20DET (Turbo)": { aspiration: "turbo", weightLbsDelta: -20, torqueMult: 1.05, redlineRpm: 7800, peakTorqueRpm: 4000 },
  "K20/K24 (NA)": { aspiration: "na", weightLbsDelta: -80, torqueMult: 0.85, redlineRpm: 8600, peakTorqueRpm: 6200 },
  "K24 (Turbo)": { aspiration: "turbo", weightLbsDelta: -40, torqueMult: 1.0, redlineRpm: 8200, peakTorqueRpm: 4500 },
  "EJ257 Boxer (Turbo)": { aspiration: "turbo", weightLbsDelta: 20, torqueMult: 1.15, redlineRpm: 6800, peakTorqueRpm: 4000 },
  "FA20 Boxer (NA)": { aspiration: "na", weightLbsDelta: -30, torqueMult: 0.9, redlineRpm: 7400, peakTorqueRpm: 5200 },
  "VR38DETT (Twin Turbo)": { aspiration: "twin", weightLbsDelta: 30, torqueMult: 1.35, redlineRpm: 7000, peakTorqueRpm: 3800 },
  "CA18DET (Turbo)": { aspiration: "turbo", weightLbsDelta: -10, torqueMult: 1.05, redlineRpm: 7800, peakTorqueRpm: 4200 },
  "4G63T (Turbo)": { aspiration: "turbo", weightLbsDelta: 10, torqueMult: 1.2, redlineRpm: 7200, peakTorqueRpm: 4000 },
  "B16/B18 VTEC (NA)": { aspiration: "na", weightLbsDelta: -100, torqueMult: 0.75, redlineRpm: 8800, peakTorqueRpm: 6500 },
  "Ferrari V12 (NA)": { aspiration: "na", weightLbsDelta: 20, torqueMult: 1.25, redlineRpm: 8500, peakTorqueRpm: 6000 },
  "Lamborghini V10 (NA)": { aspiration: "na", weightLbsDelta: 10, torqueMult: 1.2, redlineRpm: 8600, peakTorqueRpm: 5800 },
  "Dodge Hellcat V8 (SC)": { aspiration: "super", weightLbsDelta: 150, torqueMult: 1.5, redlineRpm: 6200, peakTorqueRpm: 3600 },
  "Viper V10 (NA)": { aspiration: "na", weightLbsDelta: 60, torqueMult: 1.3, redlineRpm: 6200, peakTorqueRpm: 4800 },
};

export function getSwapModifiers(swap: string): SwapModifiers {
  return SWAP_TABLE[swap] ?? SWAP_TABLE["None (Stock)"];
}

export function aspirationFromGarage(raw?: string | null): AspirationId {
  if (!raw) return "na";
  const s = raw.toLowerCase();
  if (s.includes("electric")) return "electric";
  if (s.includes("twin")) return "twin";
  if (s.includes("turbo") || s.includes("supercharg")) return s.includes("super") ? "super" : "turbo";
  if (s.includes("super")) return "super";
  return "na";
}
