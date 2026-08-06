export interface AiProvider {
  id: string;
  label: string;
  icon: string;
  color: string;
  free: boolean;
  hint: string | null;
  docsUrl: string | null;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: "none",
    label: "Copy prompt only",
    icon: "📋",
    color: "#8899aa",
    free: true,
    hint: null,
    docsUrl: null,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    icon: "✦",
    color: "#4285f4",
    free: true,
    hint: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "grok",
    label: "xAI Grok",
    icon: "𝕏",
    color: "#e7e7e7",
    free: true,
    hint: "xai-...",
    docsUrl: "https://console.x.ai",
  },
  {
    id: "openai",
    label: "OpenAI GPT-4o mini",
    icon: "◈",
    color: "#10a37f",
    free: false,
    hint: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    icon: "◇",
    color: "#6c6cff",
    free: false,
    hint: "sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com",
  },
];

const PROVIDER_KEY = "tl_v1_provider";
const KEYS_KEY = "tl_v1_keys";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v != null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}

export function getAiProvider(): string {
  return lsGet(PROVIDER_KEY, "none");
}

export function setAiProvider(id: string) {
  lsSet(PROVIDER_KEY, id);
}

export function getAiKeys(): Record<string, string> {
  return lsGet(KEYS_KEY, {});
}

export function setAiKeys(keys: Record<string, string>) {
  lsSet(KEYS_KEY, keys);
}

export function getActiveAiSetup(): { providerId: string; apiKey: string | null; ready: boolean } {
  const providerId = getAiProvider();
  const keys = getAiKeys();
  const apiKey = providerId !== "none" ? keys[providerId] ?? null : null;
  return { providerId, apiKey, ready: !!apiKey && providerId !== "none" };
}

export async function validateAiKey(
  providerId: string,
  apiKey: string,
): Promise<{ ok: boolean; msg: string }> {
  try {
    if (providerId === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`;
      const r = await fetch(url);
      if (r.status === 401 || r.status === 403) return { ok: false, msg: "Key rejected — check Google AI Studio" };
      if (r.status === 429) return { ok: true, msg: "Key valid (rate limited right now)" };
      if (!r.ok) return { ok: false, msg: `Error ${r.status}` };
      return { ok: true, msg: "Key valid" };
    }
    if (providerId === "grok") {
      const r = await fetch("https://api.x.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.status === 401) return { ok: false, msg: "Invalid key — check console.x.ai" };
      if (!r.ok) return { ok: false, msg: `Error ${r.status}` };
      return { ok: true, msg: "Key valid" };
    }
    if (providerId === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.status === 401) return { ok: false, msg: "Invalid key — check platform.openai.com" };
      if (!r.ok) return { ok: false, msg: `Error ${r.status}` };
      return { ok: true, msg: "Key valid" };
    }
    if (providerId === "claude") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      if (r.status === 401) return { ok: false, msg: "Invalid key — check console.anthropic.com" };
      if (!r.ok) return { ok: false, msg: `Error ${r.status}` };
      return { ok: true, msg: "Key valid" };
    }
    return { ok: false, msg: "Unknown provider" };
  } catch {
    return { ok: false, msg: "Network error — check connection" };
  }
}

export async function callAiEnhance(providerId: string, apiKey: string, prompt: string): Promise<string> {
  const system =
    "You are an expert Forza Horizon 6 handling tuner. Be concise, specific with numbers, and actionable.";

  if (providerId === "gemini") {
    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.0-flash"];
    let lastErr = "No Gemini model available";
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${system}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
      });
      if (r.status === 404) continue;
      if (r.status === 429) throw new Error("Rate limit hit — try again later or use Copy prompt");
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(
          `Gemini ${r.status}: ${(err as { error?: { message?: string } }).error?.message ?? "request failed"}`,
        );
      }
      const d = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    }
    throw new Error(lastErr);
  }

  if (providerId === "grok") {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });
    if (!r.ok) throw new Error(`Grok ${r.status}`);
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return d.choices?.[0]?.message?.content?.trim() ?? "";
  }

  if (providerId === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return d.choices?.[0]?.message?.content?.trim() ?? "";
  }

  if (providerId === "claude") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}`);
    const d = (await r.json()) as { content?: { text?: string }[] };
    return d.content?.[0]?.text?.trim() ?? "";
  }

  throw new Error("Select an AI provider in settings");
}
