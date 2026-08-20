/** In-progress Manual setup — any car, including the step you were on. */

import type { TuneConfig } from "../components/tune/TuneInputScreen";

export const MANUAL_DRAFTS_KEY = "ts_v1_manual_drafts";
export const LAST_MANUAL_DRAFT_KEY = "ts_v1_manual_draft_last";
export const MAX_MANUAL_DRAFTS = 20;

export type ManualDraftSection = "car" | "tune" | "specs" | "engine";
export type ManualDraftMode = "quick" | "full";

export type ManualDraftRecord = {
  slug: string;
  savedAt: string;
  section: ManualDraftSection;
  mode: ManualDraftMode;
  config: Partial<TuneConfig>;
};

const SECTIONS = new Set<ManualDraftSection>(["car", "tune", "specs", "engine"]);
const MODES = new Set<ManualDraftMode>(["quick", "full"]);

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Stable key when the garage slug is not known yet. */
export function slugFromMakeModel(make: string, model: string): string {
  const m = slugPart(make);
  const n = slugPart(model);
  if (!m && !n) return "";
  return `custom:${m}:${n}`;
}

export function isManualDraftSection(value: unknown): value is ManualDraftSection {
  return typeof value === "string" && SECTIONS.has(value as ManualDraftSection);
}

function isManualDraftMode(value: unknown): value is ManualDraftMode {
  return typeof value === "string" && MODES.has(value as ManualDraftMode);
}

function readAll(): Record<string, ManualDraftRecord> {
  try {
    const raw = localStorage.getItem(MANUAL_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, ManualDraftRecord> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const rec = normalizeRecord(key, value);
      if (rec) out[rec.slug] = rec;
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ManualDraftRecord>): void {
  try {
    localStorage.setItem(MANUAL_DRAFTS_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function normalizeRecord(fallbackSlug: string, value: unknown): ManualDraftRecord | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Partial<ManualDraftRecord>;
  const slug = typeof rec.slug === "string" && rec.slug ? rec.slug : fallbackSlug;
  if (!slug) return null;
  const config =
    rec.config && typeof rec.config === "object" && !Array.isArray(rec.config)
      ? rec.config
      : {};
  return {
    slug,
    savedAt: typeof rec.savedAt === "string" ? rec.savedAt : new Date(0).toISOString(),
    section: isManualDraftSection(rec.section) ? rec.section : "car",
    mode: isManualDraftMode(rec.mode) ? rec.mode : "quick",
    config,
  };
}

function prune(map: Record<string, ManualDraftRecord>, keepSlug: string): void {
  const entries = Object.values(map);
  if (entries.length <= MAX_MANUAL_DRAFTS) return;
  entries.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  for (const oldest of entries) {
    if (Object.keys(map).length <= MAX_MANUAL_DRAFTS) break;
    if (oldest.slug === keepSlug) continue;
    delete map[oldest.slug];
  }
}

export function saveManualDraft(input: {
  slug: string;
  section: ManualDraftSection;
  mode: ManualDraftMode;
  config: Partial<TuneConfig>;
}): ManualDraftRecord | null {
  const slug = input.slug.trim();
  if (!slug) return null;
  const record: ManualDraftRecord = {
    slug,
    savedAt: new Date().toISOString(),
    section: input.section,
    mode: input.mode,
    config: input.config,
  };
  const all = readAll();
  all[slug] = record;
  prune(all, slug);
  writeAll(all);
  try {
    localStorage.setItem(LAST_MANUAL_DRAFT_KEY, slug);
  } catch {
    /* ignore */
  }
  return record;
}

export function loadManualDraft(slug: string): ManualDraftRecord | null {
  if (!slug) return null;
  return readAll()[slug] ?? null;
}

export function loadLastManualDraft(): ManualDraftRecord | null {
  try {
    const slug = localStorage.getItem(LAST_MANUAL_DRAFT_KEY);
    if (!slug) return null;
    return loadManualDraft(slug);
  } catch {
    return null;
  }
}

export function resolveManualDraft(
  slugs: Array<string | null | undefined>,
): ManualDraftRecord | null {
  for (const slug of slugs) {
    if (!slug) continue;
    const hit = loadManualDraft(slug);
    if (hit) return hit;
  }
  return null;
}

/** Last Manual edits win over a saved favorite profile, which wins over garage stock. */
export function mergeResumedConfig<T extends Record<string, unknown>>(
  baseline: T,
  favoriteDraft: Partial<T> | null | undefined,
  manualDraft: Partial<T> | null | undefined,
): T {
  return { ...baseline, ...(favoriteDraft ?? {}), ...(manualDraft ?? {}) };
}
