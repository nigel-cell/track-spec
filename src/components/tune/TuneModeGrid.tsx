import { TUNE_MODES } from "../../data/constants";

interface TuneModeGridProps {
  value: string;
  onChange: (id: string) => void;
}

export function TuneModeGrid({ value, onChange }: TuneModeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TUNE_MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={[
              "min-h-[64px] rounded-[var(--ts-radius-md)] border px-2 py-2.5 text-left transition-all",
              active ? "shadow-[var(--ts-glow)]" : "hover:border-[var(--ts-muted)]",
            ].join(" ")}
            style={{
              borderColor: active ? mode.color : "var(--ts-border)",
              background: active ? `${mode.color}14` : "var(--ts-card)",
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: active ? mode.color : "var(--ts-text)" }}
            >
              {mode.label}
            </div>
            <div className="mt-0.5 text-[10px] leading-snug text-[var(--ts-muted)]">{mode.sub}</div>
          </button>
        );
      })}
    </div>
  );
}
