import { formatCredits } from "../../lib/forzaGarage";

interface GarageCollectionBarProps {
  owned: number;
  total: number;
  ownedCost: number;
  missingCost: number;
  favorites?: number;
}

export function GarageCollectionBar({
  owned,
  total,
  ownedCost,
  missingCost,
  favorites = 0,
}: GarageCollectionBarProps) {
  const pct = total ? Math.round((owned / total) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-gradient-to-br from-[var(--ts-card)] to-[var(--ts-surface)]">
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ts-muted)]">Collection</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-[family-name:var(--ts-font-mono)] text-4xl font-bold tabular-nums">
              {owned}
            </span>
            <span className="text-lg text-[var(--ts-muted)]">/ {total}</span>
            <span className="ml-2 rounded-full bg-[var(--ts-accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--ts-accent)]">
              {pct}%
            </span>
            {favorites > 0 && (
              <span className="rounded-full bg-[var(--ts-warning)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--ts-warning)]">
                ★ {favorites}
              </span>
            )}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ts-border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--ts-accent)] to-[#ff6b5a] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
          <div className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)]/40 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Owned value</p>
            <p className="mt-0.5 font-[family-name:var(--ts-font-mono)] text-sm font-semibold text-emerald-400">
              {formatCredits(ownedCost)}
            </p>
          </div>
          <div className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)]/40 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Still need</p>
            <p className="mt-0.5 font-[family-name:var(--ts-font-mono)] text-sm font-semibold text-[var(--ts-text)]">
              {formatCredits(missingCost)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
