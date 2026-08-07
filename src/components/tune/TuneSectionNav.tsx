interface TuneSectionNavProps {
  sections: { id: string; label: string; disabled?: boolean; hint?: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function TuneSectionNav({ sections, active, onChange }: TuneSectionNavProps) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 border-b border-[var(--ts-border)] bg-[var(--ts-bg)]/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto scroll-pl-1 scroll-pr-4 px-1 pb-px">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              title={s.hint}
              className={[
                "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors sm:min-h-10 sm:gap-2 sm:px-3.5 sm:text-xs",
                s.disabled ? "opacity-50" : "",
                isActive
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-[var(--ts-border)] text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
              ].join(" ")}
            >
              <span className="font-[family-name:var(--ts-font-mono)] text-[9px] opacity-70 sm:text-[10px]">{i + 1}</span>
              {s.label}
              {s.disabled && s.hint ? <span className="text-[9px] opacity-60">🔒</span> : null}
            </button>
          );
        })}
        {/* Trailing spacer so the last pill can scroll fully into view */}
        <span className="w-3 shrink-0 sm:hidden" aria-hidden />
      </div>
    </nav>
  );
}

export function TuneSummaryChips({
  items,
}: {
  items: { label: string; value: string; accent?: string }[];
}) {
  const [primary, ...rest] = items;

  return (
    <div className="space-y-2">
      {primary && (
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--ts-border)] bg-[var(--ts-card)] px-2.5 py-1 text-xs sm:hidden">
          <span className="shrink-0 text-[var(--ts-muted)]">{primary.label}</span>
          <span className="truncate font-[family-name:var(--ts-font-mono)] font-semibold text-[var(--ts-text)]">
            {primary.value}
          </span>
        </div>
      )}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {items.map((item, idx) => (
          <span
            key={item.label}
            className={[
              "inline-flex max-w-[72vw] shrink-0 items-center gap-1.5 rounded-full border border-[var(--ts-border)] bg-[var(--ts-card)] px-2.5 py-1 text-xs sm:max-w-none",
              idx === 0 ? "hidden sm:inline-flex" : "",
            ].join(" ")}
          >
            <span className="shrink-0 text-[var(--ts-muted)]">{item.label}</span>
            <span
              className="truncate font-[family-name:var(--ts-font-mono)] font-semibold text-[var(--ts-text)]"
              style={item.accent ? { color: item.accent } : undefined}
            >
              {item.value}
            </span>
          </span>
        ))}
        <span className="w-2 shrink-0 sm:hidden" aria-hidden />
      </div>
    </div>
  );
}
