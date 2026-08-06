import { useMemo, useState } from "react";
import { TUNE_TAB_ORDER } from "../../data/constants";
import { computeTunePages } from "../../lib/tuneFromConfig";
import type { SavedTune } from "../../lib/tuneSaves";
import type { TuneUnits } from "../../lib/units";
import { resolveTuneUnits } from "../../lib/units";
import { Button } from "../ui/Button";

interface TuneCompareSheetProps {
  open: boolean;
  tunes: SavedTune[];
  units: TuneUnits;
  onClose: () => void;
}

export function TuneCompareSheet({ open, tunes, units, onClose }: TuneCompareSheetProps) {
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);

  const left = tunes.find((t) => t.id === leftId) ?? tunes[0] ?? null;
  const right = tunes.find((t) => t.id === rightId) ?? tunes[1] ?? null;

  const leftPages = useMemo(() => {
    if (!left) return null;
    return computeTunePages(left.config, left.balance, left.aggression, resolveTuneUnits(left.config.units, units));
  }, [left, units]);

  const rightPages = useMemo(() => {
    if (!right) return null;
    return computeTunePages(right.config, right.balance, right.aggression, resolveTuneUnits(right.config.units, units));
  }, [right, units]);

  if (!open) return null;

  const tabs = TUNE_TAB_ORDER.filter((pg) => leftPages?.[pg]?.values?.length || rightPages?.[pg]?.values?.length);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--ts-border)] px-4 py-3">
          <span className="font-[family-name:var(--ts-font-mono)] text-xs uppercase tracking-widest">Compare tunes</span>
          <button type="button" onClick={onClose} className="min-h-10 min-w-10 text-[var(--ts-muted)]">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tunes.length < 2 ? (
            <p className="py-8 text-center text-sm text-[var(--ts-muted)]">Save at least two tunes to compare.</p>
          ) : (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <select
                  value={left?.id ?? ""}
                  onChange={(e) => setLeftId(+e.target.value)}
                  className="min-h-10 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 text-sm"
                >
                  {tunes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={right?.id ?? ""}
                  onChange={(e) => setRightId(+e.target.value)}
                  className="min-h-10 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 text-sm"
                >
                  {tunes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {tabs.map((pg) => {
                const lv = leftPages?.[pg]?.values ?? [];
                const rv = rightPages?.[pg]?.values ?? [];
                const keys = [...new Set([...lv.map((r) => r.key), ...rv.map((r) => r.key)])];
                return (
                  <section key={pg} className="mb-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ts-accent)]">{pg}</h3>
                    <div className="overflow-hidden rounded-[var(--ts-radius-md)] border border-[var(--ts-border)]">
                      {keys.map((key) => {
                        const l = lv.find((r) => r.key === key)?.value ?? "—";
                        const r = rv.find((r) => r.key === key)?.value ?? "—";
                        const diff = l !== r && l !== "—" && r !== "—";
                        return (
                          <div
                            key={key}
                            className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-[var(--ts-border)] px-3 py-2 text-sm last:border-0"
                          >
                            <span className="font-[family-name:var(--ts-font-mono)] text-right text-[var(--ts-text)]">{l}</span>
                            <span className="text-center text-[10px] text-[var(--ts-muted)]">{key}</span>
                            <span
                              className="font-[family-name:var(--ts-font-mono)] text-left"
                              style={{ color: diff ? "var(--ts-accent)" : "var(--ts-text)" }}
                            >
                              {r}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>

        <div className="border-t border-[var(--ts-border)] p-4">
          <Button variant="ghost" full onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
