/**
 * Distance-aligned lap delta — records session-best lap samples and compares
 * current lap time at the same distance along the track.
 */

const MIN_SAMPLE_GAP_M = 2;
const MAX_SAMPLES = 6000;

function isValidLapTime(t) {
  return typeof t === "number" && t > 0 && t < 3600 && Number.isFinite(t);
}

function createLapDeltaRecorder() {
  const state = {
    bestTrace: [],
    samples: [],
    lastSampleDist: null,
    lastPos: null,
    pathMeters: 0,
    prevLastLap: null,
    prevCurrentLap: 0,
    hasBestTrace: false,
    peakSpeedKmh: 0,
  };

  function reset() {
    state.bestTrace = [];
    state.samples = [];
    state.lastSampleDist = null;
    state.lastPos = null;
    state.pathMeters = 0;
    state.prevLastLap = null;
    state.prevCurrentLap = 0;
    state.hasBestTrace = false;
    state.peakSpeedKmh = 0;
  }

  function resetLapSamples() {
    state.samples = [];
    state.lastSampleDist = null;
    state.pathMeters = 0;
    state.lastPos = null;
    state.peakSpeedKmh = 0;
  }

  function tickPath(telemetry) {
    const { positionX, positionZ, speedKmh } = telemetry;
    if (positionX == null || positionZ == null || (speedKmh ?? 0) < 5) return;
    if (state.lastPos) {
      const step = Math.hypot(positionX - state.lastPos.x, positionZ - state.lastPos.z);
      if (step > 0.5 && step < 80) state.pathMeters += step;
    }
    state.lastPos = { x: positionX, z: positionZ };
  }

  function resolveDist(telemetry) {
    const d = telemetry.distanceTraveled;
    if (typeof d === "number" && d > 0 && Number.isFinite(d)) return d;
    return state.pathMeters;
  }

  function sample(dist, time) {
    if (!isValidLapTime(time)) return;
    if (state.lastSampleDist != null && dist - state.lastSampleDist < MIN_SAMPLE_GAP_M) return;
    state.lastSampleDist = dist;
    state.samples.push({ dist, time });
    if (state.samples.length > MAX_SAMPLES) {
      state.samples = state.samples.filter((_, i) => i % 2 === 0);
    }
  }

  function lookupTime(dist) {
    const trace = state.bestTrace;
    if (!trace.length) return null;
    if (dist <= trace[0].dist) return trace[0].time;
    const end = trace[trace.length - 1];
    if (dist >= end.dist) return end.time;

    let lo = 0;
    let hi = trace.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (trace[mid].dist <= dist) lo = mid;
      else hi = mid;
    }

    const a = trace[lo];
    const b = trace[hi];
    const span = b.dist - a.dist;
    if (span <= 0) return a.time;
    return a.time + ((dist - a.dist) / span) * (b.time - a.time);
  }

  function captureCompletedLap(time) {
    if (!isValidLapTime(time)) return null;
    const trace = state.samples.slice();
    if (trace.length < 8) return null;
    const last = trace[trace.length - 1];
    if (time > last.time) trace.push({ dist: last.dist + 0.001, time });
    const topSpeedKmh = state.peakSpeedKmh > 0 ? Math.round(state.peakSpeedKmh * 10) / 10 : null;
    return { time, trace, topSpeedKmh };
  }

  function setBestTrace(finishTime) {
    const trace = state.samples.slice();
    if (trace.length < 8) return;

    const last = trace[trace.length - 1];
    if (isValidLapTime(finishTime) && finishTime > last.time) {
      trace.push({ dist: last.dist + 0.001, time: finishTime });
    }

    state.bestTrace = trace;
    state.hasBestTrace = true;
  }

  /**
   * @param {object} telemetry
   * @param {{ inTimedRun: boolean, sessionBest: number | null }} ctx
   */
  function update(telemetry, ctx) {
    tickPath(telemetry);
    const dist = resolveDist(telemetry);
    const { currentLap, lastLap, speedKmh } = telemetry;
    const { inTimedRun, sessionBest } = ctx;

    let lapDelta = null;
    let deltaAligned = false;
    let lapCompleted = null;

    if (isValidLapTime(lastLap) && lastLap !== state.prevLastLap) {
      lapCompleted = captureCompletedLap(lastLap);
      if (sessionBest != null && lastLap <= sessionBest + 0.001) {
        setBestTrace(lastLap);
      }
      resetLapSamples();
      state.prevLastLap = lastLap;
    }

    if (
      isValidLapTime(state.prevCurrentLap) &&
      isValidLapTime(currentLap) &&
      currentLap < state.prevCurrentLap - 2 &&
      currentLap < 8
    ) {
      if (!lapCompleted) lapCompleted = captureCompletedLap(state.prevCurrentLap);
      if (sessionBest != null && state.prevCurrentLap <= sessionBest + 0.001) {
        setBestTrace(state.prevCurrentLap);
      }
      resetLapSamples();
    }
    if (isValidLapTime(currentLap)) state.prevCurrentLap = currentLap;

    if (inTimedRun && isValidLapTime(currentLap) && (speedKmh ?? 0) > 8) {
      sample(dist, currentLap);
      if ((speedKmh ?? 0) > state.peakSpeedKmh) state.peakSpeedKmh = speedKmh;
    }

    if (inTimedRun && isValidLapTime(currentLap) && state.hasBestTrace) {
      const refTime = lookupTime(dist);
      if (refTime != null) {
        lapDelta = currentLap - refTime;
        deltaAligned = true;
      }
    }

    return {
      lapDelta,
      deltaAligned,
      bestTracePoints: state.bestTrace.length,
      lapCompleted,
      lapTopSpeedKmh: state.peakSpeedKmh > 0 ? Math.round(state.peakSpeedKmh * 10) / 10 : null,
    };
  }

  return { update, reset };
}

module.exports = { createLapDeltaRecorder };
