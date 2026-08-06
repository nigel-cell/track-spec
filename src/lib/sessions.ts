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

export async function deleteSession(id: string, host = ""): Promise<void> {
  const res = await fetch(`${apiBase(host)}/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export function getClassLabel(classVal: number): string {
  return ["D", "C", "B", "A", "S1", "S2", "R"][classVal] ?? "?";
}
