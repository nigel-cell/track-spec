import type { CalcTuneResult } from "./calcTune";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { SavedTune } from "./tuneSaves";

export const TUNE_FILE_TYPE = "track-spec-tune";
export const TUNE_FILE_VERSION = 1;

export interface TuneFileData {
  version: number;
  type: typeof TUNE_FILE_TYPE;
  name: string;
  date: string;
  config: TuneConfig;
  balance: number;
  aggression: number;
  tunePages?: CalcTuneResult;
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "tune";
}

export function tuneExportFileName(name: string, config: TuneConfig, ext: "json" | "txt"): string {
  const base = sanitizeFileName(`${name || config.make}-${config.model}-${config.tuneId}`);
  return `${base}.${ext}`;
}

export function buildTuneFileData(
  entry: Pick<SavedTune, "name" | "config" | "balance" | "aggression" | "tunePages"> & { date?: string },
): TuneFileData {
  return {
    version: TUNE_FILE_VERSION,
    type: TUNE_FILE_TYPE,
    name: entry.name,
    date: entry.date ?? new Date().toLocaleDateString(),
    config: entry.config,
    balance: entry.balance,
    aggression: entry.aggression,
    tunePages: entry.tunePages,
  };
}

export function serializeTuneFile(data: TuneFileData): string {
  return JSON.stringify(data, null, 2);
}

export function parseTuneFile(text: string): TuneFileData | null {
  try {
    const parsed = JSON.parse(text) as Partial<TuneFileData>;
    if (parsed.type !== TUNE_FILE_TYPE || !parsed.config || typeof parsed.balance !== "number") {
      return null;
    }
    return {
      version: parsed.version ?? TUNE_FILE_VERSION,
      type: TUNE_FILE_TYPE,
      name: parsed.name?.trim() || `${parsed.config.make} ${parsed.config.model}`,
      date: parsed.date ?? new Date().toLocaleDateString(),
      config: parsed.config,
      balance: parsed.balance,
      aggression: typeof parsed.aggression === "number" ? parsed.aggression : 45,
      tunePages: parsed.tunePages,
    };
  } catch {
    return null;
  }
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function tuneFileToSavedTune(data: TuneFileData): SavedTune {
  return {
    id: Date.now(),
    name: data.name,
    date: data.date,
    config: data.config,
    balance: data.balance,
    aggression: data.aggression,
    tunePages: data.tunePages ?? ({} as CalcTuneResult),
  };
}

export async function readLocalTuneFile(file: File): Promise<string> {
  return file.text();
}
