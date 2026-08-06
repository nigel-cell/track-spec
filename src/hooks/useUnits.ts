import { useCallback, useState } from "react";

import type { TuneUnits } from "../lib/units";
import { IMPERIAL_UNITS, METRIC_UNITS, loadUnits, saveUnits } from "../lib/units";

export function useUnits() {
  const [units, setUnitsState] = useState<TuneUnits>(() => loadUnits());

  const setUnits = useCallback((next: TuneUnits) => {
    setUnitsState(next);
    saveUnits(next);
  }, []);

  const setPreset = useCallback(
    (preset: "imperial" | "metric") => {
      setUnits(preset === "metric" ? METRIC_UNITS : IMPERIAL_UNITS);
    },
    [setUnits],
  );

  return {
    units,
    setUnits,
    setPreset,
    isMetric: units.weight === "kg",
  };
}

export { IMPERIAL_UNITS, METRIC_UNITS };
