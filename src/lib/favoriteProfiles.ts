/**
 * Full saved profiles for favorite cars: weight, speed, torque, tires,
 * measured spring/ride/aero limits, and last Manual setup edits.
 */

import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { CarRecord } from "../hooks/useCarDatabase";
import type { ForzaGarageCar } from "./forzaGarage";
import { tuneDraftFromGarage } from "./tuneFromGarage";
import type { TuneUnits } from "./units";
import { IMPERIAL_UNITS } from "./units";
import { convertSpringValue } from "./gameLimits";
import {
  findSliderLimits,
  type CarSliderLimits,
  type SliderLimitsFile,
} from "./sliderLimits";
import { loadFavoriteDraft, saveFavoriteDraft } from "./carFavorites";

function limitsToConfigFields(
  limits: CarSliderLimits | null,
  units: TuneUnits,
): Partial<TuneConfig> {
  if (!limits) return {};
  const out: Partial<TuneConfig> = {
    sliderLimitsSource: limits.source,
  };
  if (limits.springs) {
    const src = limits.springs.unit ?? "lbs/in";
    const digits = units.springs === "kgf/mm" ? 2 : 1;
    const conv = (v: number) => +convertSpringValue(v, src, units.springs).toFixed(digits);
    out.springFrontMin = conv(limits.springs.frontMin);
    out.springFrontMax = conv(limits.springs.frontMax);
    out.springRearMin = conv(limits.springs.rearMin);
    out.springRearMax = conv(limits.springs.rearMax);
  }
  if (limits.ride) {
    out.rideFrontMin = limits.ride.frontMin;
    out.rideFrontMax = limits.ride.frontMax;
    out.rideRearMin = limits.ride.rearMin;
    out.rideRearMax = limits.ride.rearMax;
  }
  if (limits.aero) {
    out.aeroFrontMin = limits.aero.frontMin ?? 0;
    out.aeroFrontMax = limits.aero.frontMax ?? null;
    out.aeroRearMin = limits.aero.rearMin ?? 0;
    out.aeroRearMax = limits.aero.rearMax ?? null;
    if (limits.aero.frontMax != null || limits.aero.rearMax != null) {
      out.hasAero = true;
      if (limits.aero.frontMax != null) out.aeroF = limits.aero.frontMax;
      if (limits.aero.rearMax != null) out.aeroR = limits.aero.rearMax;
    }
  }
  return out;
}

/** Garage stock specs + measured slider ends → baseline favorite profile. */
export function buildFavoriteBaseline(
  garage: ForzaGarageCar,
  cars: CarRecord[],
  units: TuneUnits = IMPERIAL_UNITS,
  sliderFile: SliderLimitsFile | null = null,
): Partial<TuneConfig> {
  const base = tuneDraftFromGarage(garage, cars, units);
  const limits = findSliderLimits(sliderFile, garage.make, garage.model);
  return { ...base, ...limitsToConfigFields(limits, units) };
}

/**
 * Ensure a favorite has a saved profile. Creates one from garage + measured
 * limits if missing; otherwise merges baseline under the user's last draft
 * so weight/speed/etc. are never blank.
 */
export function ensureFavoriteProfile(
  slug: string,
  garage: ForzaGarageCar,
  cars: CarRecord[],
  units: TuneUnits = IMPERIAL_UNITS,
  sliderFile: SliderLimitsFile | null = null,
): Partial<TuneConfig> {
  const baseline = buildFavoriteBaseline(garage, cars, units, sliderFile);
  const saved = loadFavoriteDraft<Partial<TuneConfig>>(slug);
  if (!saved) {
    saveFavoriteDraft(slug, baseline);
    return baseline;
  }
  // Saved edits win; baseline fills any missing stock fields.
  const merged = { ...baseline, ...saved };
  saveFavoriteDraft(slug, merged);
  return merged;
}

/** Hydrate all currently favorited garage cars that lack a full draft. */
export function hydrateFavoriteProfiles(
  favoriteSlugs: Set<string>,
  garageCars: ForzaGarageCar[],
  cars: CarRecord[],
  units: TuneUnits = IMPERIAL_UNITS,
  sliderFile: SliderLimitsFile | null = null,
): void {
  for (const slug of favoriteSlugs) {
    const garage = garageCars.find((c) => c.slug === slug);
    if (!garage) continue;
    ensureFavoriteProfile(slug, garage, cars, units, sliderFile);
  }
}
