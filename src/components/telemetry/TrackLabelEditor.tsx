import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Card, Label } from "../ui/Card";

const SUGGESTIONS = [
  "Goliath",
  "Horizon Mexico Circuit",
  "Horizon USA Circuit",
  "Festival Circuit",
  "Canyon",
  "Stadium Trail",
  "Street Scene",
];

interface TrackLabelEditorProps {
  trackLabel?: string | null;
  trackTags?: string[];
  onSave: (trackLabel: string, trackTags: string[]) => Promise<void> | void;
  compact?: boolean;
}

export function TrackLabelEditor({
  trackLabel = "",
  trackTags = [],
  onSave,
  compact = false,
}: TrackLabelEditorProps) {
  const [label, setLabel] = useState(trackLabel || "");
  const [tagsText, setTagsText] = useState((trackTags || []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(trackLabel || "");
    setTagsText((trackTags || []).join(", "));
  }, [trackLabel, trackTags]);

  const save = async () => {
    setSaving(true);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave(label.trim(), tags);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={compact ? "p-3" : undefined}>
      <Label>Track label</Label>
      <p className="mt-1 text-xs text-[var(--ts-muted)]">
        Forza doesn’t send track ID — tag the session yourself.
      </p>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Goliath"
        className="mt-3 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2 text-sm text-[var(--ts-text)] outline-none focus:border-[var(--ts-accent-border)]"
      />
      <input
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        placeholder="Tags (comma separated)"
        className="mt-2 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2 text-sm text-[var(--ts-text)] outline-none focus:border-[var(--ts-accent-border)]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setLabel(s)}
            className="rounded-md border border-[var(--ts-border)] px-2 py-1 text-[10px] text-[var(--ts-muted)] hover:text-[var(--ts-text)]"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Button
          variant="outline"
          className="min-h-9 px-3 py-2 text-xs"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save track"}
        </Button>
      </div>
    </Card>
  );
}
