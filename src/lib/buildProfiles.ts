import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { AspirationId, EngineSwapId, InputDeviceId } from "../data/engineData";

const PROFILES_KEY = "tl_v1_build_profiles";
const MAX_PROFILES = 50;

export interface BuildProfile {
  id: number;
  carSlug: string;
  carName: string;
  name: string;
  date: string;
  pi?: number;
  carClass?: string;
  engineSwap: EngineSwapId | string;
  aspiration: AspirationId;
  inputDevice: InputDeviceId;
  compound?: string;
  hasAero?: boolean;
  weight?: number;
  maxTorque?: number;
  redlineRpm?: number;
  peakTorqueRpm?: number;
  tireWF?: string;
  tireWR?: string;
  aeroF?: number;
  aeroR?: number;
  includeGearing?: boolean;
}

function readRaw(): BuildProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuildProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(profiles: BuildProfile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* quota */
  }
}

export function listBuildProfiles(carSlug?: string): BuildProfile[] {
  const all = readRaw();
  if (!carSlug) return all;
  return all.filter((p) => p.carSlug === carSlug);
}

export function saveBuildProfile(
  entry: Omit<BuildProfile, "id" | "date"> & { date?: string },
): BuildProfile {
  const profiles = readRaw();
  const record: BuildProfile = {
    ...entry,
    id: Date.now(),
    date: entry.date ?? new Date().toLocaleDateString(),
  };
  writeRaw([record, ...profiles.filter((p) => p.id !== record.id)].slice(0, MAX_PROFILES));
  return record;
}

export function deleteBuildProfile(id: number): void {
  writeRaw(readRaw().filter((p) => p.id !== id));
}

export function buildProfileToDraft(profile: BuildProfile): Partial<TuneConfig> {
  return {
    engineSwap: profile.engineSwap,
    aspiration: profile.aspiration,
    inputDevice: profile.inputDevice,
    compound: profile.compound,
    hasAero: profile.hasAero,
    weight: profile.weight,
    maxTorque: profile.maxTorque,
    redlineRpm: profile.redlineRpm,
    peakTorqueRpm: profile.peakTorqueRpm,
    tireWF: profile.tireWF,
    tireWR: profile.tireWR,
    aeroF: profile.aeroF,
    aeroR: profile.aeroR,
    pi: profile.pi,
    carClass: profile.carClass,
    includeGearing: profile.includeGearing ?? true,
    mode: "full",
  };
}

export function configToBuildProfile(
  config: TuneConfig,
  carSlug: string,
  carName: string,
  name: string,
): Omit<BuildProfile, "id" | "date"> {
  return {
    carSlug,
    carName,
    name,
    pi: config.pi,
    carClass: config.carClass,
    engineSwap: config.engineSwap ?? "None (Stock)",
    aspiration: config.aspiration ?? "na",
    inputDevice: config.inputDevice ?? "controller",
    compound: config.compound,
    hasAero: config.hasAero,
    weight: config.weight,
    maxTorque: config.maxTorque,
    redlineRpm: config.redlineRpm,
    peakTorqueRpm: config.peakTorqueRpm,
    tireWF: config.tireWF,
    tireWR: config.tireWR,
    aeroF: config.aeroF,
    aeroR: config.aeroR,
    includeGearing: config.includeGearing,
  };
}
