import { specGroups } from "../../lib/tuneFromGarage";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { useUnits } from "../../hooks/useUnits";

export function CarTuneSpecs({ car }: { car: ForzaGarageCar }) {
  const { units } = useUnits();
  const groups = specGroups(car, units);
  if (groups.length === 0) {
    return (
      <p className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-6 text-sm text-[var(--ts-muted)]">
        No tuning specs imported for this car yet. Run <code className="text-[var(--ts-accent)]">npm run import:garage:specs</code>.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <section
          key={g.label}
          className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] overflow-hidden"
        >
          <h3 className="border-b border-[var(--ts-border)] bg-[var(--ts-surface)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ts-muted)]">
            {g.label}
          </h3>
          <dl className="divide-y divide-[var(--ts-border)]/60">
            {g.rows.map((r) => (
              <div key={r.k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <dt className="text-[var(--ts-muted)]">{r.k}</dt>
                <dd className="text-right font-[family-name:var(--ts-font-mono)] font-semibold">{r.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
