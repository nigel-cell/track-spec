interface DriveBadgeProps {
  drive: string | null | undefined;
  size?: "sm" | "md";
}

export function DriveBadge({ drive, size = "sm" }: DriveBadgeProps) {
  const d = (drive ?? "").toUpperCase();
  const w = size === "sm" ? 22 : 28;
  const h = size === "sm" ? 26 : 32;

  return (
    <span className="inline-flex shrink-0 opacity-80" title={d || "Drive"} aria-label={d}>
      <svg viewBox="0 0 26 30" width={w} height={h} className="text-[var(--ts-muted)]">
        <line x1="13" y1="7" x2="13" y2="23" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="23" x2="20" y2="23" stroke="currentColor" strokeWidth="2" />
        {(d === "AWD" || d === "FWD") && (
          <rect x="2" y="2" width="6" height="10" rx="2" fill="var(--ts-accent)" />
        )}
        {(d === "AWD" || d === "RWD") && (
          <rect x="18" y="2" width="6" height="10" rx="2" fill="var(--ts-accent)" />
        )}
        {(d === "AWD" || d === "FWD") && (
          <rect x="2" y="18" width="6" height="10" rx="2" fill="var(--ts-accent)" />
        )}
        {(d === "AWD" || d === "RWD") && (
          <rect x="18" y="18" width="6" height="10" rx="2" fill="var(--ts-accent)" />
        )}
      </svg>
    </span>
  );
}
