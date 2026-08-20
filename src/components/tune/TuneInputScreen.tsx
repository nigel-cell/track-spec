import { useMemo, useState, useEffect, useRef } from "react";

import {

  CLASSES,

  DEFAULT_CAR,

  DRIVE_TYPES,

  TUNE_MODES,

} from "../../data/constants";

import { useCarDatabase } from "../../hooks/useCarDatabase";

import { useForzaGarage } from "../../hooks/useForzaGarage";

import { mergeGarageIntoDraft } from "../../lib/tuneFromGarage";
import { applyEngineSwapToConfig } from "../../lib/engineSwap";
import { checkWeightSanity } from "../../lib/weightSanity";
import {
  ASPIRATIONS,
  ENGINE_SWAPS,
  INPUT_DEVICES,
  aspirationFromGarage,
  type AspirationId,
  type InputDeviceId,
} from "../../data/engineData";

import type { TuneUnits } from "../../lib/units";
import {
  convertSpeed,
  convertTorque,
  convertWeight,
  defaultMaxTorque,
  defaultTopSpeed,
  defaultWeight,
  speedLabel,
  torqueLabel,
  weightLabel,
} from "../../lib/units";

import { useCarPhoto } from "../../hooks/useCarPhoto";

import { useWikiSwaps } from "../../hooks/useWikiSwaps";
import { estimateSwap, parseSwapName } from "../../lib/wikiSwaps";
import {
  STOCK_DRIVETRAIN,
  applyDrivetrainConversion,
  drivetrainOptions,
  labelForDrive,
  type DriveType,
} from "../../lib/drivetrainSwap";
import {
  applyAeroPackage,
  applyPowerStage,
  applyTirePackage,
  applyTransPackage,
  applyWeightPackageChange,
  classForEstimatedPi,
  estimatePi,
  planForClass,
} from "../../lib/upgradeApply";
import type {
  AeroPackageId,
  BrakePackageId,
  ChassisPackageId,
  PowerStageId,
  TirePackageId,
  TransPackageId,
  WeightPackageId,
} from "../../data/upgradePackages";
import { convertSpringValue } from "../../lib/gameLimits";
import {
  findSliderLimits,
  loadSliderLimitsFile,
  saveUserSliderLimits,
  type CarSliderLimits,
  type SliderLimitsFile,
} from "../../lib/sliderLimits";
import { saveFavoriteDraft } from "../../lib/carFavorites";
import { hydrateCarProfiles, resumeCarProfile, hasSavedCarSetup } from "../../lib/favoriteProfiles";
import {
  loadLastManualDraft,
  resolveManualDraft,
  saveManualDraft,
  slugFromMakeModel,
  type ManualDraftSection,
} from "../../lib/manualDraft";
import type { SavedTune } from "../../lib/tuneSaves";

import { Button } from "../ui/Button";

import { Card, Label } from "../ui/Card";

import { SegmentedControl } from "../ui/SegmentedControl";

import { CarPhotoHero } from "./CarPhotoHero";

import { CarPicker } from "./CarPicker";
import { ManualGaragePanel } from "./ManualGaragePanel";

import { TuneModeGrid } from "./TuneModeGrid";
import { TuneSectionNav, TuneSummaryChips } from "./TuneSectionNav";
import { UpgradePackagesCard } from "./UpgradePackagesCard";



export interface TuneConfig {

  make: string;

  model: string;

  driveType: (typeof DRIVE_TYPES)[number];

  weight: number;

  weightDist: number;

  pi: number;

  carClass: string;

  tuneId: string;

  mode: "quick" | "full";

  surface?: string;

  compound?: string;

  redlineRpm?: number;

  peakTorqueRpm?: number;

  maxTorque?: number;

  topspeed?: number;

  gears?: number;

  includeGearing?: boolean;

  hasAero?: boolean;

  aeroF?: number;

  aeroR?: number;

  dragCd?: number;

  tireWF?: string;

  tireWR?: string;

  stockFd?: number | null;

  stockGears?: number[] | null;

  engineSwap?: string;

  /** Wiki / common drivetrain conversion label, or "None (Stock)". */
  drivetrainSwap?: string;

  /** OEM drive layout before conversion (for reverting / options). */
  stockDriveType?: DriveType;

  weightPackage?: WeightPackageId;
  chassisPackage?: ChassisPackageId;
  powerStage?: PowerStageId;
  tirePackage?: TirePackageId;
  transPackage?: TransPackageId;
  brakePackage?: BrakePackageId;
  aeroPackage?: AeroPackageId;

  /** Optional in-game spring slider bounds (same unit as units.springs). */
  springFrontMin?: number;
  springFrontMax?: number;
  springRearMin?: number;
  springRearMax?: number;

  /** Optional aero DF slider bounds (kg). */
  aeroFrontMin?: number;
  aeroFrontMax?: number | null;
  aeroRearMin?: number;
  aeroRearMax?: number | null;

  /** Optional ride height slider bounds (cm). */
  rideFrontMin?: number;
  rideFrontMax?: number;
  rideRearMin?: number;
  rideRearMax?: number;

  /** estimated | measured | user — from carSliderLimits.json / overrides. */
  sliderLimitsSource?: "estimated" | "measured" | "user";

  aspiration?: import("../../data/engineData").AspirationId;

  inputDevice?: import("../../data/engineData").InputDeviceId;

  units?: TuneUnits;

}



interface TuneInputScreenProps {

  onDeploy: (config: TuneConfig) => void;

  onMyTunes?: () => void;

  onLoadSaved?: (entry: SavedTune) => void;

  initialDraft?: Partial<TuneConfig> | null;

  /** Garage slug when opening Manual for a known car — used to restore that car's draft. */
  resumeSlug?: string | null;

  units: TuneUnits;

}



const COMPOUND_BY_MODE: Record<string, string> = {

  Race: "Race Semi-Slick",

  Touge: "Race Semi-Slick",

  Wangan: "Race Semi-Slick",

  Drift: "Race Semi-Slick",

  Drag: "Drag",

  Rally: "Rally",

  "Cross-Country": "Rally",

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

  "Cross-Country": "Dirt",

  Rain: "Road",

  General: "Road",

};



export function TuneInputScreen({
  onDeploy,
  onMyTunes,
  onLoadSaved,
  initialDraft,
  resumeSlug,
  units,
}: TuneInputScreenProps) {

  type InputSection = ManualDraftSection;
  const [section, setSection] = useState<InputSection>("car");
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [weightPackage, setWeightPackage] = useState<WeightPackageId>("stock");
  const [chassisPackage, setChassisPackage] = useState<ChassisPackageId>("stock");
  const [powerStage, setPowerStage] = useState<PowerStageId>("stock");
  const [tirePackage, setTirePackage] = useState<TirePackageId>("semi");
  const [transPackage, setTransPackage] = useState<TransPackageId>("race");
  const [brakePackage, setBrakePackage] = useState<BrakePackageId>("sport");
  const [aeroPackage, setAeroPackage] = useState<AeroPackageId>("none");
  const [stockTireWF, setStockTireWF] = useState("275/35R19");
  const [stockTireWR, setStockTireWR] = useState("285/35R19");
  const [stockPi, setStockPi] = useState(DEFAULT_CAR.pi);
  const [targetClass, setTargetClass] = useState<string>(DEFAULT_CAR.carClass);
  const [classPlanNote, setClassPlanNote] = useState("");
  const [engineBaseTorqueLbFt, setEngineBaseTorqueLbFt] = useState<number | null>(null);
  const [engineBaseRedline, setEngineBaseRedline] = useState(7800);
  const [engineBasePeak, setEngineBasePeak] = useState(5500);
  const [springFrontMin, setSpringFrontMin] = useState<number | "">("");
  const [springFrontMax, setSpringFrontMax] = useState<number | "">("");
  const [springRearMin, setSpringRearMin] = useState<number | "">("");
  const [springRearMax, setSpringRearMax] = useState<number | "">("");
  const [aeroFrontMin, setAeroFrontMin] = useState<number | "">("");
  const [aeroFrontMax, setAeroFrontMax] = useState<number | "">("");
  const [aeroRearMin, setAeroRearMin] = useState<number | "">("");
  const [aeroRearMax, setAeroRearMax] = useState<number | "">("");
  const [rideFrontMin, setRideFrontMin] = useState<number | "">("");
  const [rideFrontMax, setRideFrontMax] = useState<number | "">("");
  const [rideRearMin, setRideRearMin] = useState<number | "">("");
  const [rideRearMax, setRideRearMax] = useState<number | "">("");
  const [sliderLimitsSource, setSliderLimitsSource] = useState<
    "estimated" | "measured" | "user" | undefined
  >(undefined);
  const [sliderLimitsFile, setSliderLimitsFile] = useState<SliderLimitsFile | null>(null);

  const [make, setMake] = useState(DEFAULT_CAR.make);

  const [model, setModel] = useState(DEFAULT_CAR.model);

  const [driveType, setDriveType] = useState<(typeof DRIVE_TYPES)[number]>(DEFAULT_CAR.driveType);

  const [weight, setWeight] = useState(() => defaultWeight(units));

  const [weightDist, setWeightDist] = useState(DEFAULT_CAR.weightDist);

  const [pi, setPi] = useState(DEFAULT_CAR.pi);

  const [carClass, setCarClass] = useState(DEFAULT_CAR.carClass);

  const [tuneId, setTuneId] = useState(DEFAULT_CAR.tuneId);

  const [compound, setCompound] = useState("Race Semi-Slick");

  const [surface, setSurface] = useState("Road");

  const [redlineRpm, setRedlineRpm] = useState(7800);

  const [peakTorqueRpm, setPeakTorqueRpm] = useState(5500);

  const [maxTorque, setMaxTorque] = useState(() => defaultMaxTorque(units));

  const [topspeed, setTopspeed] = useState(() => defaultTopSpeed(units));

  const [gears, setGears] = useState(6);

  const [hasAero, setHasAero] = useState(false);

  const [aeroF, setAeroF] = useState(0);

  const [aeroR, setAeroR] = useState(0);

  const [dragCd, setDragCd] = useState(0.32);

  const [engineSwap, setEngineSwap] = useState("None (Stock)");
  const [drivetrainSwap, setDrivetrainSwap] = useState(STOCK_DRIVETRAIN);
  const [stockDriveType, setStockDriveType] = useState<DriveType>(DEFAULT_CAR.driveType);
  const [stockWeightDist, setStockWeightDist] = useState<number | null>(DEFAULT_CAR.weightDist);
  const [aspiration, setAspiration] = useState<AspirationId>("turbo");
  const [inputDevice, setInputDevice] = useState<InputDeviceId>("controller");
  const [stockWeightLbs, setStockWeightLbs] = useState<number | null>(null);
  const [stockTorqueLbFt, setStockTorqueLbFt] = useState<number | null>(null);
  const [stockDisplacementCc, setStockDisplacementCc] = useState<number | null>(null);

  const [tireWF, setTireWF] = useState("275/35R19");

  const [tireWR, setTireWR] = useState("285/35R19");

  const [stockFd, setStockFd] = useState<number | null>(null);

  const [stockGears, setStockGears] = useState<number[] | null>(null);

  const prevUnitsRef = useRef(units);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const didRestoreRef = useRef(false);
  const skipAutosaveRef = useRef(true);
  const restoredSpringsRef = useRef(false);



  const { cars, makes, count: carCount, loading: carsLoading } = useCarDatabase();

  const {
    cars: garageCars,
    lookup: lookupGarage,
    enrich: enrichGarage,
    favorites,
    owned,
    toggleOwned,
    ensureLoaded: ensureGarageLoaded,
  } = useForzaGarage();

  useEffect(() => {
    ensureGarageLoaded();
  }, [ensureGarageLoaded]);

  const favoriteCars = useMemo(
    () => garageCars.filter((c) => favorites.has(c.slug)),
    [garageCars, favorites],
  );

  const pinnedCars = useMemo(() => {
    const rows: { car: (typeof garageCars)[number]; kind: "favorite" | "owned" }[] = [];
    const seen = new Set<string>();
    for (const car of favoriteCars) {
      seen.add(car.slug);
      rows.push({ car, kind: "favorite" });
    }
    let extra = 0;
    for (const car of garageCars) {
      if (!owned.has(car.slug) || seen.has(car.slug)) continue;
      seen.add(car.slug);
      rows.push({ car, kind: "owned" });
      extra += 1;
      if (extra >= 8) break;
    }
    return rows;
  }, [favoriteCars, garageCars, owned]);

  const activeGarageCar = useMemo(() => {
    const hit = lookupGarage(make, model.split(" '")[0]);
    if (hit) return hit;
    return (
      favoriteCars.find(
        (c) =>
          c.make === make &&
          (model === c.model || model.startsWith(c.model) || model.includes(c.model)),
      ) ?? null
    );
  }, [make, model, lookupGarage, favoriteCars]);

  const measuredSlugs = useMemo(() => {
    const set = new Set<string>();
    if (!sliderLimitsFile?.cars) return set;
    for (const [slug, car] of Object.entries(sliderLimitsFile.cars)) {
      if (car.source === "measured") set.add(slug);
    }
    return set;
  }, [sliderLimitsFile]);

  // Seed/refresh favorite profiles with garage weight, speed, torque + measured springs.
  useEffect(() => {
    if (!garageCars.length) return;
    const slugs = new Set<string>([...favorites, ...owned]);
    if (!slugs.size) return;
    hydrateCarProfiles(slugs, garageCars, cars, units, sliderLimitsFile);
  }, [garageCars, favorites, owned, cars, units, sliderLimitsFile]);

  const { lookup: lookupWiki } = useWikiSwaps();

  const { status, url } = useCarPhoto(make, model);

  const activeMode = TUNE_MODES.find((m) => m.id === tuneId);

  const sections: { id: InputSection; label: string; disabled?: boolean }[] = [
    { id: "car", label: "Car" },
    { id: "tune", label: "Mode" },
    { id: "specs", label: "Specs" },
    { id: "engine", label: "Build", disabled: mode !== "full" },
  ];

  const sectionOrder = sections.filter((s) => !s.disabled).map((s) => s.id);
  const sectionIndex = sectionOrder.indexOf(section);
  const goNext = () => {
    if (sectionIndex < sectionOrder.length - 1) setSection(sectionOrder[sectionIndex + 1]);
  };
  const goPrev = () => {
    if (sectionIndex > 0) setSection(sectionOrder[sectionIndex - 1]);
  };

  useEffect(() => {
    if (mode === "quick" && section === "engine") setSection("specs");
  }, [mode, section]);

  const applyTuneDraft = (draft: Partial<TuneConfig>) => {
    if (draft.make) setMake(draft.make);
    if (draft.model) setModel(draft.model);
    if (draft.driveType) setDriveType(draft.driveType);
    if (draft.weight) setWeight(draft.weight);
    if (draft.weightDist) {
      setWeightDist(draft.weightDist);
      setStockWeightDist(draft.weightDist);
    }
    if (draft.pi) setPi(draft.pi);
    if (draft.carClass) setCarClass(draft.carClass);
    if (draft.tuneId) setTuneId(draft.tuneId);
    if (draft.mode) setMode(draft.mode);
    if (draft.compound) setCompound(draft.compound);
    if (draft.surface) setSurface(draft.surface);
    if (draft.redlineRpm) setRedlineRpm(draft.redlineRpm);
    if (draft.peakTorqueRpm) setPeakTorqueRpm(draft.peakTorqueRpm);
    if (draft.maxTorque) setMaxTorque(draft.maxTorque);
    if (draft.topspeed) setTopspeed(draft.topspeed);
    if (draft.gears) setGears(draft.gears);
    if (draft.hasAero !== undefined) setHasAero(draft.hasAero);
    if (draft.aeroF != null) setAeroF(draft.aeroF);
    if (draft.aeroR != null) setAeroR(draft.aeroR);
    if (draft.tireWF) {
      setTireWF(draft.tireWF);
      setStockTireWF(draft.tireWF);
    }
    if (draft.tireWR) {
      setTireWR(draft.tireWR);
      setStockTireWR(draft.tireWR);
    }
    if (draft.engineSwap) setEngineSwap(draft.engineSwap);
    if (draft.drivetrainSwap) setDrivetrainSwap(draft.drivetrainSwap);
    if (draft.stockDriveType) setStockDriveType(draft.stockDriveType);
    else if (draft.driveType && (!draft.drivetrainSwap || draft.drivetrainSwap === STOCK_DRIVETRAIN)) {
      setStockDriveType(draft.driveType);
    }
    if (draft.aspiration) setAspiration(draft.aspiration);
    if (draft.inputDevice) setInputDevice(draft.inputDevice);
    if (draft.dragCd != null) setDragCd(draft.dragCd);
    if (draft.stockFd !== undefined) setStockFd(draft.stockFd);
    if (draft.stockGears !== undefined) setStockGears(draft.stockGears);
    if (draft.weightPackage) setWeightPackage(draft.weightPackage);
    if (draft.chassisPackage) setChassisPackage(draft.chassisPackage);
    if (draft.powerStage) setPowerStage(draft.powerStage);
    if (draft.tirePackage) setTirePackage(draft.tirePackage);
    if (draft.transPackage) setTransPackage(draft.transPackage);
    if (draft.brakePackage) setBrakePackage(draft.brakePackage);
    if (draft.aeroPackage) setAeroPackage(draft.aeroPackage);
    if (draft.carClass) setTargetClass(draft.carClass);
    if (draft.pi) setStockPi(draft.pi);
    if (draft.weight) {
      const lbs = units.weight === "lbs" ? draft.weight : draft.weight * 2.205;
      setStockWeightLbs(Math.round(lbs));
    }
    if (draft.maxTorque) {
      const lbft =
        units.weight === "lbs" ? draft.maxTorque : Math.round(draft.maxTorque / 1.356);
      setStockTorqueLbFt(Math.round(lbft));
      setEngineBaseTorqueLbFt(Math.round(lbft));
    }
    if (draft.redlineRpm) setEngineBaseRedline(draft.redlineRpm);
    if (draft.peakTorqueRpm) setEngineBasePeak(draft.peakTorqueRpm);
    if (draft.springFrontMin != null) setSpringFrontMin(draft.springFrontMin);
    if (draft.springFrontMax != null) setSpringFrontMax(draft.springFrontMax);
    if (draft.springRearMin != null) setSpringRearMin(draft.springRearMin);
    if (draft.springRearMax != null) setSpringRearMax(draft.springRearMax);
    if (draft.aeroFrontMin != null) setAeroFrontMin(draft.aeroFrontMin);
    if (draft.aeroFrontMax != null) setAeroFrontMax(draft.aeroFrontMax);
    if (draft.aeroRearMin != null) setAeroRearMin(draft.aeroRearMin);
    if (draft.aeroRearMax != null) setAeroRearMax(draft.aeroRearMax);
    if (draft.rideFrontMin != null) setRideFrontMin(draft.rideFrontMin);
    if (draft.rideFrontMax != null) setRideFrontMax(draft.rideFrontMax);
    if (draft.rideRearMin != null) setRideRearMin(draft.rideRearMin);
    if (draft.rideRearMax != null) setRideRearMax(draft.rideRearMax);
    if (draft.sliderLimitsSource) setSliderLimitsSource(draft.sliderLimitsSource);
  };

  useEffect(() => {
    if (didRestoreRef.current) return;

    if (initialDraft) applyTuneDraft(initialDraft);

    const customSlug = initialDraft?.make
      ? slugFromMakeModel(initialDraft.make, initialDraft.model ?? "")
      : "";
    const stored =
      resolveManualDraft([resumeSlug, customSlug]) ??
      (!initialDraft && !resumeSlug ? loadLastManualDraft() : null);

    if (stored) {
      applyTuneDraft(stored.config);
      setSection(stored.section);
      setMode(stored.mode);
      setDraftStatus("Draft restored. Save draft to keep this setup.");
      if (stored.config.springFrontMin != null || stored.config.springFrontMax != null) {
        restoredSpringsRef.current = true;
      }
    }

    didRestoreRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once per remount
  }, [initialDraft, resumeSlug]);

  useEffect(() => {
    void loadSliderLimitsFile().then(setSliderLimitsFile);
  }, []);

  const applySliderLimits = (limits: CarSliderLimits | null, springUnit: TuneUnits["springs"]) => {
    if (!limits) {
      setSpringFrontMin("");
      setSpringFrontMax("");
      setSpringRearMin("");
      setSpringRearMax("");
      setAeroFrontMin("");
      setAeroFrontMax("");
      setAeroRearMin("");
      setAeroRearMax("");
      setRideFrontMin("");
      setRideFrontMax("");
      setRideRearMin("");
      setRideRearMax("");
      setSliderLimitsSource(undefined);
      return;
    }
    if (limits.springs) {
      const srcUnit = limits.springs.unit ?? "lbs/in";
      const round = (v: number) =>
        springUnit === "kgf/mm" ? +convertSpringValue(v, srcUnit, springUnit).toFixed(2)
          : +convertSpringValue(v, srcUnit, springUnit).toFixed(1);
      setSpringFrontMin(round(limits.springs.frontMin));
      setSpringFrontMax(round(limits.springs.frontMax));
      setSpringRearMin(round(limits.springs.rearMin));
      setSpringRearMax(round(limits.springs.rearMax));
    }
    if (limits.aero) {
      setAeroFrontMin(limits.aero.frontMin ?? 0);
      setAeroFrontMax(limits.aero.frontMax ?? "");
      setAeroRearMin(limits.aero.rearMin ?? 0);
      setAeroRearMax(limits.aero.rearMax ?? "");
    } else {
      setAeroFrontMin("");
      setAeroFrontMax("");
      setAeroRearMin("");
      setAeroRearMax("");
    }
    if (limits.ride) {
      setRideFrontMin(limits.ride.frontMin);
      setRideFrontMax(limits.ride.frontMax);
      setRideRearMin(limits.ride.rearMin);
      setRideRearMax(limits.ride.rearMax);
    } else {
      setRideFrontMin("");
      setRideFrontMax("");
      setRideRearMin("");
      setRideRearMax("");
    }
    setSliderLimitsSource(limits.source);
  };

  useEffect(() => {
    if (!sliderLimitsFile || !make || !model) return;
    // Don't clobber values restored from a draft that already set springs.
    if (
      restoredSpringsRef.current ||
      initialDraft?.springFrontMin != null ||
      initialDraft?.springFrontMax != null
    ) {
      return;
    }
    const limits = findSliderLimits(sliderLimitsFile, make, model);
    if (limits) applySliderLimits(limits, units.springs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-fill when file/car identity changes
  }, [sliderLimitsFile, make, model]);

  useEffect(() => {
    const prev = prevUnitsRef.current;
    if (prev.weight === units.weight && prev.speed === units.speed && prev.springs === units.springs) {
      return;
    }
    setWeight((w) => convertWeight(w, prev.weight, units.weight));
    setTopspeed((s) => convertSpeed(s, prev.speed, units.speed));
    setMaxTorque((t) => convertTorque(t, prev.weight, units.weight));
    if (prev.springs !== units.springs) {
      const conv = (v: number | "") =>
        v === "" ? "" : +convertSpringValue(v, prev.springs, units.springs).toFixed(
          units.springs === "kgf/mm" ? 2 : 1,
        );
      setSpringFrontMin((v) => conv(v));
      setSpringFrontMax((v) => conv(v));
      setSpringRearMin((v) => conv(v));
      setSpringRearMax((v) => conv(v));
    }
    prevUnitsRef.current = units;
  }, [units]);



  const handleModeChange = (id: string) => {

    setTuneId(id);

    if (COMPOUND_BY_MODE[id]) setCompound(COMPOUND_BY_MODE[id]);

    if (SURFACE_BY_MODE[id]) setSurface(SURFACE_BY_MODE[id]);

  };



  const weightCheck = useMemo(
    () => checkWeightSanity(make, model, weight, units, cars),
    [make, model, weight, units, cars],
  );

  const wikiCar = useMemo(() => lookupWiki(make, model), [lookupWiki, make, model]);

  // The wiki lists the exact conversions FH6 offers for this chassis; fall back
  // to the generic engine list when a car has no page yet.
  const swapOptions = useMemo(() => {
    const perCar = wikiCar?.engineSwaps ?? [];
    return perCar.length ? ["None (Stock)", ...perCar] : [...ENGINE_SWAPS];
  }, [wikiCar]);

  const usingWikiSwaps = (wikiCar?.engineSwaps?.length ?? 0) > 0;

  const dtOptions = useMemo(
    () => drivetrainOptions(stockDriveType, wikiCar?.drivetrainSwaps),
    [stockDriveType, wikiCar],
  );

  const usingWikiDrivetrain = (wikiCar?.drivetrainSwaps?.length ?? 0) > 0;

  useEffect(() => {
    if (engineSwap !== "None (Stock)" && !swapOptions.includes(engineSwap)) {
      setEngineSwap("None (Stock)");
    }
  }, [swapOptions, engineSwap]);

  useEffect(() => {
    if (!dtOptions.includes(drivetrainSwap)) {
      // Keep the active layout; remaps "AWD Drivetrain" ↔ bare "AWD" when wiki loads.
      setDrivetrainSwap(labelForDrive(driveType, stockDriveType, dtOptions));
    }
  }, [dtOptions, drivetrainSwap, driveType, stockDriveType]);

  const weightLbsNow = units.weight === "lbs" ? weight : weight * 2.205;

  const commitDrivetrain = (label: string) => {
    const result = applyDrivetrainConversion({
      label,
      stockDrive: stockDriveType,
      currentDrive: driveType,
      currentWeightLbs: weightLbsNow,
      stockWeightDist,
    });
    setDrivetrainSwap(result.label);
    setDriveType(result.driveType);
    setWeightDist(result.weightDist);
    setWeight(units.weight === "lbs" ? result.weightLbs : Math.round(result.weightLbs / 2.205));
  };

  const handleDriveTypeChange = (next: DriveType) => {
    if (next === driveType) return;
    commitDrivetrain(labelForDrive(next, stockDriveType, dtOptions));
  };

  const setWeightLbs = (lbs: number) => {
    setWeight(units.weight === "lbs" ? Math.round(lbs) : Math.round(lbs / 2.205));
  };

  const setTorqueLbFt = (lbFt: number) => {
    setMaxTorque(units.weight === "lbs" ? Math.round(lbFt) : Math.round(lbFt * 1.356));
  };

  const packageWeightOnBase = (baseLbs: number) =>
    applyWeightPackageChange(baseLbs, { weight: "stock", chassis: "stock" }, { weight: weightPackage, chassis: chassisPackage });

  const applyWikiSwap = (swap: string) => {
    const est = estimateSwap(parseSwapName(swap), {
      weightLbs: stockWeightLbs,
      displacementCc: stockDisplacementCc,
    });
    if (est.weightLbs != null) setWeightLbs(packageWeightOnBase(est.weightLbs));
    if (est.maxTorqueLbFt != null) {
      setTorqueLbFt(est.maxTorqueLbFt);
      setEngineBaseTorqueLbFt(est.maxTorqueLbFt);
    }
    if (est.redlineRpm != null) {
      setRedlineRpm(est.redlineRpm);
      setEngineBaseRedline(est.redlineRpm);
    }
    if (est.peakTorqueRpm != null) {
      setPeakTorqueRpm(est.peakTorqueRpm);
      setEngineBasePeak(est.peakTorqueRpm);
    }
    setAspiration(est.aspiration);
    setPowerStage("stock");
  };

  const handleSwapChange = (swap: string) => {
    setEngineSwap(swap);
    if (swap !== "None (Stock)" && usingWikiSwaps) {
      applyWikiSwap(swap);
      return;
    }
    if (swap === "None (Stock)") {
      const base = stockWeightLbs ?? weightLbsNow;
      setWeightLbs(packageWeightOnBase(base));
      const baseTorque = stockTorqueLbFt ?? engineBaseTorqueLbFt ?? (units.weight === "lbs" ? maxTorque : maxTorque / 1.356);
      setEngineBaseTorqueLbFt(baseTorque);
      setEngineBaseRedline(7800);
      setEngineBasePeak(5500);
      const powered = applyPowerStage({
        stage: powerStage,
        stockTorqueLbFt: baseTorque,
        stockRedline: 7800,
        stockPeak: 5500,
        engineSwap: swap,
      });
      setTorqueLbFt(powered.maxTorqueLbFt);
      setRedlineRpm(powered.redlineRpm);
      setPeakTorqueRpm(powered.peakTorqueRpm);
      return;
    }
    const patched = applyEngineSwapToConfig(
      { weight, maxTorque, weightDist, redlineRpm, peakTorqueRpm },
      swap,
      units,
      stockWeightLbs ?? undefined,
      stockTorqueLbFt ?? undefined,
    );
    if (patched.weight != null) {
      const lbs = units.weight === "lbs" ? patched.weight : patched.weight * 2.205;
      setWeightLbs(packageWeightOnBase(lbs));
    }
    if (patched.maxTorque != null) {
      setMaxTorque(patched.maxTorque);
      const lbFt = units.weight === "lbs" ? patched.maxTorque : patched.maxTorque / 1.356;
      setEngineBaseTorqueLbFt(lbFt);
    }
    if (patched.weightDist != null) setWeightDist(patched.weightDist);
    if (patched.redlineRpm != null) {
      setRedlineRpm(patched.redlineRpm);
      setEngineBaseRedline(patched.redlineRpm);
    }
    if (patched.peakTorqueRpm != null) {
      setPeakTorqueRpm(patched.peakTorqueRpm);
      setEngineBasePeak(patched.peakTorqueRpm);
    }
    if (patched.aspiration) setAspiration(patched.aspiration);
    setPowerStage("stock");
  };

  const handleWeightPackage = (id: WeightPackageId) => {
    const nextLbs = applyWeightPackageChange(
      weightLbsNow,
      { weight: weightPackage, chassis: chassisPackage },
      { weight: id, chassis: chassisPackage },
    );
    setWeightPackage(id);
    setWeightLbs(nextLbs);
  };

  const handleChassisPackage = (id: ChassisPackageId) => {
    const nextLbs = applyWeightPackageChange(
      weightLbsNow,
      { weight: weightPackage, chassis: chassisPackage },
      { weight: weightPackage, chassis: id },
    );
    setChassisPackage(id);
    setWeightLbs(nextLbs);
  };

  const handlePowerStage = (id: PowerStageId) => {
    setPowerStage(id);
    const baseTorque =
      engineBaseTorqueLbFt ??
      stockTorqueLbFt ??
      (units.weight === "lbs" ? maxTorque : maxTorque / 1.356);
    const powered = applyPowerStage({
      stage: id,
      stockTorqueLbFt: baseTorque,
      stockRedline: engineBaseRedline,
      stockPeak: engineBasePeak,
      engineSwap,
    });
    setTorqueLbFt(powered.maxTorqueLbFt);
    setRedlineRpm(powered.redlineRpm);
    setPeakTorqueRpm(powered.peakTorqueRpm);
  };

  const handleTirePackage = (id: TirePackageId) => {
    setTirePackage(id);
    const tires = applyTirePackage({
      packageId: id,
      stockFront: stockTireWF,
      stockRear: stockTireWR,
    });
    setCompound(tires.compound);
    setTireWF(tires.tireWF);
    setTireWR(tires.tireWR);
  };

  const handleTransPackage = (id: TransPackageId) => {
    setTransPackage(id);
    const t = applyTransPackage({ packageId: id, stockGears: gears });
    setGears(t.gears);
  };

  const handleAeroPackage = (id: AeroPackageId) => {
    setAeroPackage(id);
    const a = applyAeroPackage(id);
    setHasAero(a.hasAero);
    setAeroF(a.aeroF);
    setAeroR(a.aeroR);
    setDragCd(a.dragCd);
  };

  const estimatedPi = useMemo(() => {
    const torqueLbFt = units.weight === "lbs" ? maxTorque : maxTorque / 1.356;
    const stockT = stockTorqueLbFt ?? engineBaseTorqueLbFt ?? torqueLbFt;
    const stockW = stockWeightLbs ?? weightLbsNow;
    return estimatePi({
      stockPi,
      stockWeightLbs: stockW,
      currentWeightLbs: weightLbsNow,
      stockTorqueLbFt: stockT,
      currentTorqueLbFt: torqueLbFt,
      tirePackage,
      aeroPackage,
      drivetrainSwap,
      driveType,
      stockDrive: stockDriveType,
      powerStage,
      engineSwap,
    });
  }, [
    stockPi,
    stockWeightLbs,
    weightLbsNow,
    stockTorqueLbFt,
    engineBaseTorqueLbFt,
    maxTorque,
    units.weight,
    tirePackage,
    aeroPackage,
    drivetrainSwap,
    driveType,
    stockDriveType,
    powerStage,
    engineSwap,
  ]);

  const applyClassPlan = () => {
    const stockT =
      stockTorqueLbFt ??
      engineBaseTorqueLbFt ??
      (units.weight === "lbs" ? maxTorque : maxTorque / 1.356);
    const stockW = stockWeightLbs ?? weightLbsNow;
    const plan = planForClass({
      targetClass,
      stockPi,
      stockWeightLbs: stockW,
      stockTorqueLbFt: stockT,
      engineSwap,
      drivetrainSwap,
      driveType,
      stockDrive: stockDriveType,
    });
    const nextLbs = applyWeightPackageChange(
      weightLbsNow,
      { weight: weightPackage, chassis: chassisPackage },
      { weight: plan.weightPackage, chassis: plan.chassisPackage },
    );
    setWeightPackage(plan.weightPackage);
    setChassisPackage(plan.chassisPackage);
    setWeightLbs(nextLbs);
    handlePowerStage(plan.powerStage);
    handleTirePackage(plan.tirePackage);
    handleAeroPackage(plan.aeroPackage);
    setCarClass(plan.targetClass);
    setPi(plan.estimatedPi);
    setClassPlanNote(plan.note);
  };



  const snapshotDraft = (): Partial<TuneConfig> => ({
    make,
    model,
    driveType,
    weight,
    weightDist,
    pi,
    carClass,
    tuneId,
    mode,
    surface,
    compound,
    redlineRpm,
    peakTorqueRpm,
    maxTorque,
    topspeed,
    gears,
    includeGearing:
      mode === "full" &&
      applyTransPackage({ packageId: transPackage, stockGears: gears }).includeGearing,
    hasAero,
    aeroF,
    aeroR,
    dragCd,
    tireWF,
    tireWR,
    stockFd,
    stockGears,
    engineSwap,
    drivetrainSwap,
    stockDriveType,
    weightPackage,
    chassisPackage,
    powerStage,
    tirePackage,
    transPackage,
    brakePackage,
    aeroPackage,
    springFrontMin: springFrontMin === "" ? undefined : springFrontMin,
    springFrontMax: springFrontMax === "" ? undefined : springFrontMax,
    springRearMin: springRearMin === "" ? undefined : springRearMin,
    springRearMax: springRearMax === "" ? undefined : springRearMax,
    aeroFrontMin: aeroFrontMin === "" ? undefined : aeroFrontMin,
    aeroFrontMax: aeroFrontMax === "" ? undefined : aeroFrontMax,
    aeroRearMin: aeroRearMin === "" ? undefined : aeroRearMin,
    aeroRearMax: aeroRearMax === "" ? undefined : aeroRearMax,
    rideFrontMin: rideFrontMin === "" ? undefined : rideFrontMin,
    rideFrontMax: rideFrontMax === "" ? undefined : rideFrontMax,
    rideRearMin: rideRearMin === "" ? undefined : rideRearMin,
    rideRearMax: rideRearMax === "" ? undefined : rideRearMax,
    sliderLimitsSource,
    aspiration,
    inputDevice,
    units,
  });

  const activeFavoriteSlug = useMemo(() => {
    const hit = lookupGarage(make, model.split(" '")[0]);
    if (hit && favorites.has(hit.slug)) return hit.slug;
    return favoriteCars.find(
      (c) =>
        c.make === make &&
        (model === c.model || model.startsWith(c.model) || model.includes(c.model)),
    )?.slug;
  }, [make, model, favorites, favoriteCars, lookupGarage]);

  const persistDraft = (): boolean => {
    const cfg = snapshotDraft();
    const customSlug = slugFromMakeModel(make, model);
    const garageSlug = activeGarageCar?.slug;
    const slugs = [garageSlug, customSlug].filter((s, i, arr): s is string => !!s && arr.indexOf(s) === i);
    if (!slugs.length) return false;
    let wrote = false;
    for (const slug of slugs) {
      if (
        saveManualDraft({
          slug,
          section,
          mode,
          config: cfg,
        })
      ) {
        wrote = true;
      }
    }
    if (!wrote) return false;
    if (garageSlug) saveFavoriteDraft(garageSlug, cfg);
    else if (activeFavoriteSlug) saveFavoriteDraft(activeFavoriteSlug, cfg);
    return true;
  };

  // Autosave any in-progress Manual, including the step you were on.
  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      persistDraft();
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot fields listed below
  }, [
    resumeSlug,
    activeGarageCar?.slug,
    activeFavoriteSlug,
    section,
    make,
    model,
    driveType,
    weight,
    weightDist,
    pi,
    carClass,
    tuneId,
    mode,
    surface,
    compound,
    redlineRpm,
    peakTorqueRpm,
    maxTorque,
    topspeed,
    gears,
    hasAero,
    aeroF,
    aeroR,
    dragCd,
    tireWF,
    tireWR,
    stockFd,
    stockGears,
    engineSwap,
    drivetrainSwap,
    stockDriveType,
    weightPackage,
    chassisPackage,
    powerStage,
    tirePackage,
    transPackage,
    brakePackage,
    aeroPackage,
    springFrontMin,
    springFrontMax,
    springRearMin,
    springRearMax,
    aeroFrontMin,
    aeroFrontMax,
    aeroRearMin,
    aeroRearMax,
    rideFrontMin,
    rideFrontMax,
    rideRearMin,
    rideRearMax,
    sliderLimitsSource,
    aspiration,
    inputDevice,
    units,
  ]);

  const saveDraftNow = () => {
    const customSlug = slugFromMakeModel(make, model);
    if (!activeGarageCar?.slug && !customSlug) {
      setDraftStatus("Type a make and model first.");
      return;
    }
    if (!persistDraft()) {
      setDraftStatus("Could not save this draft on the device. Storage may be full.");
      return;
    }
    setDraftStatus("Draft saved on this device.");
  };

  const deploy = () => {
    const cfg = snapshotDraft() as TuneConfig;
    persistDraft();
    onDeploy(cfg);

    if (sliderLimitsSource === "user" && make && model) {
      const springsComplete =
        springFrontMin !== "" &&
        springFrontMax !== "" &&
        springRearMin !== "" &&
        springRearMax !== "";
      const rideComplete =
        rideFrontMin !== "" &&
        rideFrontMax !== "" &&
        rideRearMin !== "" &&
        rideRearMax !== "";
      saveUserSliderLimits(make, model, {
        springs: springsComplete
          ? {
              unit: units.springs,
              frontMin: springFrontMin,
              frontMax: springFrontMax,
              rearMin: springRearMin,
              rearMax: springRearMax,
            }
          : undefined,
        ride: rideComplete
          ? {
              frontMin: rideFrontMin,
              frontMax: rideFrontMax,
              rearMin: rideRearMin,
              rearMax: rideRearMax,
            }
          : undefined,
        aero:
          aeroFrontMax !== "" || aeroRearMax !== ""
            ? {
                unit: "kg",
                frontMin: aeroFrontMin === "" ? 0 : aeroFrontMin,
                frontMax: aeroFrontMax === "" ? null : aeroFrontMax,
                rearMin: aeroRearMin === "" ? 0 : aeroRearMin,
                rearMax: aeroRearMax === "" ? null : aeroRearMax,
              }
            : undefined,
      });
    }
  };

  return (

    <div className="mx-auto flex min-h-full max-w-[820px] flex-col px-4 py-4 pb-2 sm:px-6">

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--ts-font-heading)] text-xl font-bold tracking-tight">Manual setup</h1>
          <p className="mt-0.5 text-xs text-[var(--ts-muted)]">
            {draftStatus ??
              (carsLoading ? "Loading car database…" : `${carCount || 644} cars in database`)}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {onMyTunes && (
            <Button variant="outline" className="flex-1 px-3 text-xs sm:flex-none" onClick={onMyTunes}>
              My tunes
            </Button>
          )}
          <div className="flex-1 sm:w-[150px] sm:flex-none">
            <SegmentedControl options={["quick", "full"] as const} value={mode} onChange={setMode} />
          </div>
        </div>
      </header>

      <TuneSummaryChips
        items={[
          { label: "Car", value: `${make} ${model}` },
          { label: "Class", value: `${carClass} ${pi}` },
          { label: "Mode", value: activeMode?.label ?? tuneId, accent: activeMode?.color },
          {
            label: "Drive",
            value: drivetrainSwap !== STOCK_DRIVETRAIN ? `${driveType}↑` : driveType,
          },
          { label: "Weight", value: `${Math.round(weight)} ${weightLabel(units)}` },
          { label: "Est PI", value: `~${estimatedPi}` },
        ]}
      />

      <div className="mt-4">
        <TuneSectionNav sections={sections} active={section} onChange={(id) => setSection(id as InputSection)} />
      </div>

      <div className="mt-4 space-y-[var(--ts-section-gap)]">

      {section === "car" && (
        <>
      <CarPicker
        make={make}
        model={model}
        driveType={driveType}
        cars={cars}
        carCount={carCount}
        units={units}
        pinnedCars={pinnedCars}
        lookupGarage={lookupGarage}
        measuredSlugs={measuredSlugs}
        onSelect={(patch, meta) => {
          const slim =
            (meta?.slug ? garageCars.find((c) => c.slug === meta.slug) : null) ??
            (patch.make && patch.model ? lookupGarage(patch.make, patch.model) : null);
          const apply = (garage: typeof slim) => {
            const slug = meta?.slug ?? garage?.slug;
            const keep =
              !!slug &&
              !!garage &&
              (favorites.has(slug) ||
                owned.has(slug) ||
                hasSavedCarSetup(slug, garage.make, garage.model));
            if (keep && garage && slug) {
              const resumed = resumeCarProfile(slug, garage, cars, units, sliderLimitsFile);
              applyTuneDraft(resumed.config);
              if (resumed.section) setSection(resumed.section);
              if (resumed.mode) setMode(resumed.mode);
              setStockDisplacementCc(garage.tuneSpecs?.displacementCc ?? null);
              setClassPlanNote("");
              if (
                resumed.config.springFrontMin == null &&
                resumed.config.springFrontMax == null &&
                resumed.config.make &&
                resumed.config.model
              ) {
                const limits = findSliderLimits(
                  sliderLimitsFile,
                  resumed.config.make,
                  resumed.config.model,
                );
                applySliderLimits(limits, units.springs);
              }
              setDraftStatus("Loaded your last setup for this car.");
              return;
            }

            const merged = mergeGarageIntoDraft(patch, garage, cars, units);
            applyTuneDraft(merged);
            if (garage?.tuneSpecs?.aspiration && !merged.aspiration) {
              setAspiration(aspirationFromGarage(garage.tuneSpecs.aspiration));
            }
            if (garage?.tuneSpecs?.maxTorqueLbFt) {
              setStockTorqueLbFt(garage.tuneSpecs.maxTorqueLbFt);
              setEngineBaseTorqueLbFt(garage.tuneSpecs.maxTorqueLbFt);
            }
            setStockDisplacementCc(garage?.tuneSpecs?.displacementCc ?? null);
            setEngineSwap("None (Stock)");
            setDrivetrainSwap(STOCK_DRIVETRAIN);
            setWeightPackage("stock");
            setChassisPackage("stock");
            setPowerStage("stock");
            setTransPackage("race");
            setBrakePackage("sport");
            setAeroPackage("none");
            setHasAero(false);
            setClassPlanNote("");
            const front = merged.tireWF ?? "275/35R19";
            const rear = merged.tireWR ?? "285/35R19";
            setStockTireWF(front);
            setStockTireWR(rear);
            const tires = applyTirePackage({ packageId: "semi", stockFront: front, stockRear: rear });
            setTirePackage("semi");
            setCompound(tires.compound);
            setTireWF(tires.tireWF);
            setTireWR(tires.tireWR);
            const mMake = merged.make ?? patch.make ?? make;
            const mModel = merged.model ?? patch.model ?? model;
            if (mMake && mModel) {
              const limits = findSliderLimits(sliderLimitsFile, mMake, mModel);
              applySliderLimits(limits, units.springs);
            }
          };
          apply(slim);
          if (slim && !slim.tuneSpecs) {
            void enrichGarage(slim).then((full) => apply(full));
          }
        }}
      />
      {activeGarageCar && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={owned.has(activeGarageCar.slug) ? "outline" : "secondary"}
            className="h-9 px-3 text-xs"
            onClick={() => {
              const slug = activeGarageCar.slug;
              const already = owned.has(slug);
              toggleOwned(slug);
              if (!already) persistDraft();
            }}
          >
            {owned.has(activeGarageCar.slug) ? "✓ I have this car" : "I have this car"}
          </Button>
          <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
            {owned.has(activeGarageCar.slug)
              ? "Specs and Build stay on this device. Pick this car again and they’re still here."
              : "Mark it so the details you type in Specs and Build don’t get wiped next time."}
          </p>
        </div>
      )}
      <CarPhotoHero
        make={make}
        model={model}
        driveType={driveType}
        status={status}
        url={url}
        subtitle={`${carClass} ${pi} PI · ${driveType} · ${Math.round(weight)} ${weightLabel(units)}`}
      />
      <ManualGaragePanel
        car={activeGarageCar}
        enrich={enrichGarage}
        onLoadSaved={onLoadSaved}
        onBrowseTunes={onMyTunes}
      />
        </>
      )}

      {section === "tune" && (
        <>
      <div>
        <Label>Tune mode</Label>
        <TuneModeGrid value={tuneId} onChange={handleModeChange} />
      </div>
      <Card className="space-y-3">
        <Label>Drive type</Label>
        <SegmentedControl options={DRIVE_TYPES} value={driveType} onChange={handleDriveTypeChange} />
        <Label>Drivetrain conversion</Label>
        <select
          value={drivetrainSwap}
          onChange={(e) => commitDrivetrain(e.target.value)}
          className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 text-sm"
        >
          {dtOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
          {usingWikiDrivetrain
            ? `Stock is ${stockDriveType}. Wiki lists ${dtOptions.length - 1} conversion${dtOptions.length === 2 ? "" : "s"} for this chassis — applies drive layout, weight, and front %.`
            : `Stock is ${stockDriveType}. No wiki list for this car — showing common conversions. Updates drive layout, weight, and front %.`}
        </p>
      </Card>
        </>
      )}

      {section === "specs" && (
        <>
      <div className="grid gap-[var(--ts-section-gap)] md:grid-cols-2">
        <Card>
          <Label>Weight & PI</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight ({weightLabel(units)})</Label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(+e.target.value)}
                className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 font-[family-name:var(--ts-font-mono)]"
              />
            </div>
            <div>
              <Label>PI</Label>
              <input
                type="number"
                value={pi}
                onChange={(e) => setPi(+e.target.value)}
                className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 font-[family-name:var(--ts-font-mono)]"
              />
            </div>
          </div>
          {weightCheck.severity !== "ok" && (
            <p
              className={[
                "mt-2 text-xs",
                weightCheck.severity === "error" ? "text-[var(--ts-danger)]" : "text-[var(--ts-warning)]",
              ].join(" ")}
            >
              {weightCheck.message}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CLASSES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarClass(c)}
                className={[
                  "min-h-9 min-w-9 rounded-[var(--ts-radius-sm)] border px-2 font-[family-name:var(--ts-font-mono)] text-xs",
                  carClass === c
                    ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                    : "border-[var(--ts-border)] text-[var(--ts-muted)]",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <Label>Weight distribution</Label>
            <span className="font-[family-name:var(--ts-font-mono)] text-sm text-[var(--ts-accent)]">
              {weightDist}% front
            </span>
          </div>
          <input
            type="range"
            min={35}
            max={65}
            value={weightDist}
            onChange={(e) => setWeightDist(+e.target.value)}
            className="w-full"
          />
          <p className="mt-2 text-[10px] text-[var(--ts-muted)]">
            {weightDist}F / {100 - weightDist}R
            {drivetrainSwap !== STOCK_DRIVETRAIN ? ` · after ${drivetrainSwap}` : ""}
          </p>
        </Card>
      </div>
      <Card className="space-y-3">
        <Label>In-game spring min / max</Label>
        <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
          Auto-filled from{" "}
          {sliderLimitsSource === "measured"
            ? "GameDB extract (measured)"
            : sliderLimitsSource === "user"
              ? "your saved overrides"
              : sliderLimitsSource === "estimated"
                ? "weight-based estimates"
                : "carSliderLimits.json when available"}
          . Edit to match Tune → Springs in FH6; values save when you deploy.
          Extract real ranges: <code className="text-[var(--ts-muted)]">scripts/EXTRACT-GAMEDB.md</code>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <Label>Front min</Label>
            <input
              type="number"
              value={springFrontMin}
              onChange={(e) => {
                setSpringFrontMin(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Front max</Label>
            <input
              type="number"
              value={springFrontMax}
              onChange={(e) => {
                setSpringFrontMax(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Rear min</Label>
            <input
              type="number"
              value={springRearMin}
              onChange={(e) => {
                setSpringRearMin(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Rear max</Label>
            <input
              type="number"
              value={springRearMax}
              onChange={(e) => {
                setSpringRearMax(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
        </div>
      </Card>
      <Card className="space-y-3">
        <Label>In-game ride height min / max (cm)</Label>
        <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
          Soft / High ends from Tune → Alignment &amp; Ride Height. Measured for GR86 and 430
          Scuderia; other cars use the FH6 envelope until you type the in-game numbers.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <Label>Front min</Label>
            <input
              type="number"
              step={0.1}
              value={rideFrontMin}
              onChange={(e) => {
                setRideFrontMin(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Front max</Label>
            <input
              type="number"
              step={0.1}
              value={rideFrontMax}
              onChange={(e) => {
                setRideFrontMax(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Rear min</Label>
            <input
              type="number"
              step={0.1}
              value={rideRearMin}
              onChange={(e) => {
                setRideRearMin(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
          <div>
            <Label>Rear max</Label>
            <input
              type="number"
              step={0.1}
              value={rideRearMax}
              onChange={(e) => {
                setRideRearMax(e.target.value === "" ? "" : +e.target.value);
                setSliderLimitsSource("user");
              }}
              placeholder="auto"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm"
            />
          </div>
        </div>
      </Card>
        </>
      )}

      {section === "engine" && mode === "full" && (
        <>
      <Card className="space-y-3">
        <Label>Engine swap</Label>
        <select
          value={engineSwap}
          onChange={(e) => handleSwapChange(e.target.value)}
          className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 text-sm"
        >
          {swapOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
          {usingWikiSwaps
            ? `${swapOptions.length - 1} conversions available for this car (Forza Wiki). Power and weight are estimated from displacement and induction.`
            : "No per-car conversion list for this car — showing common swaps."}
        </p>
        <Label>Drivetrain conversion</Label>
        <select
          value={drivetrainSwap}
          onChange={(e) => commitDrivetrain(e.target.value)}
          className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 text-sm"
        >
          {dtOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
          Active layout: {driveType}
          {drivetrainSwap !== STOCK_DRIVETRAIN ? ` via ${drivetrainSwap}` : " (stock)"}.
          Same control as Mode — changes weight and front balance for the tune math.
        </p>
        <Label>Aspiration</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {ASPIRATIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAspiration(a.id)}
              className={[
                "rounded-[var(--ts-radius-sm)] border p-2.5 text-left text-xs",
                aspiration === a.id
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-[var(--ts-border)] text-[var(--ts-muted)]",
              ].join(" ")}
            >
              <div className="font-semibold">{a.label}</div>
              <div className="mt-0.5 text-[10px] opacity-80">{a.desc}</div>
            </button>
          ))}
        </div>
        <Label>Input device</Label>
        <div className="flex flex-wrap gap-2">
          {INPUT_DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setInputDevice(d.id)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs",
                inputDevice === d.id
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-[var(--ts-border)] text-[var(--ts-muted)]",
              ].join(" ")}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-1">
        <Label>Upgrade packages</Label>
        <p className="mb-3 text-[10px] leading-snug text-[var(--ts-dim)]">
          Weight, power path, tires, gearbox, brakes, and aero — feeds the tune math and PI estimate.
        </p>
        <UpgradePackagesCard
          weightPackage={weightPackage}
          chassisPackage={chassisPackage}
          powerStage={powerStage}
          tirePackage={tirePackage}
          transPackage={transPackage}
          brakePackage={brakePackage}
          aeroPackage={aeroPackage}
          engineSwapped={engineSwap !== "None (Stock)"}
          estimatedPi={estimatedPi}
          estimatedClass={classForEstimatedPi(estimatedPi)}
          targetClass={targetClass}
          onWeight={handleWeightPackage}
          onChassis={handleChassisPackage}
          onPower={handlePowerStage}
          onTires={handleTirePackage}
          onTrans={handleTransPackage}
          onBrakes={setBrakePackage}
          onAero={handleAeroPackage}
          onTargetClass={setTargetClass}
          onApplyClassPlan={applyClassPlan}
          classPlanNote={classPlanNote}
        />
      </Card>

      <div className="grid gap-[var(--ts-section-gap)] md:grid-cols-2">
        <Card className="space-y-3">
          <Label>Tires & RPM</Label>
          <select
            value={compound}
            onChange={(e) => setCompound(e.target.value)}
            className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3"
          >
            {["Stock", "Street", "Sport", "Race Semi-Slick", "Race Slick", "Rally", "Drag"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div>
            <div className="mb-1 flex justify-between text-xs text-[var(--ts-muted)]">
              <span>Redline</span>
              <span className="text-[var(--ts-accent)]">{redlineRpm.toLocaleString()} rpm</span>
            </div>
            <input type="range" min={5000} max={10000} step={100} value={redlineRpm} onChange={(e) => setRedlineRpm(+e.target.value)} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Peak torque RPM</Label>
              <input type="number" value={peakTorqueRpm} onChange={(e) => setPeakTorqueRpm(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
            <div>
              <Label>Max torque ({torqueLabel(units)})</Label>
              <input type="number" value={maxTorque} onChange={(e) => setMaxTorque(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
            <div>
              <Label>Gears</Label>
              <input type="number" min={2} max={10} value={gears} onChange={(e) => setGears(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
            <div>
              <Label>Top speed ({speedLabel(units)})</Label>
              <input type="number" value={topspeed} onChange={(e) => setTopspeed(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Front tire</Label>
              <input value={tireWF} onChange={(e) => setTireWF(e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
            <div>
              <Label>Rear tire</Label>
              <input value={tireWR} onChange={(e) => setTireWR(e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
            </div>
          </div>
        </Card>
        <Card className="space-y-3">
          <Label>Surface & aero</Label>
          <SegmentedControl options={["Road", "Dirt", "Snow", "Mixed"] as const} value={surface as "Road"} onChange={(v) => setSurface(v)} />
          <Button variant={hasAero ? "outline" : "ghost"} full onClick={() => setHasAero(!hasAero)}>
            Aero package: {hasAero ? "Installed" : "None"}
          </Button>
          {hasAero && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Front DF</Label>
                <input type="number" value={aeroF} onChange={(e) => setAeroF(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
              </div>
              <div>
                <Label>Rear DF</Label>
                <input type="number" value={aeroR} onChange={(e) => setAeroR(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
              </div>
              <div>
                <Label>Drag Cd</Label>
                <input type="number" step={0.01} value={dragCd} onChange={(e) => setDragCd(+e.target.value)} className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 font-[family-name:var(--ts-font-mono)] text-sm" />
              </div>
            </div>
          )}
        </Card>
      </div>
        </>
      )}

      </div>

      {mode === "quick" && section !== "engine" && (
        <p className="mt-4 text-center text-[11px] leading-snug text-[var(--ts-dim)]">
          Quick mode uses PI-based math. Switch to Full for engine, gearing, and RPM tuning.
        </p>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 mt-auto bg-gradient-to-t from-[var(--ts-bg)] via-[var(--ts-bg)]/95 to-transparent px-4 pb-2 pt-5 sm:-mx-6 sm:px-6 md:static md:mx-0 md:mt-6 md:bg-none md:p-0">
        <div className="mx-auto flex max-w-[820px] flex-col gap-2 sm:flex-row sm:items-stretch">
          <Button
            variant="outline"
            className="w-full px-3 py-2 text-xs sm:w-auto sm:shrink-0 md:text-sm"
            onClick={saveDraftNow}
          >
            Save draft
          </Button>
          <div className="flex min-w-0 flex-1 gap-2">
            {sectionIndex > 0 && (
              <Button variant="ghost" className="shrink-0 px-3 py-2 text-xs md:text-sm" onClick={goPrev}>
                ← Back
              </Button>
            )}
            {sectionIndex < sectionOrder.length - 1 ? (
              <Button variant="primary" className="min-w-0 flex-1 px-4 py-2 text-xs md:text-sm" onClick={goNext}>
                {sections.find((s) => s.id === sectionOrder[sectionIndex + 1])?.label} →
              </Button>
            ) : (
              <Button variant="cta" className="min-w-0 flex-1 px-4 py-2 text-xs md:text-sm" onClick={deploy}>
                Deploy tune
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>

  );

}

