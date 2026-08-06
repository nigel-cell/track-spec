import type { TuneConfig } from "../components/tune/TuneInputScreen";
import { getSwapModifiers, type AspirationId } from "../data/engineData";
import type { TuneUnits } from "./units";
import { torqueFromLbFt, weightFromLbs } from "./units";

export function applyEngineSwapToConfig(
  config: Partial<TuneConfig>,
  swap: string,
  units: TuneUnits,
  baseWeightLbs?: number,
  baseTorqueLbFt?: number,
): Partial<TuneConfig> {
  if (swap === "None (Stock)") {
    return { ...config, engineSwap: swap };
  }

  const mod = getSwapModifiers(swap);
  const next: Partial<TuneConfig> = {
    ...config,
    engineSwap: swap,
    aspiration: mod.aspiration,
  };

  if (baseWeightLbs != null || config.weight != null) {
    const baseLbs = baseWeightLbs ?? (units.weight === "lbs" ? config.weight! : config.weight! * 2.205);
    const newLbs = baseLbs + mod.weightLbsDelta;
    next.weight = weightFromLbs(newLbs, units);
  }

  if (baseTorqueLbFt != null || config.maxTorque != null) {
    const baseTq = baseTorqueLbFt ?? config.maxTorque!;
    const scaled = Math.round(baseTq * mod.torqueMult);
    next.maxTorque = units.weight === "lbs" ? scaled : torqueFromLbFt(scaled, units);
  }

  if (mod.redlineRpm) next.redlineRpm = mod.redlineRpm;
  if (mod.peakTorqueRpm) next.peakTorqueRpm = mod.peakTorqueRpm;
  if (mod.weightDistDelta != null && config.weightDist != null) {
    next.weightDist = Math.max(40, Math.min(60, config.weightDist + mod.weightDistDelta));
  }

  return next;
}

export function resolveAspiration(config: Partial<TuneConfig>): AspirationId {
  if (config.aspiration) return config.aspiration;
  if (config.engineSwap && config.engineSwap !== "None (Stock)") {
    return getSwapModifiers(config.engineSwap).aspiration;
  }
  return "na";
}
