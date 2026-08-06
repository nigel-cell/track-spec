import { applyCarToForm, findCarRecord, type CarRecord } from "../hooks/useCarDatabase";
import { parseOrdinalDisplayName } from "./carOrdinals";
import { getClassLabel, type TelemetryFrame } from "./telemetry";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { TuneUnits } from "./units";
import { IMPERIAL_UNITS } from "./units";

/** Build tune input draft from live telemetry + ordinal name + car DB. */
export function tuneDraftFromTelemetry(
  telemetry: TelemetryFrame,
  ordinalName: string | null,
  cars: CarRecord[],
  makes: string[],
  units: TuneUnits = IMPERIAL_UNITS,
): Partial<TuneConfig> {
  const draft: Partial<TuneConfig> = {
    pi: telemetry.carPerformanceIndex || undefined,
    carClass: telemetry.carPerformanceIndex ? getClassLabel(telemetry.carClass) : undefined,
    mode: "full",
    includeGearing: true,
  };

  if (telemetry.engineMaxRpm && telemetry.engineMaxRpm > 2000) {
    draft.redlineRpm = Math.round(telemetry.engineMaxRpm);
  }

  if (!ordinalName) return draft;

  const parsed = parseOrdinalDisplayName(ordinalName, makes);
  if (parsed.make) {
    const record = findCarRecord(cars, parsed.make, parsed.model);
    if (record) {
      Object.assign(draft, applyCarToForm(record, units));
    } else {
      draft.make = parsed.make;
      draft.model = parsed.year ? `${parsed.model} '${parsed.year.slice(-2)}` : parsed.model;
    }
  }

  return draft;
}
