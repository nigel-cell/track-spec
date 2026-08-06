import { findCarRecord, type CarRecord } from "../hooks/useCarDatabase";
import type { TuneUnits } from "./units";
import { weightFromKg, weightLabel } from "./units";

export interface WeightSanityResult {
  expectedWeight?: number;
  deltaPct?: number;
  severity: "ok" | "warn" | "error";
  message: string;
}

export function checkWeightSanity(
  make: string,
  model: string,
  weight: number,
  units: TuneUnits,
  cars: CarRecord[] = [],
): WeightSanityResult {
  const record = findCarRecord(cars, make, model);
  if (!record?.weight) {
    return { severity: "ok", message: "No reference weight in database for this car." };
  }

  const expected = weightFromKg(record.weight, units);
  const deltaPct = Math.abs(weight - expected) / expected;

  if (deltaPct <= 0.05) {
    return {
      expectedWeight: expected,
      deltaPct,
      severity: "ok",
      message: `Weight matches stock (~${Math.round(expected)} ${weightLabel(units)}).`,
    };
  }

  if (deltaPct <= 0.15) {
    return {
      expectedWeight: expected,
      deltaPct,
      severity: "warn",
      message: `Weight differs from stock by ${Math.round(deltaPct * 100)}% (stock ~${Math.round(expected)} ${weightLabel(units)}). OK if upgraded.`,
    };
  }

  return {
    expectedWeight: expected,
    deltaPct,
    severity: "error",
    message: `Weight looks off — stock is ~${Math.round(expected)} ${weightLabel(units)}, you entered ${Math.round(weight)}. Springs/damping will be wrong.`,
  };
}
