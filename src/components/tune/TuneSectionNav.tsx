interface TuneSectionNavProps {
  sections: { id: string; label: string; disabled?: boolean }[];
  active: string;
  onChange: (id: string) => void;
}

export function TuneSectionNav({ sections, active, onChange }: TuneSectionNavProps) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 border-b border-[var(--ts-border)] bg-[var(--ts-bg)]/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-px">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={s.disabled}
              onClick={() => onChange(s.id)}
              className={[
                "flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                s.disabled ? "cursor-not-allowed opacity-40" : "",
                isActive
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-[var(--ts-border)] text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
              ].join(" ")}
            >
              <span className="font-[family-name:var(--ts-font-mono)] text-[10px] opacity-70">{i + 1}</span>
              {s.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TuneSummaryChips({
  items,
}: {
  items: { label: string; value: string; accent?: string }[];
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex max-w-[70vw] shrink-0 items-center gap-1.5 rounded-full border border-[var(--ts-border)] bg-[var(--ts-card)] px-2.5 py-1 text-xs sm:max-w-none"
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
    </div>
  );
}
