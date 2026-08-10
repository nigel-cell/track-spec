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
    lastPbAlert: null,
    wasBeatingSession: false,
    wasBeatingClass: false,
    wasBeatingCar: false,
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
    state.lastPbAlert = null;
    state.wasBeatingSession = false;
    state.wasBeatingClass = false;
    state.wasBeatingCar = false;
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
    const classBest = sessionStore.getClassBest(telemetry.carClass);
    const carBest = sessionStore.getCarBest(telemetry.carOrdinal);
    const ghostTrace = sessionStore.getClassBestTrace(telemetry.carClass);

    const deltaResult = deltaRecorder.update(telemetry, {
      inTimedRun: state.inTimedRun,
      sessionBest,
      ghostTrace,
    });

    let lapDelta = deltaResult.lapDelta;
    let deltaAligned = deltaResult.deltaAligned;
    let ghostDelta = deltaResult.ghostDelta;
    let ghostAligned = deltaResult.ghostAligned;
    let sessionLapRecorded = false;
    let pbAlert = null;

    if (
      deltaResult.lapCompleted &&
      deltaResult.lapCompleted.time !== state.lastRecordedLapTime
    ) {
      const recorded = sessionStore.recordLap(telemetry, deltaResult.lapCompleted);
      state.lastRecordedLapTime = deltaResult.lapCompleted.time;
      sessionLapRecorded = true;

      if (recorded) {
        const kinds = [];
        if (recorded.isSessionBest) kinds.push("session");
        if (recorded.isClassBest) kinds.push("class");
        if (recorded.isCarBest) kinds.push("car");
        if (kinds.length) {
          pbAlert = {
            id: `${recorded.lap.id}-${kinds.join("-")}`,
            kinds,
            time: recorded.lap.time,
            timeLabel: recorded.lap.timeLabel,
            topSpeedKmh: recorded.lap.topSpeedKmh ?? null,
          };
          state.lastPbAlert = pbAlert;
        }
      }
    }

    const lapTopSpeedKmh = deltaResult.lapTopSpeedKmh ?? null;

    if (lapDelta == null && state.inTimedRun && lapElapsed != null && sessionBest != null) {
      lapDelta = lapElapsed - sessionBest;
      deltaAligned = false;
    }
    if (ghostDelta == null && state.inTimedRun && lapElapsed != null && classBest != null) {
      ghostDelta = lapElapsed - classBest;
      ghostAligned = false;
    }

    const beatingSession = state.inTimedRun && lapDelta != null && lapDelta < -0.02;
    const beatingClass = state.inTimedRun && ghostDelta != null && ghostDelta < -0.02;
    const beatingCar =
      state.inTimedRun &&
      carBest != null &&
      lapElapsed != null &&
      lapElapsed < carBest - 0.02 &&
      // crude mid-lap vs absolute car PB only when near end isn't known; use delta vs car when possible
      (ghostDelta != null ? ghostDelta < -0.02 : true);

    const crossedSession = beatingSession && !state.wasBeatingSession;
    const crossedClass = beatingClass && !state.wasBeatingClass;
    state.wasBeatingSession = beatingSession;
    state.wasBeatingClass = beatingClass;
    state.wasBeatingCar = beatingCar;

    // Mid-lap “purple sector” style alert when you go ahead of a PB reference.
    if (!pbAlert && (crossedSession || crossedClass)) {
      const kinds = [];
      if (crossedSession) kinds.push("session");
      if (crossedClass) kinds.push("class");
      pbAlert = {
        id: `live-${Date.now()}-${kinds.join("-")}`,
        kinds,
        live: true,
        time: lapElapsed,
        timeLabel: null,
        topSpeedKmh: lapTopSpeedKmh,
      };
    }

    const displayLast = isValidLapTime(lastLap) ? lastLap : state.lastCompletedLap;
    const displayLapNum =
      typeof lapNumber === "number" && lapNumber >= 0 ? lapNumber + 1 : state.completedLaps + 1;

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
      carBest,
      lastLap: displayLast,
      lapElapsed,
      lapDelta,
      deltaAligned,
      ghostDelta,
      ghostAligned,
      beatingSession,
      beatingClass,
      beatingCar,
      pbAlert: pbAlert || null,
      lapNumber: state.inTimedRun ? displayLapNum : null,
      completedLaps: state.completedLaps,
      sessionLapRecorded,
      raceTime,
      lapTopSpeedKmh,
      sessionLaps: activeSession?.laps ?? [],
      sessionId: activeSession?.id ?? null,
      trackLabel: activeSession?.trackLabel ?? null,
      trackTags: activeSession?.trackTags ?? [],
      sessionTune: activeSession?.tune ?? null,
    };
  }

  return {
    enrich,
    resetSession,
    listSessions: () => sessionStore.listSessions(),
    getSession: (id) => sessionStore.getSession(id),
    getActiveSession: () => sessionStore.getActiveSession(),
    listClassRecords: () => sessionStore.listClassRecords(),
    listCarRecords: () => sessionStore.listCarRecords(),
    updateSessionMeta: (id, patch) => sessionStore.updateSessionMeta(id, patch),
    setActiveTrack: (label, tags) => sessionStore.setActiveTrack(label, tags),
    setActiveTune: (tune) => sessionStore.setActiveTune(tune),
    deleteSession: (id) => sessionStore.deleteSession(id),
  };
}

module.exports = { createLapTracker, isValidLapTime };
