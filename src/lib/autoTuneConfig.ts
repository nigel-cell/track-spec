import { DEFAULT_CAR, DRIVE_TYPES } from "../data/constants";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { TuneUnits } from "./units";
import {
  defaultMaxTorque,
  defaultTopSpeed,
  defaultWeight,
} from "./units";

const WEIGHT_DIST: Record<string, number> = { FWD: 63, RWD: 47, AWD: 53 };

const COMPOUND_BY_MODE: Record<string, string> = {
  Race: "Race Semi-Slick",
  Touge: "Race Semi-Slick",
  Wangan: "Race Semi-Slick",
  Drift: "Race Semi-Slick",
  Drag: "Drag",
  Rally: "Rally",
  Rain: "Street",
  General: "Sport",
};

const SURFACE_BY_MODE: Record<string, string> = {
  Race: "Road",
  Touge: "Road",
  Wangan: "Road",
  Drift: "Road",
  Drag: "Road",
  Rally: "Mixed",
  Rain: "Road",
  General: "Road",
};

export interface AutoTuneOptions {
  tuneId?: string;
  mode?: "quick" | "full";
  units: TuneUnits;
}

/** Turn a partial draft (garage / telemetry) into a deploy-ready full tune config. */
export function buildAutoTuneConfig(
  draft: Partial<TuneConfig>,
  { tuneId = "Race", mode = "full", units }: AutoTuneOptions,
): TuneConfig {
  const drive = (draft.driveType ?? DEFAULT_CAR.driveType) as (typeof DRIVE_TYPES)[number];

  return {
    make: draft.make ?? DEFAULT_CAR.make,
    model: draft.model ?? DEFAULT_CAR.model,
    driveType: drive,
    weight: draft.weight ?? defaultWeight(units),
    weightDist: draft.weightDist ?? WEIGHT_DIST[drive] ?? DEFAULT_CAR.weightDist,
    pi: draft.pi ?? DEFAULT_CAR.pi,
    carClass: draft.carClass ?? DEFAULT_CAR.carClass,
    tuneId: draft.tuneId ?? tuneId,
    mode: draft.mode ?? mode,
    surface: draft.surface ?? SURFACE_BY_MODE[tuneId] ?? "Road",
    compound: draft.compound ?? COMPOUND_BY_MODE[tuneId] ?? "Sport",
    redlineRpm: draft.redlineRpm ?? 7800,
    peakTorqueRpm: draft.peakTorqueRpm ?? 5500,
    maxTorque: draft.maxTorque ?? defaultMaxTorque(units),
    topspeed: draft.topspeed ?? defaultTopSpeed(units),
    gears: draft.gears ?? 6,
    includeGearing: draft.includeGearing ?? mode === "full",
    hasAero: draft.hasAero ?? false,
    aeroF: draft.aeroF ?? 0,
    aeroR: draft.aeroR ?? 0,
    dragCd: draft.dragCd ?? 0.32,
    tireWF: draft.tireWF ?? "275/35R19",
    tireWR: draft.tireWR ?? "285/35R19",
    stockFd: draft.stockFd ?? null,
    stockGears: draft.stockGears ?? null,
    engineSwap: draft.engineSwap ?? "None (Stock)",
    aspiration: draft.aspiration ?? "na",
    inputDevice: draft.inputDevice ?? "controller",
    units,
  };
}
