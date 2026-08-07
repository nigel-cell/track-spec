import { TUNE_MODES, TUNE_TAB_ORDER } from "../data/constants";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { CalcTuneResult } from "./calcTune";
import type { TuneUnits } from "./units";
import { IMPERIAL_UNITS, resolveTuneUnits } from "./units";
import { buildAutoTuneConfig } from "./autoTuneConfig";
import type { AspirationId, InputDeviceId } from "../data/engineData";

const KOFI_URL = "https://ko-fi.com/tunelabs";

const SHARE_FIELDS = [
  "make",
  "model",
  "driveType",
  "surface",
  "inputDevice",
  "weight",
  "weightDist",
  "redlineRpm",
  "peakTorqueRpm",
  "maxTorque",
  "topspeed",
  "gears",
  "tireWF",
  "tireWR",
  "compound",
  "hasAero",
  "aeroF",
  "aeroR",
  "dragCd",
  "pi",
  "carClass",
  "units",
  "feelBalance",
  "feelAggression",
  "stockFd",
  "stockGears",
  "includeGearing",
  "engineSwap",
  "drivetrainSwap",
  "aspiration",
  "inputDevice",
  "tuneId",
  "mode",
] as const;

export type SharePayload = Record<string, unknown>;

export function buildSharePayload(
  config: TuneConfig,
  feelBalance: number,
  feelAggression: number,
  appUnits?: TuneUnits,
): SharePayload {
  const full = config.mode === "full";
  const units = resolveTuneUnits(config.units, appUnits);
  return {
    make: config.make,
    model: config.model,
    driveType: config.driveType,
    surface: config.surface ?? "Road",
    weight: config.weight,
    weightDist: config.weightDist,
    redlineRpm: full ? (config.redlineRpm ?? 7800) : 0,
    peakTorqueRpm: full ? (config.peakTorqueRpm ?? 5500) : 0,
    maxTorque: full ? (config.maxTorque ?? 500) : 500,
    topspeed: full ? (config.topspeed ?? 180) : 180,
    gears: full ? (config.gears ?? 6) : 6,
    tireWF: config.tireWF ?? "275/35R19",
    tireWR: config.tireWR ?? "285/35R19",
    compound: config.compound ?? "Sport",
    hasAero: config.hasAero ?? false,
    aeroF: config.aeroF ?? 0,
    aeroR: config.aeroR ?? 0,
    dragCd: config.dragCd ?? 0.32,
    pi: config.pi,
    carClass: config.carClass,
    units,
    feelBalance,
    feelAggression,
    stockFd: config.stockFd ?? null,
    stockGears: config.stockGears ?? null,
    includeGearing: full && (config.includeGearing ?? true),
    engineSwap: config.engineSwap ?? "None (Stock)",
    drivetrainSwap: config.drivetrainSwap,
    aspiration: config.aspiration ?? "na",
    inputDevice: config.inputDevice ?? "controller",
    tuneId: config.tuneId,
    mode: config.mode,
  };
}

export function encodeShareConfig(payload: SharePayload): string | null {
  try {
    const slim: SharePayload = {};
    for (const key of SHARE_FIELDS) {
      if (payload[key] !== undefined) slim[key] = payload[key];
    }
    const json = JSON.stringify(slim);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return null;
  }
}

export function decodeShareConfig(b64: string): SharePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}

export function extractShareConfig(text: string): SharePayload | null {
  const m = text.match(/<!--TL:([A-Za-z0-9+/=\s]+):LT-->/);
  if (!m) return null;
  return decodeShareConfig(m[1].replace(/\s+/g, ""));
}

/** Turn embedded share payload into a deploy-ready config + feel sliders. */
export function sharePayloadToLoad(
  payload: SharePayload,
  appUnits: TuneUnits = IMPERIAL_UNITS,
): { config: TuneConfig; balance: number; aggression: number; name: string } {
  const units = resolveTuneUnits(payload.units as TuneUnits | undefined, appUnits);
  const mode = (payload.mode as TuneConfig["mode"]) ?? "full";
  const draft: Partial<TuneConfig> = {
    make: payload.make as string | undefined,
    model: payload.model as string | undefined,
    driveType: payload.driveType as TuneConfig["driveType"],
    surface: payload.surface as string | undefined,
    weight: payload.weight as number | undefined,
    weightDist: payload.weightDist as number | undefined,
    pi: payload.pi as number | undefined,
    carClass: payload.carClass as string | undefined,
    redlineRpm: payload.redlineRpm as number | undefined,
    peakTorqueRpm: payload.peakTorqueRpm as number | undefined,
    maxTorque: payload.maxTorque as number | undefined,
    topspeed: payload.topspeed as number | undefined,
    gears: payload.gears as number | undefined,
    tireWF: payload.tireWF as string | undefined,
    tireWR: payload.tireWR as string | undefined,
    compound: payload.compound as string | undefined,
    hasAero: payload.hasAero as boolean | undefined,
    aeroF: payload.aeroF as number | undefined,
    aeroR: payload.aeroR as number | undefined,
    dragCd: payload.dragCd as number | undefined,
    stockFd: (payload.stockFd as number | null | undefined) ?? null,
    stockGears: (payload.stockGears as number[] | null | undefined) ?? null,
    includeGearing: payload.includeGearing as boolean | undefined,
    engineSwap: payload.engineSwap as string | undefined,
    drivetrainSwap: payload.drivetrainSwap as string | undefined,
    aspiration: payload.aspiration as AspirationId | undefined,
    inputDevice: payload.inputDevice as InputDeviceId | undefined,
    tuneId: payload.tuneId as string | undefined,
    mode,
    units,
  };

  const config = buildAutoTuneConfig(draft, {
    tuneId: (payload.tuneId as string) ?? "Race",
    mode,
    units,
  });

  return {
    config,
    balance: typeof payload.feelBalance === "number" ? payload.feelBalance : 40,
    aggression: typeof payload.feelAggression === "number" ? payload.feelAggression : 45,
    name: `${config.make} ${config.model} — ${config.tuneId}`,
  };
}

export function parseSharedTuneText(
  text: string,
  appUnits: TuneUnits = IMPERIAL_UNITS,
): { config: TuneConfig; balance: number; aggression: number; name: string } | null {
  const payload = extractShareConfig(text);
  if (!payload) return null;
  return sharePayloadToLoad(payload, appUnits);
}

export function formatTuneText(
  config: TuneConfig,
  pages: CalcTuneResult,
  feelBalance: number,
  feelAggression: number,
  appUnits?: TuneUnits,
): string {
  const mode = TUNE_MODES.find((t) => t.id === config.tuneId);
  const out = [
    `Track Spec — ${config.make} ${config.model}`,
    `${mode?.label ?? config.tuneId} | ${config.carClass} ${config.pi}PI | ${config.driveType}`,
    "─────────────────────────────",
  ];

  for (const pg of TUNE_TAB_ORDER) {
    const d = pages[pg];
    if (!d?.values?.length) continue;
    out.push(`\n${pg}`);
    for (const row of d.values) {
      out.push(`  ${row.key.padEnd(22)} ${row.value}`);
    }
  }

  out.push("\n─────────────────────────────");
  out.push("Tuned with Track Spec — free FH6 tuning calculator");
  out.push(`Support the dev: ${KOFI_URL}`);

  const cfg = encodeShareConfig(buildSharePayload(config, feelBalance, feelAggression, appUnits));
  if (cfg) out.push(`\n<!--TL:${cfg}:LT-->`);

  return out.join("\n");
}

export async function shareTuneText(text: string, title = "Track Spec Tune"): Promise<"shared" | "copied"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch {
      /* fall through to clipboard */
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
