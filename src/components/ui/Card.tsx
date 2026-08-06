import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] shadow-[var(--ts-shadow-card)]",
        padding ? "p-[var(--ts-card-padding)]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block font-[family-name:var(--ts-font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--ts-muted)]">
      {children}
    </span>
  );
}

export function DataValue({ children }: { children: ReactNode }) {
  return (
    <span
      className="font-[family-name:var(--ts-font-mono)] text-[length:var(--ts-data-size)] font-medium text-[var(--ts-accent)]"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {children}
    </span>
  );
}
