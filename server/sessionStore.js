/**
 * Persist driving sessions + completed laps to data/sessions.json
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 80;
const MAX_TRACE_POINTS = 400;

function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { sessions: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { sessions: [] };
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

function createSessionStore() {
  let db = loadDb();
  let active = null;

  function findSession(id) {
    return db.sessions.find((s) => s.id === id) ?? null;
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

  function deleteSession(id) {
    const before = db.sessions.length;
    db.sessions = db.sessions.filter((s) => s.id !== id);
    if (active?.id === id) active = null;
    if (db.sessions.length !== before) saveDb(db);
    return before !== db.sessions.length;
  }

  return { recordLap, listSessions, getSession, deleteSession, touchSession };
}

module.exports = { createSessionStore, formatLapTime };
