import { buildPartsList, type BuildPartsInput } from "../../lib/buildParts";

export function BuildPartsCard({ config }: { config: BuildPartsInput }) {
  const list = buildPartsList(config);

  return (
    <section className="mt-4 rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">Parts to buy</h2>
      <p className="mt-1 text-[11px] leading-snug text-[var(--ts-dim)]">{list.hint}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.groups.map((group) => (
          <div key={group.menu}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-accent)]">{group.menu}</p>
            <dl className="mt-1 space-y-1">
              {group.items.map((row) => (
                <div key={row.slot} className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className="text-[var(--ts-muted)]">{row.slot}</dt>
                  <dd className="text-right font-medium">{row.part}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
