/**
 * Session lap timing + persistence for Track Spec relay.
 */

function isValidLapTime(t) {
  return typeof t === "number" && t > 0 && t < 3600 && Number.isFinite(t);
}

const { createLapDeltaRecorder } = require("./lapDelta");
const { createSessionStore } = require("./sessionStore");

function createLapTracker() {
  const state = {
    carOrdinal: null,
    sessionBest: null,
    lastCompletedLap: null,
    prevCurrentLap: 0,
    completedLaps: 0,
    inTimedRun: false,
    lastIsRaceOn: 0,
    lastRecordedLapTime: null,
  };

  const deltaRecorder = createLapDeltaRecorder();
  const sessionStore = createSessionStore();

  function resetSession() {
    state.sessionBest = null;
    state.lastCompletedLap = null;
    state.prevCurrentLap = 0;
    state.completedLaps = 0;
    state.inTimedRun = false;
    state.lastRecordedLapTime = null;
    deltaRecorder.reset();
  }

  function recordCompletion(time) {
    if (!isValidLapTime(time)) return false;
    if (time === state.lastCompletedLap) return false;
    state.lastCompletedLap = time;
    state.completedLaps += 1;
    const isNewBest = state.sessionBest === null || time < state.sessionBest;
    if (isNewBest) state.sessionBest = time;
    return isNewBest;
  }

  function enrich(telemetry) {
    const {
      isRaceOn,
      carOrdinal,
      currentLap,
      lastLap,
      bestLap,
      lapNumber,
      speedKmh,
    } = telemetry;

    if (carOrdinal > 0 && state.carOrdinal !== null && carOrdinal !== state.carOrdinal) {
      resetSession();
    }
    if (carOrdinal > 0) state.carOrdinal = carOrdinal;

    if (isRaceOn === 0 && state.lastIsRaceOn === 1) {
      state.inTimedRun = false;
    }
    state.lastIsRaceOn = isRaceOn;

    const moving = (speedKmh ?? 0) > 8;
    const hasLapClock = isValidLapTime(currentLap) || isValidLapTime(lastLap);
    state.inTimedRun =
      isRaceOn === 1 && moving && (hasLapClock || typeof lapNumber === "number");

    if (state.inTimedRun) sessionStore.touchSession(telemetry);

    if (isValidLapTime(lastLap)) {
      recordCompletion(lastLap);
    }

    if (
      isValidLapTime(state.prevCurrentLap) &&
      isValidLapTime(currentLap) &&
      currentLap < state.prevCurrentLap - 2 &&
      currentLap < 8
    ) {
      recordCompletion(state.prevCurrentLap);
    }
    if (isValidLapTime(currentLap)) {
      state.prevCurrentLap = currentLap;
    }

    const gameBest = isValidLapTime(bestLap) ? bestLap : null;
    const sessionBest = state.sessionBest ?? gameBest;
    const lapElapsed = isValidLapTime(currentLap) ? currentLap : null;

    const deltaResult = deltaRecorder.update(telemetry, {
      inTimedRun: state.inTimedRun,
      sessionBest,
    });

    let lapDelta = deltaResult.lapDelta;
    let deltaAligned = deltaResult.deltaAligned;
    let sessionLapRecorded = false;

    if (
      deltaResult.lapCompleted &&
      deltaResult.lapCompleted.time !== state.lastRecordedLapTime
    ) {
      sessionStore.recordLap(telemetry, deltaResult.lapCompleted);
      state.lastRecordedLapTime = deltaResult.lapCompleted.time;
      sessionLapRecorded = true;
    }

    const lapTopSpeedKmh = deltaResult.lapTopSpeedKmh ?? null;

    if (lapDelta == null && state.inTimedRun && lapElapsed != null && sessionBest != null) {
      lapDelta = lapElapsed - sessionBest;
      deltaAligned = false;
    }

    const displayLast = isValidLapTime(lastLap) ? lastLap : state.lastCompletedLap;
    const displayLapNum =
      typeof lapNumber === "number" && lapNumber >= 0 ? lapNumber + 1 : state.completedLaps + 1;

    const classBest = sessionStore.getClassBest(telemetry.carClass);
    const activeSession = sessionStore.getActiveSession();
    const raceTime =
      typeof telemetry.currentRaceTime === "number" && telemetry.currentRaceTime > 0
        ? telemetry.currentRaceTime
        : null;

    return {
      ...telemetry,
      raceMode: state.inTimedRun,
      sessionBest,
      classBest,
      lastLap: displayLast,
      lapElapsed,
      lapDelta,
      deltaAligned,
      lapNumber: state.inTimedRun ? displayLapNum : null,
      completedLaps: state.completedLaps,
      sessionLapRecorded,
      raceTime,
      lapTopSpeedKmh,
      // Lightweight timing sheet for Live UI (no traces).
      sessionLaps: activeSession?.laps ?? [],
      sessionId: activeSession?.id ?? null,
    };
  }

  return {
    enrich,
    resetSession,
    listSessions: () => sessionStore.listSessions(),
    getSession: (id) => sessionStore.getSession(id),
    getActiveSession: () => sessionStore.getActiveSession(),
    listClassRecords: () => sessionStore.listClassRecords(),
    deleteSession: (id) => sessionStore.deleteSession(id),
  };
}

module.exports = { createLapTracker, isValidLapTime };
