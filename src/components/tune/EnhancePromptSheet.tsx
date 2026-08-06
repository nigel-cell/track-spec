import { useMemo, useState } from "react";
import {
  AI_PROVIDERS,
  callAiEnhance,
  getActiveAiSetup,
} from "../../lib/aiProviders";
import {
  buildEnhancePrompt,
  copyEnhancePrompt,
  ENHANCE_LOCK_SECTIONS,
  type EnhanceLockSection,
} from "../../lib/tuneEnhancePrompt";
import type { TuneUnits } from "../../lib/units";
import type { CalcTuneResult } from "../../lib/calcTune";
import type { TuneConfig } from "./TuneInputScreen";
import { Button } from "../ui/Button";

interface EnhancePromptSheetProps {
  open: boolean;
  config: TuneConfig;
  pages: CalcTuneResult;
  balance: number;
  aggression: number;
  units: TuneUnits;
  onClose: () => void;
  onOpenAiSettings: () => void;
}

export function EnhancePromptSheet({
  open,
  config,
  pages,
  balance,
  aggression,
  units,
  onClose,
  onOpenAiSettings,
}: EnhancePromptSheetProps) {
  const [goal, setGoal] = useState("");
  const [locks, setLocks] = useState<Partial<Record<EnhanceLockSection, boolean>>>({});
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt = useMemo(
    () => buildEnhancePrompt(config, pages, balance, aggression, { userGoal: goal, locks }, units),
    [config, pages, balance, aggression, goal, locks, units],
  );

  const aiSetup = getActiveAiSetup();
  const providerLabel = AI_PROVIDERS.find((p) => p.id === aiSetup.providerId)?.label ?? "None";

  if (!open) return null;

  const handleCopy = async () => {
    await copyEnhancePrompt(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunAi = async () => {
    if (!aiSetup.ready || !aiSetup.apiKey) {
      onOpenAiSettings();
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const text = await callAiEnhance(aiSetup.providerId, aiSetup.apiKey, prompt);
      if (!text) throw new Error("Empty response — try again or use Copy prompt");
      setResponse(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--ts-border)] px-4 py-3">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--ts-border)]" />
          <h2 className="font-[family-name:var(--ts-font-heading)] text-base font-semibold">
            Enhance with AI
          </h2>
          <p className="mt-1 text-sm text-[var(--ts-muted)]">
            Run in-app with your API key, or copy the prompt to any AI you prefer.
          </p>
        </div>

        <div className="overflow-y-auto p-4 pb-6">
          <label className="mb-1 block font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-widest text-[var(--ts-dim)]">
            What do you want to improve? (optional)
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g. More rotation on corner exit, less understeer mid-corner…"
            className="mb-4 w-full resize-none rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 py-2 text-sm outline-none"
          />

          <p className="mb-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-widest text-[var(--ts-dim)]">
            Don&apos;t suggest changes to
          </p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {ENHANCE_LOCK_SECTIONS.map((key) => {
              const on = !!locks[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLocks((l) => ({ ...l, [key]: !l[key] }))}
                  className={[
                    "rounded-[var(--ts-radius-sm)] border px-2 py-2 text-center text-[10px] font-[family-name:var(--ts-font-mono)] uppercase",
                    on
                      ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                      : "border-[var(--ts-border)] text-[var(--ts-muted)]",
                  ].join(" ")}
                >
                  {on ? "🔒 " : ""}
                  {key}
                </button>
              );
            })}
          </div>

          <div className="mb-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 py-2 text-xs text-[var(--ts-muted)]">
            {aiSetup.ready ? (
              <>API: <span className="text-[var(--ts-accent)]">{providerLabel}</span></>
            ) : (
              <>
                No API key set.{" "}
                <button type="button" className="text-[var(--ts-accent)] underline" onClick={onOpenAiSettings}>
                  Connect provider
                </button>
              </>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => void handleRunAi()} disabled={loading}>
              {loading ? "Analyzing…" : aiSetup.ready ? "✦ Run AI" : "Set up API"}
            </Button>
            <Button variant="outline" onClick={() => void handleCopy()}>
              {copied ? "✓ Copied" : "Copy prompt"}
            </Button>
          </div>

          <Button variant="ghost" full className="mb-4" onClick={onOpenAiSettings}>
            AI settings (Gemini, Grok, OpenAI, Claude)
          </Button>

          {error && (
            <div className="mb-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-danger)]/40 bg-[var(--ts-danger)]/10 px-3 py-2 text-sm text-[var(--ts-danger)]">
              {error}
            </div>
          )}

          {response && (
            <div className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)]">
              <div className="flex items-center justify-between border-b border-[var(--ts-border)] px-3 py-2">
                <span className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-widest text-[var(--ts-accent)]">
                  AI feedback
                </span>
                <button
                  type="button"
                  className="text-xs text-[var(--ts-muted)]"
                  onClick={() => void navigator.clipboard.writeText(response)}
                >
                  Copy
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap p-3 text-sm leading-relaxed text-[var(--ts-text)]">
                {response}
              </div>
            </div>
          )}

          <details className="mt-4 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)]">
            <summary className="cursor-pointer px-3 py-2 text-xs text-[var(--ts-muted)]">
              Preview prompt
            </summary>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words border-t border-[var(--ts-border)] p-3 font-[family-name:var(--ts-font-mono)] text-[10px] leading-relaxed text-[var(--ts-dim)]">
              {prompt}
            </pre>
          </details>

          <Button variant="ghost" full className="mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
