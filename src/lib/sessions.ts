import { TRACK_SPEC_HTTP_PORT } from "./telemetry";

export interface LapTracePoint {
  d: number;
  t: number;
}

export interface StoredLap {
  id: string;
  lapNumber: number;
  time: number;
  timeLabel: string;
  /** Peak speed during the lap (km/h). */
  topSpeedKmh?: number | null;
  recordedAt: string;
  trace: LapTracePoint[];
}

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string | null;
  carOrdinal: number;
  carClass: number;
  carPI: number;
  bestLap: number | null;
  bestLapLabel: string | null;
  lapCount: number;
}

export interface SessionDetail extends Omit<SessionSummary, "lapCount"> {
  laps: StoredLap[];
}

/** Active session without full traces — for Live timing sheet. */
export interface ActiveSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  carOrdinal: number;
  carClass: number;
  carPI: number;
  bestLap: number | null;
  bestLapLabel: string | null;
  lapCount: number;
  laps: Array<{
    id: string;
    lapNumber: number;
    time: number;
    timeLabel: string;
    topSpeedKmh?: number | null;
    recordedAt: string;
  }>;
}

export interface ClassRecordCar {
  carOrdinal: number;
  carPI: number;
}

export interface ClassRecord {
  carClass: number;
  classLabel: string;
  bestLap: number;
  bestLapLabel: string;
  /** Car that set the class best. */
  carOrdinal: number;
  carPI: number;
  sessionId: string;
  lapId: string;
  recordedAt: string;
  /** Every car that posted a lap in this class. */
  carsUsed?: ClassRecordCar[];
}

function apiBase(host: string) {
  return `http://${host}:${TRACK_SPEC_HTTP_PORT}`;
}

export async function fetchSessions(host = ""): Promise<SessionSummary[]> {
  const res = await fetch(`${apiBase(host)}/api/sessions`);
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

export async function fetchSession(id: string, host = ""): Promise<SessionDetail> {
  const res = await fetch(`${apiBase(host)}/api/sessions/${id}`);
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function fetchActiveSession(host = ""): Promise<ActiveSession | null> {
  const res = await fetch(`${apiBase(host)}/api/sessions/active`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load active session");
  return res.json();
}

export async function fetchClassRecords(host = ""): Promise<ClassRecord[]> {
  const res = await fetch(`${apiBase(host)}/api/records`);
  if (!res.ok) throw new Error("Failed to load class records");
  return res.json();
}

export async function deleteSession(id: string, host = ""): Promise<void> {
  const res = await fetch(`${apiBase(host)}/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export function getClassLabel(classVal: number): string {
  return ["D", "C", "B", "A", "S1", "S2", "R"][classVal] ?? "?";
}

/** Build timing-sheet rows with gaps to session best and previous lap. */
export function buildTimingSheetRows(
  laps: Array<{
    id: string;
    lapNumber: number;
    time: number;
    timeLabel: string;
    topSpeedKmh?: number | null;
  }>,
  sessionBest: number | null = null,
) {
  const best =
    sessionBest ??
    laps.reduce<number | null>((acc, lap) => (!acc || lap.time < acc ? lap.time : acc), null);
  const topSpeedBest = laps.reduce<number | null>((acc, lap) => {
    const v = lap.topSpeedKmh;
    if (v == null || v <= 0) return acc;
    return acc == null || v > acc ? v : acc;
  }, null);

  return laps.map((lap, index) => {
    const prev = index > 0 ? laps[index - 1] : null;
    return {
      ...lap,
      topSpeedKmh: lap.topSpeedKmh ?? null,
      isBest: best != null && Math.abs(lap.time - best) < 0.0005,
      isTopSpeedBest:
        topSpeedBest != null &&
        lap.topSpeedKmh != null &&
        Math.abs(lap.topSpeedKmh - topSpeedBest) < 0.05,
      gapToBest: best != null ? lap.time - best : null,
      gapToPrev: prev ? lap.time - prev.time : null,
    };
  });
}
