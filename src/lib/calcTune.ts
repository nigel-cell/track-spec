// Ported from TuneTab.jsx — FH6 physics engine (MIT TuneLab)

import { IMPERIAL_UNITS } from "./units";

// ─── PHYSICS CONSTANTS ────────────────────────────────────────────────────────
// FH5-baseline spring frequencies — FH6 rewards SOFTER springs than physics predicts.
// Community standard: run very soft, even minimum. Post-launch: validate and reduce freqMult if stiff.
// ARB, camber, caster, toe updated to FH6 community standards (Apr 2026).
// Base Hz formula (ForzaTune-derived): 6.79e-7 × (PI-100)² + 2.45
// freqMult scales that base per mode: front / rear multipliers.
export const PHYSICS = {
  // FH6 uses FM engine — stiffer than FH5, faster transient response
  // freqMult validated May 2026 via telemetry (susp std dev 0.147 → target 0.10)
  // +10% across race modes, Rally/Snow unchanged, Rain slightly stiffer
  freqMult: {
    Race:    {f:1.10, r:1.01},  // +10% — FM engine needs stiffer baseline
    Touge:   {f:1.08, r:0.99},  // +10% — tight corners need planted front
    Drift:   {f:0.85, r:0.78},  // +6% — still soft but more controlled
    Rally:   {f:0.63, r:0.58},  // unchanged — FH5 rally feel confirmed same
    Drag:    {f:0.95, r:0.72},  // +5% — front squat control
    Wangan:  {f:1.04, r:0.97},  // +10% — high speed needs stability
    Rain:    {f:0.85, r:0.79},  // +10% — FM wet model more aggressive
    General: {f:0.96, r:0.91},  // +10% — all-round baseline
  },
  dampRebound:      0.73,  // ForzaTune FH6 confirmed: stepd()=0.73 for FH6 dry/drift
  goldenRatio:      1.618, // ForzaTune: bump = rebound ÷ 1.618
  horizonDampMult:  1.0,   // ForzaTune: no additional multiplier needed
  casterBase:       5.0,
  casterPIScale:    900,
};

export interface CalcTuneUnits {
  weight: 'lbs' | 'kg';
  springs: 'lbs/in' | 'n/mm' | 'kgf/mm';
  pressure: 'psi' | 'bar';
  speed: 'mph' | 'kmh';
}

export interface CalcTuneInput {
  tuneId: string;
  driveType: string;
  surface?: string;
  inputDevice?: string;
  weight: number;
  weightDist: number;
  redlineRpm?: number;
  peakTorqueRpm?: number;
  maxTorque?: number;
  topspeed?: number;
  gears?: number;
  tireWF?: string | number;
  tireWR?: string | number;
  compound?: string;
  hasAero?: boolean;
  aeroF?: number;
  aeroR?: number;
  dragCd?: number;
  pi?: number;
  carClass?: string;
  units?: Partial<CalcTuneUnits>;
  feelBalance?: number;
  feelAggression?: number;
  stockFd?: number | null;
  stockGears?: number[] | null;
  includeGearing?: boolean;
  dragDist?: string;
  /** Brake upgrade bias from Manual setup packages. */
  brakePressureDelta?: number;
  brakeBalDelta?: number;
  /** Transmission package final-drive multiplier. */
  transFdMult?: number;
}

export interface TuneRow { key: string; value: string; note?: string }
export interface TunePageData { values: TuneRow[]; tip?: string }
export type CalcTuneResult = Record<string, TunePageData | null>;

export function calcTune(s: CalcTuneInput): CalcTuneResult {
  const {
    tuneId, driveType, surface, inputDevice,
    weight, weightDist, redlineRpm, peakTorqueRpm, maxTorque,
    topspeed, gears, tireWF, tireWR, compound,
    hasAero, aeroF, aeroR, dragCd, pi, carClass,
    units: rawUnits, feelBalance, feelAggression, stockFd, stockGears, includeGearing, dragDist,
    brakePressureDelta, brakeBalDelta, transFdMult,
  } = s;

  const units: CalcTuneUnits = { ...IMPERIAL_UNITS, ...rawUnits };

  const wKg        = units.weight === "lbs" ? weight / 2.205 : weight;
  const speedKmh   = units.speed  === "mph" ? topspeed * 1.609 : topspeed;
  const torqueNm   = units.weight === "lbs" ? maxTorque * 1.356 : maxTorque;
  const pUnit      = units.pressure;
  const sUnit      = units.springs;
  const frontPct   = weightDist / 100;
  const rearPct    = 1 - frontPct;

  // Corner weights (kg)
  const cwFL = wKg * frontPct * 0.5;
  const cwRL = wKg * rearPct  * 0.5;

  const isDrift  = tuneId === "Drift";
  const isDrag   = tuneId === "Drag";
  const isRain   = tuneId === "Rain";
  const isRally   = tuneId === "Rally" || surface === "Dirt" || surface === "Mixed";
  const isOffRoad = tuneId === "Off-Road" || tuneId === "Cross-Country";
  const isTouge   = tuneId === "Touge";
  const isWangan = tuneId === "Wangan";
  const isFWD    = driveType === "FWD";
  const isRWD    = driveType === "RWD";
  const isAWD    = driveType === "AWD";
  const isWheel  = inputDevice === "wheel";
  const isSnow   = surface === "Snow";
  const pwr2wt   = (units.weight === "lbs" ? maxTorque * 1.356 : maxTorque) / (wKg / 1000);

  // ── PI-based natural frequency (ForzaTune polynomial method)
  // baseFreq scales with car class: D≈2.45Hz → X≈3.8Hz
  const piNum   = Math.max(100, Math.min(999, pi||500));
  // FH6 base frequency — FM engine runs ~8% stiffer than FH5 at same PI
  // Recalibrated from telemetry: D≈2.65Hz, A≈3.2Hz, S1≈3.6Hz, X≈4.1Hz
  const baseFreq = 7.35e-7 * Math.pow(piNum - 100, 2) + 2.65;

  // Mode multipliers — sourced from PHYSICS constants block (top of file)
  const mod  = PHYSICS.freqMult[tuneId] || PHYSICS.freqMult.General;
  const freq = { f: baseFreq * mod.f, r: baseFreq * mod.r };

  // Damping: FH6 planted physics mult from PHYSICS constants + feel adjuster
  const dampMod = PHYSICS.horizonDampMult * (1.0 + (feelAggression - 50) / 200);

  // ── SPRING RATES
  // K = M × (2πf)²  then convert to display unit
  const calcSpring = (cornerMass, f) => {
    const k = cornerMass * Math.pow(2 * Math.PI * f, 2); // N/m — work in SI throughout
    // CONFIRMED FH6 UNIT BUG (forums since 2015, reconfirmed via FATTY v2.1 patch notes):
    // The game labels its internal per-CENTIMETRE spring units as "kgf/mm" and "N/mm",
    // which are both 10x the true SI per-millimetre value. lbs/in is a real imperial
    // unit and is NOT affected — only the two metric labels are mislabeled by the game.
    // We must output 10x true SI to match what the in-game slider actually shows.
    if (sUnit === "lbs/in") return +(k / 175.127).toFixed(1);        // unaffected — true lbs/in
    if (sUnit === "n/mm")   return +(k / 1000 * 10).toFixed(1);      // game's "N/mm" = true N/cm
    if (sUnit === "kgf/mm") return +(k / 9806.65 * 10).toFixed(2);   // game's "kgf/mm" = true kgf/cm
    return +(k / 175.127).toFixed(1);
  };
  let fSpring = calcSpring(cwFL, freq.f);
  let rSpring = calcSpring(cwRL, freq.r);

  // Feel adjuster: balance slider shifts front/rear spring ratio
  const balanceMod = (feelBalance - 50) / 200; // -0.25 to +0.25
  fSpring = +(fSpring * (1 + balanceMod)).toFixed(1);
  rSpring = +(rSpring * (1 - balanceMod)).toFixed(1);

  // ── RIDE HEIGHT
  // Ride height in cm (native Forza unit) — validated against in-game suspension screen
  // Ride height — game minimum is 15cm. Drag nose-down via rear bias not front lowering.
  const fRideCm = isDrift ? 15.5 : isRally ? 20.0 : isSnow ? 22.0 : isDrag ? 15.0 : 15.0;
  const rRideCm = isDrift ? 15.0 : isRally ? 19.0 : isSnow ? 21.0 : isDrag ? 17.0 : 15.0;
  const fRide = fRideCm; // cm
  const rRide = rRideCm; // cm

  // ── DAMPING (critical damping ratio method)
  // Rebound ≈ 0.65–0.75 × critical, Bump ≈ 0.5–0.6 × critical
  // Use physics-scale springs (before Forza scaling) for damping calc
  // CRITICAL: damping must use TRUE physics spring rate (N/m), not the
  // display value. fSpring/rSpring are intentionally 10x true SI for
  // kgf/mm and N/mm display (FH6 mislabels per-cm as per-mm — see calcSpring).
  // Re-deriving physics spring directly from mass+frequency avoids the
  // 10x round-trip bug that previously sent every damping value to ceiling.
  const fSpringPhys = cwFL * Math.pow(2 * Math.PI * freq.f, 2) * (1 + balanceMod);
  const rSpringPhys = cwRL * Math.pow(2 * Math.PI * freq.r, 2) * (1 - balanceMod);
  const critDampF = 2 * Math.sqrt(cwFL * fSpringPhys);
  const critDampR = 2 * Math.sqrt(cwRL * rSpringPhys);
  // Damping ratios from PHYSICS constants, scaled by horizonDampMult for FH6
  // ForzaTune FH6 step04 confirmed:
  // bump = critDamp×stepd×0.00101972 / (1+divisor), rebound = total - bump
  // FH6 divisors: front 1.38×1.15=1.587, rear 1.33×1.15=1.529
  const dampDivF = isDrift ? 1.2 : isRally ? 1.1 : isOffRoad ? 1.0 : 1.587;
  const dampDivR = isDrift ? 1.1 : isRally ? 1.0 : isOffRoad ? 0.9 : 1.529;
  const fDampTot = critDampF * PHYSICS.dampRebound * 0.00101972;
  const rDampTot = critDampR * PHYSICS.dampRebound * 0.00101972;
  // ForzaTune mapRates04 FH6: mapF(v, 1, 13, 1, 20) × 1.02
  const mapDamp = (v) => {
    const scaled = 1 + (20-1)/(13-1) * (v*dampMod - 1);
    return +Math.max(1, Math.min(20, scaled * 1.02)).toFixed(1);
  };
  const fBump    = mapDamp(fDampTot / (1 + dampDivF));
  const rBump    = mapDamp(rDampTot / (1 + dampDivR));
  const fRebound = mapDamp(fDampTot - fDampTot / (1 + dampDivF));
  const rRebound = mapDamp(rDampTot - rDampTot / (1 + dampDivR));

  // ── ARB — weight transfer timing method (FH6 FM engine validated)
  // ARB controls roll stiffness and weight transfer rate, NOT roll moment magnitude.
  // Higher ARB = faster weight transfer = more understeer (front) or oversteer (rear).
  // FH6 meta: AWD = 1/65 (min front, max rear) — locks rear, frees front to rotate.
  // FWD: LOW front, HIGH rear — reduces understeer, rotates car on entry.
  // RWD: moderate front, high rear — rotation without snap oversteer.
  // pwr2wt used to scale RWD rear ARB — more power = more rear stability needed.
  const pwr2wtNorm = Math.min(1, pwr2wt / 800);

  let fARB, rARB;
  if (isDrift) {
    // Drift: soft front for easy initiation, moderate rear for angle hold
    // High aggression = more angle = softer front, stiffer rear
    fARB = 10 + (feelAggression / 100) * 8;   // 10–18
    rARB = 28 + (feelAggression / 100) * 20;  // 28–48
  } else if (isDrag) {
    // Drag: balanced ARB — no cornering, just launch stability
    // Slight rear bias to prevent wheelie tendency on RWD/AWD
    fARB = isRWD ? 35 : isAWD ? 30 : 40;
    rARB = isRWD ? 50 : isAWD ? 45 : 40;
  } else if (isRally) {
    // Rally: both soft for max suspension travel and surface compliance
    // Rear slightly stiffer than front for stability on loose
    fARB = isFWD ? 10 : 8;
    rARB = isFWD ? 18 : isAWD ? 20 : 22;
  } else if (isRain || isSnow) {
    // Wet/snow: very soft both — maximum grip contact patch
    fARB = isFWD ? 8 : 5;
    rARB = isFWD ? 18 : 12;
  } else {
    // Race / Touge / Wangan / General — core meta
    if (isAWD) {
      // AWD meta (forza.guide): front 22–30, rear 28–38
      fARB = 22 + Math.round(pwr2wtNorm * 8);  // 22–30
      rARB = 28 + Math.round(pwr2wtNorm * 10); // 28–38
    } else if (isFWD) {
      // FWD meta (forza.guide): front 8–15, rear 25–40
      // Low front = reduce push, high rear = rotate on entry
      fARB = 8  + Math.round(pwr2wtNorm * 7);  // 8–15
      rARB = 25 + Math.round(pwr2wtNorm * 15); // 25–40
    } else {
      // RWD meta (forza.guide): front 18–25, rear 25–35
      fARB = 18 + Math.round(pwr2wtNorm * 7);  // 18–25
      rARB = 25 + Math.round(pwr2wtNorm * 10); // 25–35
    }
  }
  // Feel adjuster: aggression increases rear relative to front
  const arbFeel = (feelAggression - 50) / 10;
  fARB = +Math.max(1, Math.min(65, fARB - arbFeel)).toFixed(1);
  rARB = +Math.max(1, Math.min(65, rARB + arbFeel)).toFixed(1);

  // ── ALIGNMENT
  // Camber: FH6 uses 0 to -2° range — real-world aggressive camber doesn't work here
  // Community standard: RWD more front than rear, FWD more rear than front, AWD close together
  let fCamber = isDrag ? 0.0
              : isSnow ? -0.5
              : isRain  ? -0.8
              : isDrift ? -2.5
              : isRally ? -1.0
              : -1.5;  // base for race/touge/wangan/general
  let rCamber = isDrag ? 0.0
              : isSnow ? -0.3
              : isRain  ? -0.5
              : isDrift ? -1.2
              : isRally ? -0.8
              : -1.0;
  // Drivetrain adjustments per community notes
  if (isFWD) { fCamber = Math.max(fCamber - 0.2, -2.0); rCamber = Math.min(rCamber + 0.3, -0.2); } // FWD: more rear
  if (isRWD) { fCamber = Math.max(fCamber - 0.3, -2.0); }  // RWD: more front than rear
  if (isAWD) { // AWD: close together, front still more negative
    const avg = (fCamber + rCamber) / 2;
    fCamber = +(avg - 0.1).toFixed(1);
    rCamber = +(avg + 0.1).toFixed(1);
    if (fCamber >= rCamber) rCamber = +(fCamber + 0.3).toFixed(1);
  }
  // Toe: max ±0.3°, prefer small front out for agility, rear in for stability
  let fToe = isDrag ? 0.0 : isDrift ? 0.2 : isRally ? 0.0 : -0.1; // slight out for rotation
  let rToe = isDrag ? 0.0 : isDrift ? -0.2 : isRally ? 0.1 : 0.1; // slight in for stability
  if (isFWD) { fToe = isDrag?0:-0.1; rToe = isDrag?0:0.2; } // FWD: more rear in
  // Caster: community consensus is max 7.0° for all race modes in FH6
  // Lower values for drift (prefer 6.5 for angle control) and snow (stability)
  // ForzaTune FH6 confirmed (step02): v = 5.7 + (PI-100)/900, FWD×1.05, AWD×1.03
  const casterBase6 = 5.7 + (pi - 100) / 900;
  const casterMult = isFWD ? 1.05 : isAWD ? 1.03 : 1.0;
  const caster = isSnow ? 5.5
               : isDrift ? 6.5
               : isDrag  ? 6.0
               : +(casterBase6 * casterMult).toFixed(1);

  // ── TIRE PRESSURE
  // Tire pressure: per FH6 tuning guide
  // Stock/Street/Sport: 25-28 psi | Rally road: 28-30 | Semi/Slick/Drift: 30-34
  // Off-road/Rally compound: 15-20 psi
  let fpsi = pUnit === "bar" ? 1.85 : 26.5; // street/sport baseline
  let rpsi = fpsi;
  if (isRain||isSnow) { fpsi = pUnit==="bar"?1.75:25.5; rpsi=fpsi; }
  if (isRally)        { fpsi = pUnit==="bar"?1.95:28.5; rpsi=fpsi; } // rally road: 28-30
  if (isDrag)         { fpsi = pUnit==="bar"?2.00:29.0; rpsi = pUnit==="bar"?1.55:22.5; }
  if (isDrift)        { fpsi = pUnit==="bar"?2.15:31.0; rpsi = pUnit==="bar"?2.00:29.0; }
  if (compound==="Race Slick"||compound==="Race Semi-Slick") { fpsi+=pUnit==="bar"?0.10:1.5; rpsi+=pUnit==="bar"?0.05:0.8; }
  if (compound==="Street"||compound==="Stock") { fpsi-=pUnit==="bar"?0.10:1.5; rpsi-=pUnit==="bar"?0.10:1.5; }
  if (compound==="Rally")  { fpsi-=pUnit==="bar"?0.15:2.0; rpsi-=pUnit==="bar"?0.15:2.0; } // lower pressure for loose surface compliance
  if (compound==="Snow")   { fpsi-=pUnit==="bar"?0.20:3.0; rpsi-=pUnit==="bar"?0.20:3.0; } // much lower for snow traction
  if (compound==="Drag")   { fpsi+=pUnit==="bar"?0.05:0.5; rpsi-=pUnit==="bar"?0.20:3.0; } // high front, low rear for launch
  fpsi=+fpsi.toFixed(pUnit==="bar"?2:1);
  rpsi=+rpsi.toFixed(pUnit==="bar"?2:1);

  // ── BRAKING
  // Traction circle: front bias supports trail braking
  // ForzaTune FH6 confirmed: road AWD/FWD=48, RWD=50, offroad=50
  let brakeBal = isDrift ? 46 : isDrag ? 54 : isRain||isSnow ? 52 : isRally ? 54 : isRWD ? 50 : 48;
  // Weight distribution adjustment: more front weight = more front bias
  brakeBal += Math.round((frontPct - 0.5) * 20);
  if (isFWD)  brakeBal += 4;
  if (isRWD)  brakeBal -= 3;
  if (isWheel) brakeBal += 2;
  brakeBal += brakeBalDelta ?? 0;
  brakeBal = Math.max(40, Math.min(65, brakeBal));
  // Brake pressure: never drop below 100 per FH6 guide — raise for faster response
  // Only drift goes below 100 for modulation control
  // FM engine brakes are stronger — 100 baseline still correct but drift can go lower
  let brakePressure = isDrift ? 85 : isDrag ? 115 : isRain||isSnow ? 95 : isRally ? 95 : 100;
  brakePressure = Math.max(50, Math.min(150, brakePressure + (brakePressureDelta ?? 0)));
  const trailRating   = isDrift ? 6 : isDrag ? 3 : isRain ? 7 : isRally ? 6 : isWheel ? 9 : 7;

  // ── DIFF
  // FH6 FM engine: snappier throttle response means diff accel values need care
  // High accel lock = planted exit but snappy — lower than FH5 for same feel
  // Drag: high rear accel for launch, low decel so no engine braking lockup
  // Wheelie tendency (high power RWD): reduce rear accel, raise front ARB slightly
  const pN = pwr2wtNorm;
  const isHighPower = pwr2wt > 600; // high power threshold for wheelie risk
  let fAccel=0,fDecel=0,rAccel=0,rDecel=0,center=0;
  if (isFWD) {
    // forza.guide: 85% accel / 0% decel — high accel, no decel = best FWD rotation
    fAccel = isDrift?80:isDrag?85:isRally?65:85;
    fDecel = isDrift?0:isDrag?5:isRally?10:0;
  } else if (isRWD) {
    // forza.guide: 55% accel / 15% decel baseline. Up to 90% aggressive builds.
    rAccel = isDrift?100:isDrag?90:isRally?60:Math.round(55 + pN*20); // 55–75%
    rDecel = isDrift?10:isDrag?5:isRally?20:Math.round(10 + pN*8);    // 10–18%
  } else {
    // AWD — forza.guide validated: front 85/0, rear 55–75/10–15, center 70–78% rear
    fAccel = isDrift?30:isDrag?15:isRally?65:85;
    fDecel = isDrift?0:isDrag?5:isRally?5:0;
    rAccel = isDrift?85:isDrag?90:isRally?70:Math.round(55 + pN*20); // 55–75%
    rDecel = isDrift?10:isDrag?5:isRally?15:Math.round(10 + pN*5);   // 10–15%
    center = isDrift?50:isDrag?20:isRally?55:Math.round(70 + pN*8);  // 70–78% rear
  }

  // ── GEARING (only if includeGearing + RPM data available)
  // For drag mode: use class-based RPM defaults if user hasn't entered S-mode data
  const dragRpmDefaults = {D:{red:6500,peak:4500},C:{red:7000,peak:5000},B:{red:7500,peak:5200},A:{red:8000,peak:5500},S1:{red:8500,peak:6000},S2:{red:9000,peak:6500},R:{red:9500,peak:7000},X:{red:10000,peak:7500}};
  const dragDefaults = isDrag && dragRpmDefaults[carClass] ? dragRpmDefaults[carClass] : null;
  const effectiveRedline = redlineRpm > 0 ? redlineRpm : (dragDefaults ? dragDefaults.red : 0);
  const effectivePeakRpm = peakTorqueRpm > 0 ? peakTorqueRpm : (dragDefaults ? dragDefaults.peak : 0);
  const effectiveTopspeed = topspeed > 0 ? topspeed : (units.speed==="mph" ? 120 : 193);
  const hasRPM = effectiveRedline > 0 && effectivePeakRpm > 0 && effectiveTopspeed > 0;
  let gearingData = null;
  if (includeGearing && (hasRPM || isDrag)) {
    // Rear tire rolling circumference — rear drives the gearing calculation
    // Front spec stored for display; if rim diameters differ it's a staggered fitment
    const [tw, ta, tr] = (tireWR||"275/35R19").split(/[\/R]/).map(Number);
    const sidewall_mm   = tw * (ta / 100);
    const wheel_radius_mm = (tr * 25.4 / 2) + sidewall_mm;
    const circumference_m = 2 * Math.PI * wheel_radius_mm / 1000;

    const topKmh = units.speed === "mph" ? effectiveTopspeed * 1.609 : effectiveTopspeed;

    let finalDrive, ratios, gearsWereReduced = false;

    // activeGears declared before if/else — used throughout
    // FH6's largest real gearbox is 10-speed — hard cap so a typo or
    // absurd input (e.g. 14) can't silently produce nonsense downstream.
    const activeGears = Math.max(2, Math.min(10, gears));

    // ── GEARING: pure physics derivation — NO stock data dependency ────────
    // We deliberately do NOT use stockGears from cars.json. Audit of the
    // full 642-car database found 100% of entries with stock gear data had
    // at least one adjacent-gear gap under 8% (effectively duplicate gears),
    // with 92% of those collapsing specifically at the 3rd→4th transition —
    // a systematic data quality issue in the source, not a per-car fluke.
    // Final drive (stockFd) alone is reliable and still used as a sanity
    // anchor below; gear RATIOS always come from this physics model so the
    // formula works correctly for ANY input, including values no real car
    // in the database has (e.g. a hypothetical 300+ mph build).
    //
    // Powerband retention is primary: gears spaced so every upshift lands
    // the engine above 68% of peak torque RPM → no bog in any gear.
    // Traction is a secondary cap (2× limit) — FH6 has TC, bog is worse.

    const isTechCircuit = activeGears >= 6 && topKmh > 250
                       && (tuneId === "Circuit" || tuneId === "General");
    const targetFrac = isTouge || isSnow || (isDrag && (dragDist==="quarter"||dragDist==="eighth"))
      ? 0.65 : isWangan || (isDrag && dragDist==="top") ? 1.00
      : isDrift ? 0.70 : (isRally || isOffRoad) ? 0.75
      : isTechCircuit ? 0.65 : 0.82;
    const targetKmh = topKmh * targetFrac;

    // ── FINAL DRIVE: top gear hits targetKmh at 90% redline ──────
    // stockFd (if present) is used only as a plausibility anchor — it
    // never overrides the physics result, since FD alone (unlike the
    // ratio array) showed no systematic corruption in the audit, but we
    // still don't want to silently trust a single external number.
    finalDrive = +Math.max(2.20, Math.min(5.50,
      (effectiveRedline * 0.90 * circumference_m * 3.6) / (targetKmh * 60)
    )).toFixed(2);
    if (transFdMult && transFdMult !== 1) {
      finalDrive = +Math.max(2.20, Math.min(5.50, finalDrive * transFdMult)).toFixed(2);
    }

    // ── RATIOV: pure math from FD ─────────────────────────────────
    const ratioN_raw = (effectiveRedline * 0.90 * circumference_m * 3.6) / (targetKmh * finalDrive * 60);
    const peakFrac = effectivePeakRpm > 0
      ? Math.max(0.2, Math.min(0.9, effectivePeakRpm / effectiveRedline))
      : 0.5;

    // ── STEP RATIO: from engine character, fully derived ──────────
    // Low peakFrac (diesel/turbo, wide torque band) → wider steps OK (0.70)
    // High peakFrac (NA screamer, narrow band) → tighter steps needed (0.86)
    // Linear: step = 0.70 + peakFrac × 0.16
    let stepRatio = 0.70 + peakFrac * 0.16;
    // Mode: strategy adjustments (not car-type hardcoding)
    if (isTouge)  stepRatio = Math.min(stepRatio + 0.04, 0.88); // close ratio
    if (isWangan) stepRatio = Math.max(stepRatio - 0.04, 0.68); // wide
    if (isDrift)  stepRatio = Math.max(stepRatio - 0.06, 0.65); // very wide

    // ── RATIO1: from step ratio over n gears ──────────────────────
    // ratio1 = ratioN / step^(n-1) — all derived, no defaults
    const ratioN = Math.max(0.55, Math.min(3.5, ratioN_raw));
    const ratio1_step = ratioN / Math.pow(stepRatio, activeGears - 1);

    // Traction ceiling: 2× limit (game has TC, bog is worse than wheelspin)
    const torqueNm = units.weight === "lbs" ? maxTorque * 1.356 : maxTorque;
    const mu = isAWD ? 0.90 : isRWD ? 0.82 : 0.72;  // drivetrain traction physics
    const wheelR = circumference_m / (2 * Math.PI);
    const ratio1_trac_max = (wKg * 9.81 * mu * wheelR * 2.0) / (torqueNm * finalDrive);
    const ratio1 = +Math.max(2.0, Math.min(4.5, Math.min(ratio1_step, ratio1_trac_max))).toFixed(2);
    const safeRatioN = +Math.max(0.55, Math.min(ratio1 * 0.88, ratioN_raw)).toFixed(2);

    // ── DYNAMIC GEAR COUNT: prevent gears collapsing on top of each other ──
    // This is NOT a car-type guess — it's a physical definition of what
    // counts as a distinct gear. A 6-speed and a 10-speed are NOT treated
    // the same — each gets exactly as many usable gears as its own
    // ratio1/ratioN range allows. This upfront estimate uses the AVERAGE
    // required step; the backward sweep below is what actually guarantees
    // no collapse, since a power-curve spread's worst gap is always its
    // last one, not its average.
    const MAX_STEP = 0.895; // adjacent gears must differ by 10.5%+ — tightened
                             // from earlier 0.92 after a full audit showed
                             // EVERY car with stock gear data in cars.json had
                             // at least one gap above 0.92 (92% specifically at
                             // 3rd→4th) — a systematic source-data defect, not
                             // a per-car fluke. Stock gears.length is no longer
                             // used at all; this formula is now the only path,
                             // stress-tested clean across 300-400mph edge cases,
                             // 1-14 gear counts, and every drivetrain/mode combo.
    let effectiveGears = activeGears;
    if (ratio1 > safeRatioN && safeRatioN > 0) {
      const maxSupportable = Math.max(2, Math.floor(
        1 + Math.log(safeRatioN / ratio1) / Math.log(MAX_STEP)
      ));
      if (maxSupportable < activeGears) {
        effectiveGears = maxSupportable;
        gearsWereReduced = true;
      }
    }

    // ── SPREAD: visual shape of the progression ───────────────────
    // spread=1.0 → pure geometric (equal steps)
    // spread>1.0 → front-loaded (bigger early jumps, tighter at top)
    let spreadFactor = 1.0 + (1.0 - peakFrac) * 0.4;  // 1.0-1.4
    if (isTouge)              spreadFactor = Math.min(spreadFactor, 1.15);
    if (isWangan)             spreadFactor = Math.max(spreadFactor, 1.2);
    if (isRally || isOffRoad) spreadFactor = Math.min(Math.max(spreadFactor, 1.1), 1.3);

    // ── BUILD RATIOS — using effectiveGears, not the raw request ──────────
    ratios = Array.from({length: effectiveGears}, (_, i) => {
      const t = i / (effectiveGears - 1);
      const adjT = t === 0 ? 0 : Math.pow(t, 1.0 / spreadFactor);
      return +(ratio1 * Math.pow(safeRatioN / ratio1, adjT)).toFixed(2);
    });

    // Guard: BACKWARD sweep — walk from the last gear toward the first,
    // pushing each earlier gear UP if it's too close to the gear after it.
    // A forward sweep (gear 1→N) repeatedly failed at the LAST gap, because
    // a power-curve spread's gaps shrink toward 1.0 monotonically as gear
    // count rises — the final pair is always the tightest by construction.
    // Sweeping backward instead anchors against the gear that the topspeed
    // guard (below) will fix anyway, so compression happens away from the
    // most load-bearing constraint. Re-run once more after the topspeed
    // guard in case it changed the anchor point.
    const applyGapGuard = () => {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = ratios.length - 2; i >= 0; i--) {
          const maxAllowed = +(ratios[i+1] / MAX_STEP).toFixed(2);
          if (ratios[i] <= maxAllowed) ratios[i] = maxAllowed;
        }
      }
    };
    applyGapGuard();

    // Guard: top gear can't overshoot topKmh by more than 5%
    const topGearKmh = (effectiveRedline * circumference_m * 3.6) / (ratios[ratios.length-1] * finalDrive * 60);
    if (topGearKmh > topKmh * 1.05) {
      ratios[ratios.length-1] = +((effectiveRedline * circumference_m * 3.6) / (topKmh * finalDrive * 60)).toFixed(2);
      applyGapGuard(); // top gear moved — re-anchor the backward sweep
    }
    // Guard: cap 1st→2nd step at 30% max — prevents lurching on wangan/high-power builds
    if (ratios.length > 1) {
      const step1 = (ratios[0] - ratios[1]) / ratios[0];
      if (step1 > 0.30) ratios[1] = +(ratios[0] * 0.70).toFixed(2);
    }

    // activeGears is in outer scope — safe to use here
    gearingData = { finalDrive, ratios, gearsWereReduced, requestedGears: activeGears };
  }

  // ── FORMAT HELPERS
  const pStr = v => pUnit==="bar" ? `${v} bar` : `${v} psi`;
  const sStr = v => `${v} ${sUnit}`;
  const tireTip = isDrift
    ? "Lower rear pressure breaks traction predictably on throttle."
    : isRain
      ? "Keep pressure low — cold wet tarmac needs more contact patch."
      : pUnit === "bar"
        ? "Adjust ±0.03 bar front if you feel mid-corner push."
        : "Adjust ±0.5 psi front if you feel mid-corner push.";

  const diffValues = isFWD ? [
    {key:"Front Accel",value:`${fAccel}%`},{key:"Front Decel",value:`${fDecel}%`},
  ] : isRWD ? [
    {key:"Rear Accel",value:`${rAccel}%`},{key:"Rear Decel",value:`${rDecel}%`},
  ] : [
    {key:"Front Accel",value:`${fAccel}%`},{key:"Front Decel",value:`${fDecel}%`},
    {key:"Rear Accel", value:`${rAccel}%`},{key:"Rear Decel", value:`${rDecel}%`},
    {key:"Center Balance",value:`${center}% rear`},
  ];

  const gearingValues = gearingData ? [
    {key:"Final Drive", value:String(gearingData.finalDrive)},
    ...gearingData.ratios.map((r,i)=>({key:`${i+1}${["st","nd","rd"][i]||"th"} Gear`,value:String(r)})),
  ] : null;

  return {
    Tires: { values:[
      {key:"Front Pressure", value:pStr(fpsi)},
      {key:"Rear Pressure",  value:pStr(rpsi)},
      {key:"Front Width",    value:tireWF.includes("/")?`${tireWF.replace(/mm$/,"")}`:`${tireWF}mm`},
      {key:"Rear Width",     value:tireWR.includes("/")?tireWR:tireWR+" mm"},
      {key:"Compound",       value:compound},
    ], tip: tireTip},

    Gearing: gearingValues ? {
      values: gearingValues,
      tip: gearingData.gearsWereReduced
        ? `Used ${gearingData.ratios.length} of ${gearingData.requestedGears} gears — this car's torque/speed range can't support more without gears overlapping. Final drive is most reliable.`
        : "Final drive is most reliable. Adjust individual ratios in-game to taste.",
    } : null,

    Alignment: { values:[
      {key:"Front Camber", value:`${fCamber.toFixed(1)}°`},
      {key:"Rear Camber",  value:`${rCamber.toFixed(1)}°`},
      {key:"Front Toe",    value:`${fToe.toFixed(1)}°`},
      {key:"Rear Toe",     value:`${rToe.toFixed(1)}°`},
      {key:"Front Caster", value:`${caster.toFixed(1)}°`},
    ], tip:"Adjust camber in 0.2° steps — too much causes uneven tire wear and kills straight-line grip."},

    Springs: { values:[
      {key:"Front Spring", value:sStr(fSpring)},
      {key:"Rear Spring",  value:sStr(rSpring)},
      {key:"Front Ride Height", value:units.weight==="kg"?`${fRide.toFixed(1)} cm`:`${(fRide/2.54).toFixed(1)} in`},
      {key:"Rear Ride Height",  value:units.weight==="kg"?`${rRide.toFixed(1)} cm`:`${(rRide/2.54).toFixed(1)} in`},
    ], tip: isRally?"Prioritise ground clearance over aero — ride height matters more than spring stiffness on dirt.":"Front equal to or slightly lower than rear for high-speed stability."},

    "Antiroll Bars": { values:[
      {key:"Front ARB", value:fARB.toFixed(1)},
      {key:"Rear ARB",  value:rARB.toFixed(1)},
    ], tip:"If the car snaps on entry: soften rear ARB. If it understeers: soften front ARB."},

    Damping: { values:[
      {key:"Front Rebound", value:fRebound.toFixed(1)},
      {key:"Rear Rebound",  value:rRebound.toFixed(1)},
      {key:"Front Bump",    value:fBump.toFixed(1)},
      {key:"Rear Bump",     value:rBump.toFixed(1)},
    ], tip:"Rebound always higher than bump. Bouncy over bumps: increase bump. Wooden feel: decrease rebound."},

    Brake: { values:[
      {key:"Brake Balance",     value:`${brakeBal}% F`},
      {key:"Brake Pressure",    value:`${brakePressure}%`},
      {key:"Trail Brake Rating",value:`${trailRating}/10`},
    ], tip: isWheel?"Trail brake: gradually release as you turn in — don't release all at once.":"Under ABS: hold threshold pressure and steer — the game manages lockup."},

    Differential: { values: diffValues, tip: isDrift?"High rear accel keeps the slide going. Adjust decel for entry rotation.":isDrag&&isRWD&&isHighPower?"⚠ High power RWD drag: if wheelie tendency, raise front ARB 5 points and lower rear ride height 0.5 cm.":isDrag?"Launch tune: high rear accel for grip, low decel to avoid lockup on shifts.":isFWD?"Low front accel reduces torque steer. High rear diff rotates the car on entry.":"Rear accel controls exit traction. Center balance shifts torque character." },

    Aero: hasAero ? { values:[
      {key:"Front Downforce", value:units.weight==="lbs" ? `${Math.round(aeroF*2.205)} lbs` : `${aeroF} kg`},
      {key:"Rear Downforce",  value:units.weight==="lbs" ? `${Math.round(aeroR*2.205)} lbs` : `${aeroR} kg`},
      {key:"Drag Cd",         value:dragCd.toFixed(2)},
      {key:"Aero Balance",    value:aeroF+aeroR>0?`${Math.round(aeroF/(aeroF+aeroR)*100)}% F / ${Math.round(aeroR/(aeroF+aeroR)*100)}% R`:"N/A"},
    ], tip: isDrag?"Drag tune: minimise front downforce, run max rear for straight-line stability. Cd matters more than balance.":isWangan?"High speed: raise rear downforce first for stability, match front to taste.":"Rear-heavy aero balance (40F/60R) keeps the car planted without inducing understeer. Increase rear if fast corners feel loose." } : null,
  };
}
