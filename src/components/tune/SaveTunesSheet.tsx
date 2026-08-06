import { useRef, useState } from "react";
import { TUNE_MODES } from "../../data/constants";
import type { CalcTuneResult } from "../../lib/calcTune";
import {
  buildTuneFileData,
  downloadTextFile,
  parseTuneFile,
  readLocalTuneFile,
  serializeTuneFile,
  tuneExportFileName,
  tuneFileToSavedTune,
} from "../../lib/tuneImportExport";
import { formatTuneText, parseSharedTuneText, shareTuneText } from "../../lib/tuneShare";
import type { TuneUnits } from "../../lib/units";
import { resolveTuneUnits } from "../../lib/units";
import { deleteSavedTune, exportAllTunes, importBulkTunes, listSavedTunes, renameSavedTune, saveTune, type SavedTune } from "../../lib/tuneSaves";
import type { TuneConfig } from "./TuneInputScreen";
import { Button } from "../ui/Button";

interface SaveTunesSheetProps {
  open: boolean;
  browseOnly?: boolean;
  config: TuneConfig;
  pages: CalcTuneResult;
  balance: number;
  aggression: number;
  units: TuneUnits;
  onClose: () => void;
  onLoad: (entry: SavedTune) => void;
  onCompare?: () => void;
}

type ImportPreview = {
  name: string;
  config: TuneConfig;
  balance: number;
  aggression: number;
  tunePages?: CalcTuneResult;
  source: "file" | "paste";
};

export function SaveTunesSheet({
  open,
  browseOnly = false,
  config,
  pages,
  balance,
  aggression,
  units,
  onClose,
  onLoad,
  onCompare,
}: SaveTunesSheetProps) {
  const [saves, setSaves] = useState(() => listSavedTunes());
  const [name, setName] = useState(`${config.make} ${config.model} — ${config.tuneId}`);
  const [trackNote, setTrackNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const refresh = () => setSaves(listSavedTunes());

  const currentEntry = (): Pick<SavedTune, "name" | "config" | "balance" | "aggression" | "tunePages"> => ({
    name: name.trim() || "Untitled tune",
    config,
    balance,
    aggression,
    tunePages: pages,
  });

  const handleSave = () => {
    if (!Object.keys(pages).length) {
      showToast("Generate a tune first");
      return;
    }
    saveTune({ name: name.trim() || "Untitled tune", trackNote: trackNote.trim() || undefined, config, balance, aggression, tunePages: pages });
    refresh();
    showToast("Saved locally!");
  };

  const handleExportJson = (entry: Pick<SavedTune, "name" | "config" | "balance" | "aggression" | "tunePages">) => {
    const data = buildTuneFileData(entry);
    downloadTextFile(serializeTuneFile(data), tuneExportFileName(entry.name, entry.config, "json"));
    showToast("Tune file downloaded");
  };

  const handleExportText = (entry: Pick<SavedTune, "name" | "config" | "balance" | "aggression" | "tunePages">) => {
    const text = formatTuneText(
      entry.config,
      entry.tunePages ?? pages,
      entry.balance,
      entry.aggression,
      resolveTuneUnits(entry.config.units, units),
    );
    downloadTextFile(text, tuneExportFileName(entry.name, entry.config, "txt"));
    showToast("Share text downloaded");
  };

  const handleCopy = async (entry: SavedTune) => {
    const text = formatTuneText(
      entry.config,
      entry.tunePages,
      entry.balance,
      entry.aggression,
      resolveTuneUnits(entry.config.units, units),
    );
    await navigator.clipboard.writeText(text);
    showToast("Copied!");
  };

  const handleShare = async (entry: SavedTune) => {
    const text = formatTuneText(
      entry.config,
      entry.tunePages,
      entry.balance,
      entry.aggression,
      resolveTuneUnits(entry.config.units, units),
    );
    const result = await shareTuneText(text);
    showToast(result === "shared" ? "Shared!" : "Copied!");
  };

  const handleDelete = (id: number) => {
    deleteSavedTune(id);
    refresh();
  };

  const previewFromText = (text: string): ImportPreview | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const fromShare = parseSharedTuneText(trimmed, units);
    if (fromShare) {
      return { ...fromShare, source: "paste" };
    }

    const fromFile = parseTuneFile(trimmed);
    if (fromFile) {
      return {
        name: fromFile.name,
        config: fromFile.config,
        balance: fromFile.balance,
        aggression: fromFile.aggression,
        tunePages: fromFile.tunePages,
        source: "paste",
      };
    }

    return null;
  };

  const handleImportPaste = () => {
    const preview = previewFromText(importText);
    if (!preview) {
      showToast("No Track Spec tune found in that text");
      return;
    }
    setImportPreview(preview);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await readLocalTuneFile(file);
      const preview = previewFromText(text);
      if (!preview) {
        showToast("Not a valid Track Spec tune file");
        return;
      }
      setImportText(text);
      setImportPreview({ ...preview, source: "file" });
    } catch {
      showToast("Could not read that file");
    }
  };

  const applyImport = (alsoSave: boolean) => {
    if (!importPreview) return;
    const entry = tuneFileToSavedTune({
      version: 1,
      type: "track-spec-tune",
      name: importPreview.name,
      date: new Date().toLocaleDateString(),
      config: importPreview.config,
      balance: importPreview.balance,
      aggression: importPreview.aggression,
      tunePages: importPreview.tunePages,
    });

    if (alsoSave) {
      saveTune(entry);
      refresh();
    }

    onLoad(entry);
    setImportPreview(null);
    setImportText("");
    showToast(alsoSave ? "Imported & saved!" : "Tune loaded!");
    setTimeout(() => onClose(), 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      {toast && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 rounded-[var(--ts-radius-sm)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-4 py-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider text-[var(--ts-accent)]">
          {toast}
        </div>
      )}

      <div
        className="safe-bottom mx-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--ts-border)] px-4 py-3">
          <span className="font-[family-name:var(--ts-font-mono)] text-xs uppercase tracking-widest text-[var(--ts-text)]">
            {browseOnly ? "My tunes" : "Save / share / import"}
          </span>
          <button type="button" onClick={onClose} className="min-h-10 min-w-10 text-[var(--ts-muted)]">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-6">
          <section className="mb-6 rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--ts-text)]">
              Import tune
            </h3>
            <p className="mb-3 text-[11px] leading-snug text-[var(--ts-muted)]">
              Paste shared tune text or pick a <span className="text-[var(--ts-text)]">.json</span> /{" "}
              <span className="text-[var(--ts-text)]">.txt</span> file saved from Track Spec.
            </p>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportPreview(null);
              }}
              placeholder="Paste shared tune text here…"
              rows={4}
              className="mb-2 w-full resize-y rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 py-2 text-sm outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleImportPaste}>
                Preview import
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,application/json,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            {importPreview && (
              <div className="mt-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] p-3">
                <p className="text-sm font-medium text-[var(--ts-text)]">{importPreview.name}</p>
                <p className="mt-1 text-xs text-[var(--ts-muted)]">
                  {importPreview.config.carClass} {importPreview.config.pi}PI · {importPreview.config.driveType} ·{" "}
                  {importPreview.config.tuneId}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="primary" onClick={() => applyImport(true)}>
                    Save & load
                  </Button>
                  <Button variant="outline" onClick={() => applyImport(false)}>
                    Load only
                  </Button>
                </div>
              </div>
            )}
          </section>

          {!browseOnly && (
            <section className="mb-6 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ts-text)]">
                Save current tune
              </h3>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tune name…"
                className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 text-sm outline-none"
              />
              <input
                value={trackNote}
                onChange={(e) => setTrackNote(e.target.value)}
                placeholder="Track note (optional) — e.g. Road Atlanta"
                className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 text-sm outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <Button variant="primary" onClick={handleSave}>
                  Save locally
                </Button>
                <Button variant="outline" onClick={() => handleExportJson(currentEntry())}>
                  Export .json
                </Button>
                <Button variant="ghost" onClick={() => handleExportText(currentEntry())}>
                  Export .txt
                </Button>
              </div>
              <p className="text-[10px] leading-snug text-[var(--ts-muted)]">
                Saved tunes stay in this browser. Export a file to back up or share on Discord, Reddit, or another PC.
              </p>
            </section>
          )}

          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--ts-text)]">
            Saved on this device ({saves.length})
          </h3>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                downloadTextFile(exportAllTunes(), `track-spec-library-${Date.now()}.json`);
                showToast("Library exported");
              }}
            >
              Export all
            </Button>
            <Button variant="ghost" onClick={() => bulkInputRef.current?.click()}>
              Import library
            </Button>
            <input
              ref={bulkInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then((text) => {
                  const { imported, skipped } = importBulkTunes(text);
                  refresh();
                  showToast(`Imported ${imported}${skipped ? ` (${skipped} skipped)` : ""}`);
                });
                e.target.value = "";
              }}
            />
            {onCompare && saves.length >= 2 && (
              <Button variant="secondary" onClick={onCompare}>
                Compare
              </Button>
            )}
          </div>

          {saves.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--ts-dim)]">No saved tunes yet</p>
          )}

          <div className="space-y-3">
            {saves.map((sv) => {
              return (
                <div
                  key={sv.id}
                  className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingId === sv.id ? (
                        <div className="space-y-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="min-h-9 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 text-sm"
                          />
                          <input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Track note"
                            className="min-h-9 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2 text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              className="h-8 px-3 text-xs"
                              onClick={() => {
                                renameSavedTune(sv.id, editName, editNote);
                                setEditingId(null);
                                refresh();
                              }}
                            >
                              Save
                            </Button>
                            <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium">{sv.name}</div>
                          <div className="mt-0.5 text-xs text-[var(--ts-muted)]">
                            {sv.config.carClass} {sv.config.pi}PI · {sv.date}
                            {sv.trackNote ? ` · ${sv.trackNote}` : ""}
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== sv.id && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(sv.id);
                            setEditName(sv.name);
                            setEditNote(sv.trackNote ?? "");
                          }}
                          className="min-h-8 px-2 text-[10px] text-[var(--ts-muted)] hover:text-[var(--ts-accent)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sv.id)}
                          className="min-h-8 min-w-8 text-[var(--ts-dim)]"
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    full
                    onClick={() => {
                      onLoad(sv);
                      onClose();
                    }}
                  >
                    Load tune
                  </Button>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <button type="button" className="text-xs text-[var(--ts-accent)] hover:underline" onClick={() => void handleShare(sv)}>
                      Share
                    </button>
                    <button type="button" className="text-xs text-[var(--ts-muted)] hover:text-[var(--ts-text)]" onClick={() => void handleCopy(sv)}>
                      Copy
                    </button>
                    <button type="button" className="text-xs text-[var(--ts-muted)] hover:text-[var(--ts-text)]" onClick={() => handleExportJson(sv)}>
                      Export
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
