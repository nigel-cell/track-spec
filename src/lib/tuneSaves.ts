import type { CalcTuneResult } from "./calcTune";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import { buildTuneFileData, parseTuneFile, serializeTuneFile, type TuneFileData } from "./tuneImportExport";

/** Same key as legacy TuneLab for cross-app persistence */
const SAVES_KEY = "tl_v1_saves";
const MAX_SAVES = 50;

export interface SavedTune {
  id: number;
  name: string;
  date: string;
  trackNote?: string;
  config: TuneConfig;
  balance: number;
  aggression: number;
  tunePages: CalcTuneResult;
}

function readRaw(): SavedTune[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTune[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(saves: SavedTune[]) {
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch {
    /* quota or private mode */
  }
}

export function listSavedTunes(): SavedTune[] {
  return readRaw();
}

export function listTunesForCar(make: string, model: string): SavedTune[] {
  const mk = make.toLowerCase();
  const md = model.toLowerCase();
  return readRaw().filter(
    (s) => s.config.make.toLowerCase() === mk && s.config.model.toLowerCase().includes(md.split(" '")[0]),
  );
}

export function saveTune(entry: Omit<SavedTune, "id" | "date"> & { date?: string }): SavedTune {
  const saves = readRaw();
  const record: SavedTune = {
    ...entry,
    id: Date.now(),
    date: entry.date ?? new Date().toLocaleDateString(),
  };
  writeRaw([record, ...saves].slice(0, MAX_SAVES));
  return record;
}

export function renameSavedTune(id: number, name: string, trackNote?: string): void {
  writeRaw(
    readRaw().map((s) =>
      s.id === id ? { ...s, name: name.trim() || s.name, trackNote: trackNote ?? s.trackNote } : s,
    ),
  );
}

export function deleteSavedTune(id: number): void {
  writeRaw(readRaw().filter((s) => s.id !== id));
}

export interface BulkTuneExport {
  version: 1;
  type: "track-spec-library";
  exported: string;
  tunes: TuneFileData[];
}

export function exportAllTunes(): string {
  const payload: BulkTuneExport = {
    version: 1,
    type: "track-spec-library",
    exported: new Date().toISOString(),
    tunes: readRaw().map((s) =>
      buildTuneFileData({
        name: s.name,
        date: s.date,
        config: s.config,
        balance: s.balance,
        aggression: s.aggression,
        tunePages: s.tunePages,
      }),
    ),
  };
  return JSON.stringify(payload, null, 2);
}

export function importBulkTunes(text: string): { imported: number; skipped: number } {
  try {
    const parsed = JSON.parse(text) as BulkTuneExport | TuneFileData;
    let tunes: TuneFileData[] = [];

    if ("type" in parsed && parsed.type === "track-spec-library" && Array.isArray(parsed.tunes)) {
      tunes = parsed.tunes;
    } else if ("type" in parsed && parsed.type === "track-spec-tune") {
      const single = parseTuneFile(text);
      if (single) tunes = [single];
    }

    let imported = 0;
    let skipped = 0;
    for (const t of tunes) {
      const file = parseTuneFile(JSON.stringify(t));
      if (!file) {
        skipped++;
        continue;
      }
      saveTune({
        name: file.name,
        config: file.config,
        balance: file.balance,
        aggression: file.aggression,
        tunePages: file.tunePages ?? ({} as CalcTuneResult),
      });
      imported++;
    }
    return { imported, skipped };
  } catch {
    return { imported: 0, skipped: 0 };
  }
}
