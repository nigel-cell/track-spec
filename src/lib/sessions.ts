import { TRACK_SPEC_HTTP_PORT } from "./telemetry";
import { formatSpeedKmh, type TuneUnits } from "./units";
import { formatDelta } from "./lapTime";

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

export interface SessionTuneLink {
  tuneId: string;
  make: string;
  model: string;
  carClass: string;
  pi: number;
  driveType: string;
  surface: string;
}

export interface StintSummary {
  lapCount: number;
  bestLap: number | null;
  bestLapLabel: string | null;
  averageLap: number | null;
  averageLapLabel: string | null;
  consistencyPct: number | null;
  topSpeedKmh: number | null;
  carsUsed: Array<{ carOrdinal: number; carPI: number }>;
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
  trackLabel?: string | null;
  trackTags?: string[];
  tune?: SessionTuneLink | null;
}

export interface SessionDetail extends Omit<SessionSummary, "lapCount"> {
  laps: StoredLap[];
  stint?: StintSummary;
  lapCount?: number;
}

/** Active session without full traces — for Live timing sheet. */
export interface ActiveSession extends SessionSummary {
  laps: Array<{
    id: string;
    lapNumber: number;
    time: number;
    timeLabel: string;
    topSpeedKmh?: number | null;
    recordedAt: string;
  }>;
  stint?: StintSummary;
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
  carOrdinal: number;
  carPI: number;
  sessionId: string;
  lapId: string;
  recordedAt: string;
  carsUsed?: ClassRecordCar[];
  trackLabel?: string | null;
}

export interface CarRecord {
  carOrdinal: number;
  carClass: number;
  classLabel: string;
  carPI: number;
  bestLap: number;
  bestLapLabel: string;
  sessionId: string;
  lapId: string;
  recordedAt: string;
  trackLabel?: string | null;
  topSpeedKmh?: number | null;
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

export async function fetchCarRecords(host = ""): Promise<CarRecord[]> {
  const res = await fetch(`${apiBase(host)}/api/records/cars`);
  if (!res.ok) throw new Error("Failed to load car records");
  return res.json();
}

export async function updateSessionMeta(
  id: string,
  patch: { trackLabel?: string | null; trackTags?: string[]; tune?: SessionTuneLink | null },
  host = "",
): Promise<SessionDetail> {
  const res = await fetch(`${apiBase(host)}/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update session");
  return res.json();
}

export async function updateActiveSession(
  patch: { trackLabel?: string | null; trackTags?: string[]; tune?: SessionTuneLink | null },
  host = "",
): Promise<ActiveSession> {
  const res = await fetch(`${apiBase(host)}/api/sessions/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update active session");
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

export function sessionToCsv(
  detail: SessionDetail,
  units: TuneUnits,
  carName: string,
): string {
  const rows = buildTimingSheetRows(detail.laps, detail.bestLap);
  const header = [
    "Lap",
    "Time",
    "GapToBest",
    "GapToPrev",
    "TopSpeed",
    "Car",
    "Class",
    "PI",
    "Track",
    "Tune",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.lapNumber,
        row.timeLabel,
        row.isBest ? "0" : formatDelta(row.gapToBest),
        row.gapToPrev == null ? "" : formatDelta(row.gapToPrev),
        formatSpeedKmh(row.topSpeedKmh, units),
        `"${carName.replace(/"/g, '""')}"`,
        getClassLabel(detail.carClass),
        detail.carPI,
        `"${(detail.trackLabel || "").replace(/"/g, '""')}"`,
        `"${detail.tune ? `${detail.tune.tuneId} ${detail.tune.make} ${detail.tune.model}`.trim().replace(/"/g, '""') : ""}"`,
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
