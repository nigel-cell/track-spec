/**
 * Persist driving sessions + laps + class/car bests to data/sessions.json
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 80;
const MAX_TRACE_POINTS = 400;
const MAX_GHOST_POINTS = 400;
const CLASS_LABELS = ["D", "C", "B", "A", "S1", "S2", "R"];

function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { sessions: [], classRecords: {}, carRecords: {} };
    }
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      classRecords: raw.classRecords && typeof raw.classRecords === "object" ? raw.classRecords : {},
      carRecords: raw.carRecords && typeof raw.carRecords === "object" ? raw.carRecords : {},
    };
  } catch {
    return { sessions: [], classRecords: {}, carRecords: {} };
  }
}

function saveDb(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function decimateTrace(trace, maxPoints) {
  if (!Array.isArray(trace) || trace.length <= maxPoints) return trace || [];
  const step = Math.ceil(trace.length / maxPoints);
  return trace.filter((_, i) => i % step === 0 || i === trace.length - 1);
}

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return "–:--.---";
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds - m * 60).toFixed(3).padStart(6, "0")}`;
}

function classKey(carClass) {
  return String(carClass ?? 0);
}

function carKey(carOrdinal) {
  return String(carOrdinal ?? 0);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t || "").trim()).filter(Boolean))].slice(0, 12);
}

function summarizeStint(session) {
  const laps = session.laps || [];
  if (!laps.length) {
    return {
      lapCount: 0,
      bestLap: null,
      bestLapLabel: null,
      averageLap: null,
      averageLapLabel: null,
      consistencyPct: null,
      topSpeedKmh: null,
      carsUsed: session.carOrdinal > 0 ? [{ carOrdinal: session.carOrdinal, carPI: session.carPI ?? 0 }] : [],
    };
  }

  const times = laps.map((l) => l.time).filter((t) => t > 0);
  const bestLap = times.length ? Math.min(...times) : null;
  const averageLap = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  let consistencyPct = null;
  if (bestLap != null && times.length >= 2) {
    const within = times.filter((t) => (t - bestLap) / bestLap <= 0.01).length;
    consistencyPct = Math.round((within / times.length) * 1000) / 10;
  }
  const topSpeedKmh = laps.reduce((acc, lap) => {
    const v = lap.topSpeedKmh;
    if (v == null || v <= 0) return acc;
    return acc == null || v > acc ? v : acc;
  }, null);

  const carsUsed = [];
  if (session.carOrdinal > 0) {
    carsUsed.push({ carOrdinal: session.carOrdinal, carPI: session.carPI ?? 0 });
  }

  return {
    lapCount: laps.length,
    bestLap,
    bestLapLabel: bestLap != null ? formatLapTime(bestLap) : null,
    averageLap,
    averageLapLabel: averageLap != null ? formatLapTime(averageLap) : null,
    consistencyPct,
    topSpeedKmh,
    carsUsed,
  };
}

function createSessionStore() {
  let db = loadDb();
  let active = null;

  function findSession(id) {
    return db.sessions.find((s) => s.id === id) ?? null;
  }

  function ensureCarsUsed(record, carOrdinal, carPI) {
    if (!Array.isArray(record.carsUsed)) record.carsUsed = [];
    if (!carOrdinal || carOrdinal <= 0) return;
    const existing = record.carsUsed.find((c) => c.carOrdinal === carOrdinal);
    if (existing) {
      if (carPI != null) existing.carPI = carPI;
      return;
    }
    record.carsUsed.push({ carOrdinal, carPI: carPI ?? 0 });
  }

  function rebuildRecords() {
    const classRecords = {};
    const carRecords = {};

    for (const session of db.sessions) {
      const cKey = classKey(session.carClass);
      if (!classRecords[cKey]) {
        classRecords[cKey] = {
          carClass: session.carClass ?? 0,
          classLabel: CLASS_LABELS[session.carClass] ?? "?",
          bestLap: null,
          bestLapLabel: null,
          carOrdinal: 0,
          carPI: 0,
          sessionId: null,
          lapId: null,
          recordedAt: null,
          carsUsed: [],
          bestTrace: null,
          trackLabel: null,
        };
      }
      ensureCarsUsed(classRecords[cKey], session.carOrdinal || 0, session.carPI ?? 0);

      const oKey = carKey(session.carOrdinal);
      if (session.carOrdinal > 0 && !carRecords[oKey]) {
        carRecords[oKey] = {
          carOrdinal: session.carOrdinal,
          carClass: session.carClass ?? 0,
          classLabel: CLASS_LABELS[session.carClass] ?? "?",
          carPI: session.carPI ?? 0,
          bestLap: null,
          bestLapLabel: null,
          sessionId: null,
          lapId: null,
          recordedAt: null,
          trackLabel: null,
          topSpeedKmh: null,
        };
      }

      for (const lap of session.laps || []) {
        if (!lap?.time || lap.time <= 0) continue;

        const classRec = classRecords[cKey];
        if (classRec.bestLap == null || lap.time < classRec.bestLap) {
          classRec.bestLap = lap.time;
          classRec.bestLapLabel = formatLapTime(lap.time);
          classRec.carOrdinal = session.carOrdinal || 0;
          classRec.carPI = session.carPI ?? 0;
          classRec.sessionId = session.id;
          classRec.lapId = lap.id;
          classRec.recordedAt = lap.recordedAt || session.startedAt;
          classRec.trackLabel = session.trackLabel || null;
          classRec.bestTrace = lap.trace
            ? decimateTrace(
                lap.trace.map((p) => ({ dist: p.d ?? p.dist, time: p.t ?? p.time })),
                MAX_GHOST_POINTS,
              )
            : null;
        }

        if (session.carOrdinal > 0) {
          const carRec = carRecords[oKey];
          if (carRec.bestLap == null || lap.time < carRec.bestLap) {
            carRec.bestLap = lap.time;
            carRec.bestLapLabel = formatLapTime(lap.time);
            carRec.carClass = session.carClass ?? 0;
            carRec.classLabel = CLASS_LABELS[session.carClass] ?? "?";
            carRec.carPI = session.carPI ?? 0;
            carRec.sessionId = session.id;
            carRec.lapId = lap.id;
            carRec.recordedAt = lap.recordedAt || session.startedAt;
            carRec.trackLabel = session.trackLabel || null;
          }
          if (lap.topSpeedKmh != null && (carRec.topSpeedKmh == null || lap.topSpeedKmh > carRec.topSpeedKmh)) {
            carRec.topSpeedKmh = lap.topSpeedKmh;
          }
        }
      }
    }

    db.classRecords = Object.fromEntries(
      Object.entries(classRecords).filter(([, r]) => r.bestLap != null),
    );
    db.carRecords = Object.fromEntries(
      Object.entries(carRecords).filter(([, r]) => r.bestLap != null),
    );
  }

  if (
    !db.classRecords ||
    Object.keys(db.classRecords).length === 0 ||
    !db.carRecords ||
    Object.keys(db.carRecords).length === 0
  ) {
    rebuildRecords();
    if (Object.keys(db.classRecords).length > 0 || Object.keys(db.carRecords).length > 0) {
      saveDb(db);
    }
  }

  function updateClassRecord(session, lap, fullTrace) {
    const key = classKey(session.carClass);
    const prev = db.classRecords[key];
    if (prev) {
      ensureCarsUsed(prev, session.carOrdinal || 0, session.carPI ?? 0);
      if (lap.time >= prev.bestLap) return false;
    }
    const ghostTrace = fullTrace
      ? decimateTrace(
          fullTrace.map((p) => ({ dist: p.dist ?? p.d, time: p.time ?? p.t })),
          MAX_GHOST_POINTS,
        )
      : null;
    const next = {
      carClass: session.carClass ?? 0,
      classLabel: CLASS_LABELS[session.carClass] ?? "?",
      bestLap: lap.time,
      bestLapLabel: formatLapTime(lap.time),
      carOrdinal: session.carOrdinal || 0,
      carPI: session.carPI ?? 0,
      sessionId: session.id,
      lapId: lap.id,
      recordedAt: lap.recordedAt,
      carsUsed: prev?.carsUsed ? [...prev.carsUsed] : [],
      bestTrace: ghostTrace,
      trackLabel: session.trackLabel || null,
    };
    ensureCarsUsed(next, session.carOrdinal || 0, session.carPI ?? 0);
    db.classRecords[key] = next;
    return true;
  }

  function updateCarRecord(session, lap) {
    if (!session.carOrdinal || session.carOrdinal <= 0) return false;
    const key = carKey(session.carOrdinal);
    const prev = db.carRecords[key];
    const isNewBest = !prev || lap.time < prev.bestLap;
    const next = {
      carOrdinal: session.carOrdinal,
      carClass: session.carClass ?? 0,
      classLabel: CLASS_LABELS[session.carClass] ?? "?",
      carPI: session.carPI ?? 0,
      bestLap: isNewBest ? lap.time : prev.bestLap,
      bestLapLabel: formatLapTime(isNewBest ? lap.time : prev.bestLap),
      sessionId: isNewBest ? session.id : prev.sessionId,
      lapId: isNewBest ? lap.id : prev.lapId,
      recordedAt: isNewBest ? lap.recordedAt : prev.recordedAt,
      trackLabel: isNewBest ? session.trackLabel || null : prev.trackLabel || null,
      topSpeedKmh: prev?.topSpeedKmh ?? null,
    };
    if (lap.topSpeedKmh != null && (next.topSpeedKmh == null || lap.topSpeedKmh > next.topSpeedKmh)) {
      next.topSpeedKmh = lap.topSpeedKmh;
    }
    db.carRecords[key] = next;
    return isNewBest;
  }

  function touchSession(telemetry) {
    const now = Date.now();
    const { carOrdinal, carClass, carPerformanceIndex } = telemetry;

    if (active && carOrdinal > 0 && active.carOrdinal !== carOrdinal) {
      active.endedAt = new Date(now).toISOString();
      active = null;
    }

    if (active && active.lastActivity && now - active.lastActivity > SESSION_GAP_MS) {
      active.endedAt = new Date(active.lastActivity).toISOString();
      active = null;
    }

    if (!active) {
      active = {
        id: crypto.randomUUID(),
        startedAt: new Date(now).toISOString(),
        endedAt: null,
        lastActivity: now,
        carOrdinal: carOrdinal || 0,
        carClass: carClass ?? 0,
        carPI: carPerformanceIndex ?? 0,
        bestLap: null,
        laps: [],
        trackLabel: null,
        trackTags: [],
        tune: null,
      };
      db.sessions.unshift(active);
      if (db.sessions.length > MAX_SESSIONS) {
        db.sessions = db.sessions.slice(0, MAX_SESSIONS);
        rebuildRecords();
      }
    }

    active.lastActivity = now;
    if (carOrdinal > 0) active.carOrdinal = carOrdinal;
    if (carClass != null) active.carClass = carClass;
    if (carPerformanceIndex != null) active.carPI = carPerformanceIndex;
  }

  function recordLap(telemetry, completed) {
    if (!completed?.time || !completed.trace?.length) return null;
    touchSession(telemetry);

    const last = active.laps[active.laps.length - 1];
    if (last && Math.abs(last.time - completed.time) < 0.001) {
      return { lap: last, isSessionBest: false, isClassBest: false, isCarBest: false };
    }

    const prevSessionBest = active.bestLap;
    const prevClassBest = getClassBest(active.carClass);
    const prevCarBest = getCarBest(active.carOrdinal);

    const lap = {
      id: crypto.randomUUID(),
      lapNumber: active.laps.length + 1,
      time: completed.time,
      timeLabel: formatLapTime(completed.time),
      topSpeedKmh:
        typeof completed.topSpeedKmh === "number" && completed.topSpeedKmh > 0
          ? completed.topSpeedKmh
          : null,
      recordedAt: new Date().toISOString(),
      trace: decimateTrace(completed.trace, MAX_TRACE_POINTS).map((p) => ({
        d: Math.round(p.dist * 10) / 10,
        t: Math.round(p.time * 1000) / 1000,
      })),
    };

    active.laps.push(lap);
    const isSessionBest = prevSessionBest == null || completed.time < prevSessionBest;
    if (isSessionBest) active.bestLap = completed.time;

    const isClassBest = updateClassRecord(active, lap, completed.trace);
    const isCarBest = updateCarRecord(active, lap);
    saveDb(db);

    return {
      lap,
      isSessionBest,
      isClassBest,
      isCarBest,
      prevSessionBest,
      prevClassBest,
      prevCarBest,
    };
  }

  function sessionSummary(s) {
    return {
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      carOrdinal: s.carOrdinal,
      carClass: s.carClass,
      carPI: s.carPI,
      bestLap: s.bestLap,
      bestLapLabel: s.bestLap ? formatLapTime(s.bestLap) : null,
      lapCount: s.laps.length,
      trackLabel: s.trackLabel || null,
      trackTags: normalizeTags(s.trackTags),
      tune: s.tune || null,
    };
  }

  function listSessions() {
    return db.sessions.map(sessionSummary);
  }

  function getSession(id) {
    const s = findSession(id);
    if (!s) return null;
    return {
      ...sessionSummary(s),
      laps: s.laps.map((l) => ({
        ...l,
        timeLabel: formatLapTime(l.time),
      })),
      stint: summarizeStint(s),
    };
  }

  function getActiveSession() {
    if (!active) return null;
    return {
      ...sessionSummary(active),
      laps: active.laps.map((l) => ({
        id: l.id,
        lapNumber: l.lapNumber,
        time: l.time,
        timeLabel: formatLapTime(l.time),
        topSpeedKmh: l.topSpeedKmh ?? null,
        recordedAt: l.recordedAt,
      })),
      stint: summarizeStint(active),
    };
  }

  function listClassRecords() {
    return Object.values(db.classRecords)
      .map(({ bestTrace, ...rest }) => rest)
      .sort((a, b) => (a.carClass ?? 0) - (b.carClass ?? 0));
  }

  function listCarRecords() {
    return Object.values(db.carRecords)
      .slice()
      .sort((a, b) => (a.bestLap ?? 0) - (b.bestLap ?? 0));
  }

  function getClassBest(carClass) {
    return db.classRecords[classKey(carClass)]?.bestLap ?? null;
  }

  function getCarBest(carOrdinal) {
    if (!carOrdinal || carOrdinal <= 0) return null;
    return db.carRecords[carKey(carOrdinal)]?.bestLap ?? null;
  }

  function getClassBestTrace(carClass) {
    const rec = db.classRecords[classKey(carClass)];
    return rec?.bestTrace || null;
  }

  function updateSessionMeta(id, patch = {}) {
    const s = findSession(id);
    if (!s) return null;
    if (patch.trackLabel !== undefined) {
      s.trackLabel = String(patch.trackLabel || "").trim().slice(0, 80) || null;
    }
    if (patch.trackTags !== undefined) {
      s.trackTags = normalizeTags(patch.trackTags);
    }
    if (patch.tune !== undefined) {
      s.tune = patch.tune
        ? {
            tuneId: String(patch.tune.tuneId || "").slice(0, 40),
            make: String(patch.tune.make || "").slice(0, 60),
            model: String(patch.tune.model || "").slice(0, 80),
            carClass: String(patch.tune.carClass || "").slice(0, 8),
            pi: Number(patch.tune.pi) || 0,
            driveType: String(patch.tune.driveType || "").slice(0, 8),
            surface: String(patch.tune.surface || "").slice(0, 24),
          }
        : null;
    }
    // Keep class/car record track labels in sync when PB session is labeled
    for (const rec of Object.values(db.classRecords)) {
      if (rec.sessionId === s.id) rec.trackLabel = s.trackLabel;
    }
    for (const rec of Object.values(db.carRecords)) {
      if (rec.sessionId === s.id) rec.trackLabel = s.trackLabel;
    }
    saveDb(db);
    return getSession(id);
  }

  function setActiveTrack(trackLabel, trackTags) {
    if (!active) return null;
    return updateSessionMeta(active.id, { trackLabel, trackTags });
  }

  function setActiveTune(tune) {
    if (!active) return null;
    return updateSessionMeta(active.id, { tune });
  }

  function deleteSession(id) {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter((s) => s.id !== id);
    if (active?.id === id) active = null;
    if (db.sessions.length !== before) {
      rebuildRecords();
      saveDb(db);
    }
    return before !== db.sessions.length;
  }

  return {
    recordLap,
    listSessions,
    getSession,
    getActiveSession,
    listClassRecords,
    listCarRecords,
    getClassBest,
    getCarBest,
    getClassBestTrace,
    updateSessionMeta,
    setActiveTrack,
    setActiveTune,
    deleteSession,
    touchSession,
  };
}

module.exports = { createSessionStore, formatLapTime, summarizeStint };
