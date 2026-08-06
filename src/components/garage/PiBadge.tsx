import { classColor } from "../../lib/garageUi";

interface PiBadgeProps {
  cls: string | null | undefined;
  pi: number | null | undefined;
  large?: boolean;
}

export function PiBadge({ cls, pi, large }: PiBadgeProps) {
  if (!cls || pi == null) return null;
  const color = classColor(cls);

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded font-[family-name:var(--ts-font-mono)] font-bold text-white shadow-sm",
        large ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[10px]",
      ].join(" ")}
      style={{ background: `linear-gradient(135deg, ${color}ee, ${color}99)` }}
    >
      <span>{cls}</span>
      <span className="opacity-90">{pi}</span>
    </span>
  );
}
