interface DriveBadgeProps {
  drive: string | null | undefined;
  size?: "sm" | "md";
}

/**
 * Top-down chassis icon. Front of the car is at the TOP of the SVG.
 * FWD = front axle lit, RWD = rear axle lit, AWD = both.
 */
export function DriveBadge({ drive, size = "sm" }: DriveBadgeProps) {
  const d = (drive ?? "").toUpperCase();
  const w = size === "sm" ? 22 : 28;
  const h = size === "sm" ? 26 : 32;
  const front = d === "AWD" || d === "FWD";
  const rear = d === "AWD" || d === "RWD";

  return (
    <span className="inline-flex shrink-0 opacity-80" title={d || "Drive"} aria-label={d || "Drive"}>
      <svg viewBox="0 0 26 30" width={w} height={h} className="text-[var(--ts-muted)]">
        {/* Chassis */}
        <line x1="13" y1="7" x2="13" y2="23" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="23" x2="20" y2="23" stroke="currentColor" strokeWidth="2" />
        {/* Front axle (top) */}
        {front && (
          <>
            <rect x="2" y="2" width="6" height="10" rx="2" fill="var(--ts-accent)" />
            <rect x="18" y="2" width="6" height="10" rx="2" fill="var(--ts-accent)" />
          </>
        )}
        {/* Rear axle (bottom) */}
        {rear && (
          <>
            <rect x="2" y="18" width="6" height="10" rx="2" fill="var(--ts-accent)" />
            <rect x="18" y="18" width="6" height="10" rx="2" fill="var(--ts-accent)" />
          </>
        )}
        {/* Unpowered corners as outlines so layout stays clear */}
        {!front && (
          <>
            <rect x="2" y="2" width="6" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="18" y="2" width="6" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {!rear && (
          <>
            <rect x="2" y="18" width="6" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="18" y="18" width="6" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </span>
  );
}
