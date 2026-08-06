import type { LapTracePoint } from "./sessions";

export interface ComparePoint {
  dist: number;
  delta: number;
}

function lookupTime(trace: LapTracePoint[], dist: number): number | null {
  if (!trace.length) return null;
  if (dist <= trace[0].d) return trace[0].t;
  const end = trace[trace.length - 1];
  if (dist >= end.d) return end.t;

  let lo = 0;
  let hi = trace.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (trace[mid].d <= dist) lo = mid;
    else hi = mid;
  }

  const a = trace[lo];
  const b = trace[hi];
  const span = b.d - a.d;
  if (span <= 0) return a.t;
  return a.t + ((dist - a.d) / span) * (b.t - a.t);
}

/** Delta curve: lap B time − lap A time at aligned distance (positive = B slower). */
export function compareLapTraces(lapA: LapTracePoint[], lapB: LapTracePoint[]): ComparePoint[] {
  if (!lapA.length || !lapB.length) return [];

  const maxDist = Math.min(lapA[lapA.length - 1].d, lapB[lapB.length - 1].d);
  const minDist = Math.max(lapA[0].d, lapB[0].d);
  if (maxDist <= minDist) return [];

  const steps = 120;
  const out: ComparePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const dist = minDist + ((maxDist - minDist) * i) / steps;
    const tA = lookupTime(lapA, dist);
    const tB = lookupTime(lapB, dist);
    if (tA == null || tB == null) continue;
    out.push({ dist, delta: tB - tA });
  }
  return out;
}

export function formatDelta(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "−";
  return `${sign}${Math.abs(seconds).toFixed(3)}s`;
}
