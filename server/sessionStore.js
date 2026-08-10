/**
 * Persist driving sessions + completed laps + class bests to data/sessions.json
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 80;
const MAX_TRACE_POINTS = 400;
const CLASS_LABELS = ["D", "C", "B", "A", "S1", "S2", "R"];

function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { sessions: [], classRecords: {} };
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      classRecords: raw.classRecords && typeof raw.classRecords === "object" ? raw.classRecords : {},
    };
  } catch {
    return { sessions: [], classRecords: {} };
  }
}

function saveDb(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function decimateTrace(trace, maxPoints) {
  if (trace.length <= maxPoints) return trace;
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

  /** Rebuild class bests from all stored sessions (migration / repair). */
  function rebuildClassRecords() {
    const records = {};
    for (const session of db.sessions) {
      const key = classKey(session.carClass);
      if (!records[key]) {
        records[key] = {
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
        };
      }
      ensureCarsUsed(records[key], session.carOrdinal || 0, session.carPI ?? 0);
      for (const lap of session.laps || []) {
        if (!lap?.time || lap.time <= 0) continue;
        const prev = records[key];
        if (prev.bestLap != null && lap.time >= prev.bestLap) continue;
        prev.bestLap = lap.time;
        prev.bestLapLabel = formatLapTime(lap.time);
        prev.carOrdinal = session.carOrdinal || 0;
        prev.carPI = session.carPI ?? 0;
        prev.sessionId = session.id;
        prev.lapId = lap.id;
        prev.recordedAt = lap.recordedAt || session.startedAt;
      }
    }
    // Drop classes with no timed laps
    db.classRecords = Object.fromEntries(
      Object.entries(records).filter(([, r]) => r.bestLap != null),
    );
  }

  if (!db.classRecords || Object.keys(db.classRecords).length === 0) {
    rebuildClassRecords();
    if (Object.keys(db.classRecords).length > 0) saveDb(db);
  }

  function updateClassRecord(session, lap) {
    const key = classKey(session.carClass);
    const prev = db.classRecords[key];
    if (prev) {
      ensureCarsUsed(prev, session.carOrdinal || 0, session.carPI ?? 0);
      if (lap.time >= prev.bestLap) return false;
    }
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
    };
    ensureCarsUsed(next, session.carOrdinal || 0, session.carPI ?? 0);
    db.classRecords[key] = next;
    return true;
  }

  function touchSession(telemetry) {
    const now = Date.now();
    const { carOrdinal, carClass, carPerformanceIndex } = telemetry;

    if (
      active &&
      carOrdinal > 0 &&
      active.carOrdinal !== carOrdinal
    ) {
      active.endedAt = new Date(now).toISOString();
      active = null;
    }

    if (
      active &&
      active.lastActivity &&
      now - active.lastActivity > SESSION_GAP_MS
    ) {
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
      };
      db.sessions.unshift(active);
      if (db.sessions.length > MAX_SESSIONS) {
        db.sessions = db.sessions.slice(0, MAX_SESSIONS);
        rebuildClassRecords();
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
    if (last && Math.abs(last.time - completed.time) < 0.001) return last;

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
    if (active.bestLap == null || completed.time < active.bestLap) {
      active.bestLap = completed.time;
    }
    updateClassRecord(active, lap);
    saveDb(db);
    return lap;
  }

  function listSessions() {
    return db.sessions.map((s) => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      carOrdinal: s.carOrdinal,
      carClass: s.carClass,
      carPI: s.carPI,
      bestLap: s.bestLap,
      bestLapLabel: s.bestLap ? formatLapTime(s.bestLap) : null,
      lapCount: s.laps.length,
    }));
  }

  function getSession(id) {
    const s = findSession(id);
    if (!s) return null;
    return {
      ...s,
      bestLapLabel: s.bestLap ? formatLapTime(s.bestLap) : null,
      laps: s.laps.map((l) => ({
        ...l,
        timeLabel: formatLapTime(l.time),
      })),
    };
  }

  function getActiveSession() {
    if (!active) return null;
    return {
      id: active.id,
      startedAt: active.startedAt,
      endedAt: active.endedAt,
      carOrdinal: active.carOrdinal,
      carClass: active.carClass,
      carPI: active.carPI,
      bestLap: active.bestLap,
      bestLapLabel: active.bestLap ? formatLapTime(active.bestLap) : null,
      lapCount: active.laps.length,
      laps: active.laps.map((l) => ({
        id: l.id,
        lapNumber: l.lapNumber,
        time: l.time,
        timeLabel: formatLapTime(l.time),
        topSpeedKmh: l.topSpeedKmh ?? null,
        recordedAt: l.recordedAt,
      })),
    };
  }

  function listClassRecords() {
    return Object.values(db.classRecords)
      .slice()
      .sort((a, b) => (a.carClass ?? 0) - (b.carClass ?? 0));
  }

  function getClassBest(carClass) {
    const rec = db.classRecords[classKey(carClass)];
    return rec?.bestLap ?? null;
  }

  function deleteSession(id) {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter((s) => s.id !== id);
    if (active?.id === id) active = null;
    if (db.sessions.length !== before) {
      rebuildClassRecords();
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
    getClassBest,
    deleteSession,
    touchSession,
  };
}

module.exports = { createSessionStore, formatLapTime };
