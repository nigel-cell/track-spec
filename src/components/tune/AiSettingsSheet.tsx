import { useEffect, useState } from "react";
import {
  AI_PROVIDERS,
  getAiKeys,
  getAiProvider,
  setAiKeys,
  setAiProvider,
  validateAiKey,
} from "../../lib/aiProviders";
import { Button } from "../ui/Button";

interface AiSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AiSettingsSheet({ open, onClose }: AiSettingsSheetProps) {
  const [provider, setProvider] = useState("none");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProvider(getAiProvider());
    setKeys(getAiKeys());
    setTestMsg(null);
  }, [open]);

  if (!open) return null;

  const prov = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];

  const save = () => {
    setAiProvider(provider);
    setAiKeys(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testKey = async () => {
    const key = keys[provider];
    if (!key || provider === "none") return;
    setValidating(true);
    setTestMsg(null);
    const result = await validateAiKey(provider, key);
    setTestMsg(result.msg);
    if (result.ok) save();
    setValidating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--ts-border)] px-4 py-3">
          <h2 className="font-[family-name:var(--ts-font-heading)] text-base font-semibold">AI provider</h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={save}>
              {saved ? "✓ Saved" : "Save"}
            </Button>
            <button type="button" onClick={onClose} className="min-h-10 min-w-10 text-[var(--ts-muted)]">
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 pb-8">
          <p className="mb-3 text-sm text-[var(--ts-muted)]">
            Your API key stays on this device. Use <strong className="text-[var(--ts-text)]">Copy prompt</strong>{" "}
            anytime without a key — or connect a provider for one-tap enhance.
          </p>

          <div className="mb-4 space-y-2">
            {AI_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={[
                  "flex w-full items-center gap-3 rounded-[var(--ts-radius-sm)] border px-3 py-3 text-left",
                  provider === p.id
                    ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)]"
                    : "border-[var(--ts-border)] bg-[var(--ts-card)]",
                ].join(" ")}
              >
                <span>{p.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.label}</div>
                  {p.free && p.id !== "none" && (
                    <div className="text-[10px] text-[var(--ts-accent)]">Free tier available</div>
                  )}
                </div>
                {provider === p.id && (
                  <span className="text-[10px] text-[var(--ts-accent)]">Active</span>
                )}
              </button>
            ))}
          </div>

          {prov.hint && (
            <div className="space-y-2 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3">
              <p className="text-xs text-[var(--ts-muted)]">
                🔐 Key stored locally only. Never share screenshots of your API key.
              </p>
              {prov.docsUrl && (
                <a
                  href={prov.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--ts-accent)] underline"
                >
                  Get a free API key →
                </a>
              )}
              <input
                type={showKey ? "text" : "password"}
                value={keys[provider] ?? ""}
                onChange={(e) => setKeys((k) => ({ ...k, [provider]: e.target.value }))}
                placeholder={prov.hint}
                className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 font-[family-name:var(--ts-font-mono)] text-sm"
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? "Hide" : "Show"} key
                </Button>
                <Button variant="primary" onClick={() => void testKey()} disabled={validating}>
                  {validating ? "Testing…" : "Test & save"}
                </Button>
              </div>
              {testMsg && (
                <p className="text-xs text-[var(--ts-muted)]">{testMsg}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
