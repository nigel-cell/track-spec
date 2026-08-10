/** Normalized telemetry frame used across Track Spec UI. */

import { formatLapTime } from "./lapTime";

export type BalanceState = "neutral" | "understeer" | "oversteer";

export interface TelemetryFrame {
  speedKmh: number;
  currentEngineRpm: number;
  engineMaxRpm: number;
  gear: number;
  steer: number;
  accelX: number;
  accelZ: number;
  accelInput: number;
  brakeInput: number;
  tireTempFL: number;
  tireTempFR: number;
  tireTempRL: number;
  tireTempRR: number;
  tireSlipFL: number;
  tireSlipFR: number;
  tireSlipRL: number;
  tireSlipRR: number;
  carOrdinal: number;
  carClass: number;
  carPerformanceIndex: number;
  carName?: string;
  raceMode: boolean;
  lapElapsed: number | null;
  lastLap: number | null;
  sessionBest: number | null;
  /** All-time best lap for this car class (across sessions on the PC). */
  classBest: number | null;
  /** All-time best lap for this car ordinal. */
  carBest: number | null;
  lapDelta: number | null;
  deltaAligned: boolean;
  /** Distance-aligned delta vs class PB ghost. */
  ghostDelta: number | null;
  ghostAligned: boolean;
  beatingSession: boolean;
  beatingClass: boolean;
  beatingCar: boolean;
  pbAlert: {
    id: string;
    kinds: string[];
    live?: boolean;
    time: number | null;
    timeLabel: string | null;
    topSpeedKmh?: number | null;
  } | null;
  lapNumber: number | null;
  completedLaps: number;
  /** Cumulative race/session clock from Forza when available. */
  raceTime: number | null;
  /** Peak speed so far on the current lap (km/h). */
  lapTopSpeedKmh: number | null;
  /** Completed laps in the active PC session (no traces — Live timing sheet). */
  sessionLaps: Array<{
    id: string;
    lapNumber: number;
    time: number;
    timeLabel: string;
    topSpeedKmh?: number | null;
  }>;
  sessionId: string | null;
  trackLabel: string | null;
  trackTags: string[];
  sessionTune: {
    tuneId: string;
    make: string;
    model: string;
    carClass: string;
    pi: number;
    driveType: string;
    surface: string;
  } | null;
  balance: BalanceState;
  positionX: number;
  positionY: number;
  positionZ: number;
  yaw: number;
}

/** Raw frame from Track Spec server.js WebSocket relay (camelCase). */
export interface RelayFrame {
  isRaceOn?: number;
  speedKmh?: number;
  currentEngineRpm?: number;
  engineMaxRpm?: number;
  gear?: number;
  steer?: number;
  accelX?: number;
  accelZ?: number;
  accelInput?: number;
  brakeInput?: number;
  tireTempFL?: number;
  tireTempFR?: number;
  tireTempRL?: number;
  tireTempRR?: number;
  tireSlipFL?: number;
  tireSlipFR?: number;
  tireSlipRL?: number;
  tireSlipRR?: number;
  tireSlipAngleFL?: number;
  tireSlipAngleFR?: number;
  tireSlipAngleRL?: number;
  tireSlipAngleRR?: number;
  carOrdinal?: number;
  carClass?: number;
  carPerformanceIndex?: number;
  currentLap?: number;
  lastLap?: number;
  bestLap?: number;
  lapNumber?: number | null;
  raceMode?: boolean;
  lapElapsed?: number | null;
  sessionBest?: number | null;
  classBest?: number | null;
  carBest?: number | null;
  lapDelta?: number | null;
  deltaAligned?: boolean;
  ghostDelta?: number | null;
  ghostAligned?: boolean;
  beatingSession?: boolean;
  beatingClass?: boolean;
  beatingCar?: boolean;
  pbAlert?: TelemetryFrame["pbAlert"];
  completedLaps?: number;
  currentRaceTime?: number;
  raceTime?: number | null;
  lapTopSpeedKmh?: number | null;
  sessionLaps?: Array<{
    id: string;
    lapNumber: number;
    time: number;
    timeLabel: string;
    topSpeedKmh?: number | null;
  }>;
  sessionId?: string | null;
  trackLabel?: string | null;
  trackTags?: string[];
  sessionTune?: TelemetryFrame["sessionTune"];
  distanceTraveled?: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  yaw?: number;
}

const CLASS_LETTERS = ["D", "C", "B", "A", "S1", "S2", "R"] as const;

export const TRACK_SPEC_HTTP_PORT = 3000;
export const TRACK_SPEC_WS_PORT = 3000;
export const FORZA_UDP_PORT = 9999;

export function getClassLabel(classVal: number): string {
  return CLASS_LETTERS[classVal] ?? "?";
}

export function getGearLabel(gear: number): string {
  if (gear === 0) return "R";
  if (gear === 11) return "N";
  return String(gear);
}

export function detectBalance(slipAngles: [number, number, number, number]): BalanceState {
  const front = (Math.abs(slipAngles[0]) + Math.abs(slipAngles[1])) / 2;
  const rear = (Math.abs(slipAngles[2]) + Math.abs(slipAngles[3])) / 2;
  if (Math.max(front, rear) < 0.5) return "neutral";
  if (front > rear * 1.2) return "understeer";
  if (rear > front * 1.2) return "oversteer";
  return "neutral";
}

/** Map Track Spec relay frame → normalized UI frame. */
export function fromRelay(f: RelayFrame, carName?: string): TelemetryFrame {
  const slipAngles: [number, number, number, number] = [
    f.tireSlipAngleFL ?? 0,
    f.tireSlipAngleFR ?? 0,
    f.tireSlipAngleRL ?? 0,
    f.tireSlipAngleRR ?? 0,
  ];

  return {
    speedKmh: f.speedKmh ?? 0,
    currentEngineRpm: f.currentEngineRpm ?? 0,
    engineMaxRpm: f.engineMaxRpm ?? 8000,
    gear: f.gear ?? 11,
    steer: f.steer ?? 0,
    accelX: f.accelX ?? 0,
    accelZ: f.accelZ ?? 0,
    accelInput: f.accelInput ?? 0,
    brakeInput: f.brakeInput ?? 0,
    tireTempFL: f.tireTempFL ?? 20,
    tireTempFR: f.tireTempFR ?? 20,
    tireTempRL: f.tireTempRL ?? 20,
    tireTempRR: f.tireTempRR ?? 20,
    tireSlipFL: f.tireSlipFL ?? 0,
    tireSlipFR: f.tireSlipFR ?? 0,
    tireSlipRL: f.tireSlipRL ?? 0,
    tireSlipRR: f.tireSlipRR ?? 0,
    carOrdinal: f.carOrdinal ?? 0,
    carClass: f.carClass ?? 0,
    carPerformanceIndex: f.carPerformanceIndex ?? 0,
    carName,
    raceMode: !!f.raceMode,
    lapElapsed: f.lapElapsed ?? null,
    lastLap: f.lastLap ?? null,
    sessionBest: f.sessionBest ?? null,
    classBest: f.classBest ?? null,
    carBest: f.carBest ?? null,
    lapDelta: f.lapDelta ?? null,
    deltaAligned: !!f.deltaAligned,
    ghostDelta: f.ghostDelta ?? null,
    ghostAligned: !!f.ghostAligned,
    beatingSession: !!f.beatingSession,
    beatingClass: !!f.beatingClass,
    beatingCar: !!f.beatingCar,
    pbAlert: f.pbAlert ?? null,
    lapNumber: f.lapNumber ?? null,
    completedLaps: f.completedLaps ?? 0,
    raceTime: f.raceTime ?? (typeof f.currentRaceTime === "number" && f.currentRaceTime > 0 ? f.currentRaceTime : null),
    lapTopSpeedKmh: f.lapTopSpeedKmh ?? null,
    sessionLaps: Array.isArray(f.sessionLaps) ? f.sessionLaps : [],
    sessionId: f.sessionId ?? null,
    trackLabel: f.trackLabel ?? null,
    trackTags: Array.isArray(f.trackTags) ? f.trackTags : [],
    sessionTune: f.sessionTune ?? null,
    balance: detectBalance(slipAngles),
    positionX: f.positionX ?? 0,
    positionY: f.positionY ?? 0,
    positionZ: f.positionZ ?? 0,
    yaw: f.yaw ?? 0,
  };
}

const MOCK_LAP_LENGTH = 88;
const MOCK_TRACK_LENGTH = 4200;

/** Simple distance-aligned mock after lap 1 completes. */
function mockDistanceDelta(t: number, lapElapsed: number, completed: number): { delta: number | null; aligned: boolean } {
  if (completed < 1) return { delta: null, aligned: false };
  const dist = (lapElapsed / MOCK_LAP_LENGTH) * MOCK_TRACK_LENGTH;
  const bestDist = MOCK_TRACK_LENGTH;
  const bestTime = MOCK_LAP_LENGTH + 0.842;
  const refTime = (dist / bestDist) * bestTime;
  return { delta: lapElapsed - refTime, aligned: true };
}

export function createMockFrame(t: number): TelemetryFrame {
  const throttle = t % 10 < 7 ? 1 : 0;
  const speed = throttle ? 120 + Math.sin(t * 0.3) * 40 : Math.max(0, 80 - (t % 10) * 8);
  const rpm = throttle ? 5500 + Math.sin(t * 0.5) * 1200 : 1200;
  const steer = Math.sin(t * 0.5) * 0.4;
  const latG = steer * (speed / 150) * 1.1;
  const longG = throttle ? 0.55 : -0.9;
  const baseTemp = 72 + Math.sin(t * 0.1) * 6;

  const lapElapsed = (t % MOCK_LAP_LENGTH) + 12;
  const completed = Math.floor(t / MOCK_LAP_LENGTH);
  const lastLap = completed > 0 ? MOCK_LAP_LENGTH + 0.842 : null;
  const sessionBest = completed > 0 ? MOCK_LAP_LENGTH + 0.842 : null;
  const { delta: lapDelta, aligned: deltaAligned } = mockDistanceDelta(t, lapElapsed, completed);
  const trackAngle = t * speed * 0.003;
  const dist = (lapElapsed / MOCK_LAP_LENGTH) * MOCK_TRACK_LENGTH;

  return {
    speedKmh: speed,
    currentEngineRpm: rpm,
    engineMaxRpm: 8500,
    gear: throttle ? 4 : 2,
    steer,
    accelX: latG,
    accelZ: longG,
    accelInput: throttle,
    brakeInput: throttle ? 0 : 0.7,
    tireTempFL: baseTemp + Math.abs(steer) * 12,
    tireTempFR: baseTemp + Math.abs(steer) * 12,
    tireTempRL: baseTemp,
    tireTempRR: baseTemp,
    tireSlipFL: Math.abs(steer) * 0.3,
    tireSlipFR: Math.abs(steer) * 0.3,
    tireSlipRL: 0.08,
    tireSlipRR: 0.08,
    carOrdinal: 4303,
    carClass: 4,
    carPerformanceIndex: 850,
    carName: "2012 Nissan GT-R Black Edition R35 (Touge Edition)",
    raceMode: speed > 8,
    lapElapsed,
    lastLap,
    sessionBest,
    classBest: sessionBest != null ? sessionBest + 0.35 : null,
    carBest: sessionBest,
    lapDelta,
    deltaAligned,
    ghostDelta: lapDelta != null ? lapDelta + 0.12 : null,
    ghostAligned: deltaAligned,
    beatingSession: lapDelta != null && lapDelta < 0,
    beatingClass: lapDelta != null && lapDelta < -0.1,
    beatingCar: false,
    pbAlert:
      completed > 0 && Math.floor(t) % MOCK_LAP_LENGTH === 2
        ? {
            id: `mock-pb-${completed}`,
            kinds: ["session", "car"],
            time: sessionBest,
            timeLabel: formatLapTime(sessionBest),
            topSpeedKmh: 182,
          }
        : null,
    lapNumber: completed + 1,
    completedLaps: completed,
    raceTime: completed * MOCK_LAP_LENGTH + lapElapsed,
    lapTopSpeedKmh: Math.max(speed, 160 + Math.sin(t * 0.2) * 20),
    sessionLaps: Array.from({ length: Math.min(completed, 8) }, (_, i) => {
      const n = completed - i;
      const time = MOCK_LAP_LENGTH + 0.842 + (completed - n) * 0.211;
      return {
        id: `mock-lap-${n}`,
        lapNumber: n,
        time,
        timeLabel: formatLapTime(time),
        topSpeedKmh: 178 + (n % 3) * 4.5,
      };
    }).reverse(),
    sessionId: "mock-session",
    trackLabel: "Mock Circuit",
    trackTags: ["test"],
    sessionTune: {
      tuneId: "Race",
      make: "Nissan",
      model: "GT-R",
      carClass: "S1",
      pi: 850,
      driveType: "AWD",
      surface: "Road",
    },
    balance: steer > 0.25 ? "understeer" : steer < -0.25 ? "oversteer" : "neutral",
    positionX: 200 * Math.cos(trackAngle),
    positionY: 0,
    positionZ: 200 * Math.sin(trackAngle),
    yaw: trackAngle,
    distanceTraveled: dist,
  };
}
