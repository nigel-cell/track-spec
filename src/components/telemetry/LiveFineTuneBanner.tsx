import { Button } from "../ui/Button";
import type { BalanceState } from "../../lib/telemetry";

const LABELS: Record<Exclude<BalanceState, "neutral">, string> = {
  understeer: "Understeer detected",
  oversteer: "Oversteer detected",
};

interface LiveFineTuneBannerProps {
  balance: Exclude<BalanceState, "neutral">;
  onFineTune: () => void;
  onDismiss: () => void;
}

export function LiveFineTuneBanner({ balance, onFineTune, onDismiss }: LiveFineTuneBannerProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ts-radius-md)] border px-4 py-3"
      style={{
        borderColor: balance === "understeer" ? "#fbbf2444" : "var(--ts-danger)",
        background: balance === "understeer" ? "#fbbf2411" : "rgba(255,40,0,0.08)",
      }}
    >
      <div>
        <div className="text-sm font-semibold">{LABELS[balance]}</div>
        <div className="text-xs text-[var(--ts-muted)]">Live telemetry · sustained 2.5s+</div>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={onFineTune}>
          Fine Tune
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
