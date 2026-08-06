import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  PROBLEMS,
  getLiveFix,
  getPhaseFix,
  type FixNudge,
  type ProblemDef,
  type ProblemSub,
} from "../../lib/fineTuneFixes";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface FineTuneFlowProps {
  onClose: () => void;
  onApplyNudge: (nudge: FixNudge) => void;
  initialProblemId?: string;
  liveHint?: boolean;
}

type Step = "welcome" | "problem" | "phase" | "result";

export function FineTuneFlow({
  onClose,
  onApplyNudge,
  initialProblemId = "understeer",
  liveHint = false,
}: FineTuneFlowProps) {
  const liveProblem = PROBLEMS.find((p) => p.id === initialProblemId) ?? PROBLEMS[0];

  const [step, setStep] = useState<Step>(liveHint ? "result" : "welcome");
  const [problem, setProblem] = useState<ProblemDef>(liveProblem);
  const [sub, setSub] = useState<ProblemSub | null>(
    liveHint
      ? (liveProblem.subs.find((s) =>
          initialProblemId === "understeer"
            ? s.id === "us_mid"
            : initialProblemId === "oversteer"
              ? s.id === "os_mid"
              : false,
        ) ?? null)
      : null,
  );
  const [applied, setApplied] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const result = useMemo(() => {
    if (liveHint && step === "result") return getLiveFix(problem.id);
    if (sub) return getPhaseFix(problem, sub);
    return getPhaseFix(problem, null);
  }, [liveHint, step, problem, sub]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleApply = (nudge: FixNudge | undefined, index: number) => {
    if (!nudge) return;
    onApplyNudge(nudge);
    setApplied((a) => [...a, index]);
    setToast(nudge.label ?? "Adjustment applied");
  };

  const goBack = () => {
    if (step === "welcome") {
      onClose();
      return;
    }
    if (step === "problem") setStep("welcome");
    if (step === "phase") setStep("problem");
    if (step === "result") {
      setApplied([]);
      setStep(liveHint ? "problem" : "phase");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--ts-bg)]">
      <header className="safe-top flex items-center gap-3 border-b border-[var(--ts-border)] px-4 py-3">
        <button type="button" onClick={goBack} className="min-h-11 min-w-11 text-xl">
          ←
        </button>
        <h1 className="flex-1 font-[family-name:var(--ts-font-heading)] text-base font-[number:var(--ts-heading-weight)] tracking-[var(--ts-heading-tracking)]">
          Fine Tune
        </h1>
        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase text-[var(--ts-dim)]">
          Offline
        </span>
        <button type="button" onClick={onClose} className="min-h-11 min-w-11 text-[var(--ts-muted)]">
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 pb-8">
        {step === "welcome" && (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <div className="text-4xl">🏁</div>
            <h2 className="font-[family-name:var(--ts-font-heading)] text-xl font-[number:var(--ts-heading-weight)]">
              Tune deployed — how does it feel?
            </h2>
            <p className="text-sm text-[var(--ts-muted)]">
              Apply the numbers in-game, drive a few laps, then tell us what the car is doing.
            </p>
            <Card className="text-left text-sm text-[var(--ts-muted)]">
              <strong className="text-[var(--ts-text)]">Golden rule:</strong> change one thing at a time, then test again.
            </Card>
            <Button variant="primary" full onClick={onClose}>
              ✓ Feels great — view tune
            </Button>
            <Button variant="secondary" full onClick={() => setStep("problem")}>
              Something&apos;s off — diagnose
            </Button>
            <Button variant="ghost" full onClick={onClose}>
              Skip for now
            </Button>
          </div>
        )}

        {step === "problem" && (
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-sm text-[var(--ts-muted)]">What&apos;s the car doing wrong?</p>
            <p className="text-xs text-[var(--ts-dim)]">Pick the closest match — we&apos;ll ask when it happens next.</p>
            {PROBLEMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProblem(p);
                  setStep("phase");
                }}
                className="flex w-full min-h-14 items-center justify-between rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-4 text-left"
              >
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-sm text-[var(--ts-muted)]">{p.desc}</div>
                </div>
                <span className="text-[var(--ts-dim)]">›</span>
              </button>
            ))}
          </div>
        )}

        {step === "phase" && (
          <div className="mx-auto max-w-md space-y-3">
            <p className="font-medium">{problem.label}</p>
            <p className="text-sm text-[var(--ts-muted)]">When does it happen?</p>
            <p className="text-xs text-[var(--ts-dim)]">Corner phase tells us which settings to touch first.</p>
            {problem.subs.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSub(s);
                  setApplied([]);
                  setStep("result");
                }}
                className="flex w-full min-h-12 items-center justify-between rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-4"
              >
                {s.label}
                <span className="text-[var(--ts-dim)]">›</span>
              </button>
            ))}
          </div>
        )}

        {step === "result" && (
          <div className="mx-auto max-w-md space-y-4">
            {liveHint && (
              <Card className="text-sm text-[var(--ts-muted)]">
                Diagnosis from live tire slip — apply one fix, then drive again to verify.
              </Card>
            )}
            {!liveHint && (
              <Card className="text-xs text-[var(--ts-dim)]">Offline analysis — phase-specific fixes from FH6 tuning guides.</Card>
            )}
            <p className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-widest text-[var(--ts-dim)]">
              {problem.label}
              {sub ? ` · ${sub.label}` : liveHint ? " · Live telemetry" : ""}
            </p>
            <div>
              <SectionLabel>Why this happens</SectionLabel>
              <Card className="text-sm leading-relaxed">{result.diagnosis}</Card>
            </div>
            <div>
              <SectionLabel>Fixes — try one at a time</SectionLabel>
              <div className="space-y-2">
                {result.fixes.map((f, i) => (
                  <Card key={`${f.setting}-${i}`} className="space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{f.setting}</span>
                      <span className="font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-accent)]">
                        {f.change}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ts-muted)]">{f.why}</p>
                    {f.nudge && (
                      <Button
                        variant={applied.includes(i) ? "ghost" : "primary"}
                        onClick={() => handleApply(f.nudge, i)}
                      >
                        {applied.includes(i) ? "✓ Applied" : f.nudge.label ?? "⚡ Apply nudge"}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
            <Card className="text-sm">💡 {result.tip}</Card>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSub(null);
                  setApplied([]);
                  setStep("problem");
                }}
              >
                Another issue
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-[var(--ts-radius-sm)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-4 py-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider text-[var(--ts-accent)]">
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--ts-accent)]">
      {children}
    </div>
  );
}
