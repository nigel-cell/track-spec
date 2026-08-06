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

import { Button } from "../ui/Button";

import { Card, Label } from "../ui/Card";

import { SegmentedControl } from "../ui/SegmentedControl";

import { CarPhotoHero } from "./CarPhotoHero";

import { CarPicker } from "./CarPicker";

import { TuneModeGrid } from "./TuneModeGrid";
import { TuneSectionNav, TuneSummaryChips } from "./TuneSectionNav";



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

  aspiration?: import("../../data/engineData").AspirationId;

  inputDevice?: import("../../data/engineData").InputDeviceId;

  units?: TuneUnits;

}



interface TuneInputScreenProps {

  onDeploy: (config: TuneConfig) => void;

  onMyTunes?: () => void;

  initialDraft?: Partial<TuneConfig> | null;

  units: TuneUnits;

}



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



export function TuneInputScreen({ onDeploy, onMyTunes, initialDraft, units }: TuneInputScreenProps) {

  type InputSection = "car" | "tune" | "specs" | "engine";
  const [section, setSection] = useState<InputSection>("car");
  const [mode, setMode] = useState<"quick" | "full">("quick");

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
  const [aspiration, setAspiration] = useState<AspirationId>("turbo");
  const [inputDevice, setInputDevice] = useState<InputDeviceId>("controller");
  const [stockWeightLbs, setStockWeightLbs] = useState<number | null>(null);
  const [stockTorqueLbFt, setStockTorqueLbFt] = useState<number | null>(null);

  const [tireWF, setTireWF] = useState("275/35R19");

  const [tireWR, setTireWR] = useState("285/35R19");

  const [stockFd, setStockFd] = useState<number | null>(null);

  const [stockGears, setStockGears] = useState<number[] | null>(null);

  const prevUnitsRef = useRef(units);



  const { cars, makes, count: carCount, loading: carsLoading } = useCarDatabase();

  const { lookup: lookupGarage } = useForzaGarage();

  const { status, url } = useCarPhoto(make, model);

  const activeMode = TUNE_MODES.find((m) => m.id === tuneId);

  const sections: { id: InputSection; label: string; disabled?: boolean }[] = [
    { id: "car", label: "Car" },
    { id: "tune", label: "Mode" },
    { id: "specs", label: "Specs" },
    { id: "engine", label: "Engine", disabled: mode !== "full" },
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

  useEffect(() => {
    if (!initialDraft) return;
    if (initialDraft.make) setMake(initialDraft.make);
    if (initialDraft.model) setModel(initialDraft.model);
    if (initialDraft.driveType) setDriveType(initialDraft.driveType);
    if (initialDraft.weight) setWeight(initialDraft.weight);
    if (initialDraft.weightDist) setWeightDist(initialDraft.weightDist);
    if (initialDraft.pi) setPi(initialDraft.pi);
    if (initialDraft.carClass) setCarClass(initialDraft.carClass);
    if (initialDraft.tuneId) setTuneId(initialDraft.tuneId);
    if (initialDraft.mode) setMode(initialDraft.mode);
    if (initialDraft.compound) setCompound(initialDraft.compound);
    if (initialDraft.surface) setSurface(initialDraft.surface);
    if (initialDraft.redlineRpm) setRedlineRpm(initialDraft.redlineRpm);
    if (initialDraft.peakTorqueRpm) setPeakTorqueRpm(initialDraft.peakTorqueRpm);
    if (initialDraft.maxTorque) setMaxTorque(initialDraft.maxTorque);
    if (initialDraft.topspeed) setTopspeed(initialDraft.topspeed);
    if (initialDraft.gears) setGears(initialDraft.gears);
    if (initialDraft.hasAero !== undefined) setHasAero(initialDraft.hasAero);
    if (initialDraft.aeroF != null) setAeroF(initialDraft.aeroF);
    if (initialDraft.aeroR != null) setAeroR(initialDraft.aeroR);
    if (initialDraft.tireWF) setTireWF(initialDraft.tireWF);
    if (initialDraft.tireWR) setTireWR(initialDraft.tireWR);
    if (initialDraft.engineSwap) setEngineSwap(initialDraft.engineSwap);
    if (initialDraft.aspiration) setAspiration(initialDraft.aspiration);
    if (initialDraft.inputDevice) setInputDevice(initialDraft.inputDevice);
    if (initialDraft.dragCd != null) setDragCd(initialDraft.dragCd);
    if (initialDraft.stockFd !== undefined) setStockFd(initialDraft.stockFd);
    if (initialDraft.stockGears !== undefined) setStockGears(initialDraft.stockGears);
  }, [initialDraft]);

  useEffect(() => {
    const prev = prevUnitsRef.current;
    if (prev.weight === units.weight && prev.speed === units.speed) return;
    setWeight((w) => convertWeight(w, prev.weight, units.weight));
    setTopspeed((s) => convertSpeed(s, prev.speed, units.speed));
    setMaxTorque((t) => convertTorque(t, prev.weight, units.weight));
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

  const handleSwapChange = (swap: string) => {
    setEngineSwap(swap);
    if (swap === "None (Stock)") {
      if (stockWeightLbs != null) setWeight(units.weight === "lbs" ? stockWeightLbs : Math.round(stockWeightLbs / 2.205));
      return;
    }
    const patched = applyEngineSwapToConfig(
      { weight, maxTorque, weightDist, redlineRpm, peakTorqueRpm },
      swap,
      units,
      stockWeightLbs ?? undefined,
      stockTorqueLbFt ?? undefined,
    );
    if (patched.weight != null) setWeight(patched.weight);
    if (patched.maxTorque != null) setMaxTorque(patched.maxTorque);
    if (patched.weightDist != null) setWeightDist(patched.weightDist);
    if (patched.redlineRpm != null) setRedlineRpm(patched.redlineRpm);
    if (patched.peakTorqueRpm != null) setPeakTorqueRpm(patched.peakTorqueRpm);
    if (patched.aspiration) setAspiration(patched.aspiration);
  };



  const deploy = () =>

    onDeploy({

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

      includeGearing: mode === "full",

      hasAero,

      aeroF,

      aeroR,

      dragCd,

      tireWF,

      tireWR,

      stockFd,

      stockGears,

      engineSwap,

      aspiration,

      inputDevice,

      units,

    });



  return (

    <div className="mx-auto flex min-h-full max-w-[820px] flex-col px-4 py-4 pb-2 sm:px-6">

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--ts-font-heading)] text-xl font-bold tracking-tight">Manual setup</h1>
          <p className="mt-0.5 text-xs text-[var(--ts-muted)]">
            {carsLoading ? "Loading car database…" : `${carCount || 644} cars in database`}
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
          { label: "Weight", value: `${Math.round(weight)} ${weightLabel(units)}` },
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
        onSelect={(patch) => {
          const garage = patch.make && patch.model ? lookupGarage(patch.make, patch.model) : null;
          const merged = mergeGarageIntoDraft(patch, garage, cars, units);
          if (merged.make) setMake(merged.make);
          if (merged.model) setModel(merged.model);
          if (merged.driveType) setDriveType(merged.driveType);
          if (merged.weightDist != null) setWeightDist(merged.weightDist);
          if (merged.weight) setWeight(merged.weight);
          if (merged.pi) setPi(merged.pi);
          if (merged.carClass) setCarClass(merged.carClass);
          if (merged.stockFd !== undefined) setStockFd(merged.stockFd);
          if (merged.stockGears !== undefined) setStockGears(merged.stockGears);
          if (merged.redlineRpm) setRedlineRpm(merged.redlineRpm);
          if (merged.peakTorqueRpm) setPeakTorqueRpm(merged.peakTorqueRpm);
          if (merged.maxTorque) setMaxTorque(merged.maxTorque);
          if (merged.topspeed) setTopspeed(merged.topspeed);
          if (merged.gears) setGears(merged.gears);
          if (merged.compound) setCompound(merged.compound);
          if (merged.hasAero !== undefined) setHasAero(merged.hasAero);
          if (merged.aeroF != null) setAeroF(merged.aeroF);
          if (merged.aeroR != null) setAeroR(merged.aeroR);
          if (merged.tireWF) setTireWF(merged.tireWF);
          if (merged.tireWR) setTireWR(merged.tireWR);
          if (merged.aspiration) setAspiration(merged.aspiration);
          if (garage?.tuneSpecs?.aspiration && !merged.aspiration) {
            setAspiration(aspirationFromGarage(garage.tuneSpecs.aspiration));
          }
          if (merged.weight) {
            const lbs = units.weight === "lbs" ? merged.weight : merged.weight * 2.205;
            setStockWeightLbs(Math.round(lbs));
          }
          if (garage?.tuneSpecs?.maxTorqueLbFt) setStockTorqueLbFt(garage.tuneSpecs.maxTorqueLbFt);
        }}
      />
      <CarPhotoHero
        make={make}
        model={model}
        driveType={driveType}
        status={status}
        url={url}
        subtitle={`${carClass} ${pi} PI · ${driveType} · ${Math.round(weight)} ${weightLabel(units)}`}
      />
        </>
      )}

      {section === "tune" && (
        <>
      <div>
        <Label>Tune mode</Label>
        <TuneModeGrid value={tuneId} onChange={handleModeChange} />
      </div>
      <Card>
        <Label>Drive type</Label>
        <SegmentedControl options={DRIVE_TYPES} value={driveType} onChange={setDriveType} />
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
            min={40}
            max={60}
            value={weightDist}
            onChange={(e) => setWeightDist(+e.target.value)}
            className="w-full"
          />
          <p className="mt-2 text-[10px] text-[var(--ts-muted)]">{weightDist}F / {100 - weightDist}R</p>
        </Card>
      </div>
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
          {ENGINE_SWAPS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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

      <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-[var(--ts-border)] bg-[var(--ts-bg)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-[820px] gap-2">
          <Button variant="ghost" className="shrink-0" onClick={goPrev} disabled={sectionIndex <= 0}>
            Back
          </Button>
          {sectionIndex < sectionOrder.length - 1 ? (
            <Button variant="primary" full onClick={goNext}>
              Next: {sections.find((s) => s.id === sectionOrder[sectionIndex + 1])?.label}
            </Button>
          ) : (
            <Button variant="cta" full onClick={deploy}>
              Deploy tune
            </Button>
          )}
        </div>
      </div>

    </div>

  );

}

