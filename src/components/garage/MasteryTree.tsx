import { useState } from "react";
import type { ForzaGarageMastery, ForzaGaragePerk } from "../../lib/forzaGarage";

const COLS = 4;

function perkIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null;
  return `/garage/perk-icons/${icon}.webp`;
}

interface MasteryTreeProps {
  mastery: ForzaGarageMastery;
}

export function MasteryTree({ mastery }: MasteryTreeProps) {
  const cells = mastery.cells ?? [];
  const [selected, setSelected] = useState<string | null>(() => {
    const first = cells.find((c) => c != null);
    return first ?? null;
  });

  const selectedPerk: ForzaGaragePerk | null =
    selected && mastery.perks?.[selected] ? mastery.perks[selected] : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      <div className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)] p-4">
        <div
          className="grid w-full gap-3"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((cellId, i) => {
            if (!cellId) {
              return (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded-lg border border-[var(--ts-border)] bg-[var(--ts-bg)]/50"
                />
              );
            }

            const perk = mastery.perks?.[cellId];
            if (!perk) {
              return (
                <div
                  key={cellId}
                  className="aspect-square rounded-lg border border-dashed border-[var(--ts-border)]"
                />
              );
            }

            const active = selected === cellId;
            const icon = perkIconUrl(perk.icon);

            return (
              <button
                key={cellId}
                type="button"
                onClick={() => setSelected(cellId)}
                className={[
                  "relative aspect-square rounded-lg border flex items-center justify-center transition-transform",
                  active
                    ? "border-[var(--ts-accent)] bg-gradient-to-b from-[#ff4a40] to-[#e22d22] shadow-[0_0_0_2px_#fff,0_2px_8px_rgba(0,0,0,0.5)] scale-[1.02]"
                    : "border-black/25 bg-gradient-to-b from-white to-[#e9edf0] hover:scale-[1.02]",
                ].join(" ")}
                aria-label={perk.name}
              >
                {icon ? (
                  <img
                    src={icon}
                    alt=""
                    className={[
                      "h-[58%] w-[58%] object-contain",
                      active ? "brightness-0 invert opacity-100" : "brightness-0 opacity-80",
                    ].join(" ")}
                  />
                ) : (
                  <span className="text-xs font-bold text-black/50">?</span>
                )}
                <span
                  className={[
                    "absolute bottom-1 right-1 rounded px-1 font-[family-name:var(--ts-font-mono)] text-[10px] font-bold",
                    active ? "bg-black/30 text-white" : "bg-black/10 text-black/70",
                  ].join(" ")}
                >
                  {perk.cost}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)]">
        {selectedPerk ? (
          <>
            <div className="bg-[var(--ts-accent)] px-4 py-2.5 font-[family-name:var(--ts-font-heading)] text-sm font-bold text-white">
              {selectedPerk.name}
            </div>
            <p className="px-4 py-3 text-sm leading-relaxed text-[var(--ts-muted)]">{selectedPerk.desc}</p>
            <div className="flex items-center justify-between border-t border-[var(--ts-border)] bg-[var(--ts-surface)] px-4 py-2.5 text-xs font-bold uppercase tracking-wide">
              <span>Cost</span>
              <span className="inline-flex items-center gap-1.5">
                <img src="/garage/icons/sp-gold.webp" alt="" className="h-4 w-4" />
                {selectedPerk.cost}
                {selectedPerk.uses > 0 && (
                  <span className="ml-2 font-normal normal-case text-[var(--ts-muted)]">
                    · {selectedPerk.uses} uses
                  </span>
                )}
              </span>
            </div>
            {selectedPerk.effect && (
              <div className="border-t border-[var(--ts-border)] px-4 py-2 text-xs text-[var(--ts-accent)]">
                {selectedPerk.effect}
              </div>
            )}
          </>
        ) : (
          <p className="p-4 text-sm text-[var(--ts-muted)]">Select a mastery perk.</p>
        )}
      </div>
    </div>
  );
}
