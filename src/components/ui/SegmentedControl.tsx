interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex overflow-hidden rounded-[var(--ts-button-radius)] border border-[var(--ts-border)]">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={[
              "min-h-11 flex-1 px-2 font-[family-name:var(--ts-font-heading)] text-sm font-semibold tracking-[var(--ts-heading-tracking)] transition-colors",
              active
                ? "bg-[var(--ts-accent)] text-white"
                : "bg-transparent text-[var(--ts-muted)]",
            ].join(" ")}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        );
      })}
    </div>
  );
}
