import { useState } from "react";
import { assetUrl } from "../../lib/assetUrl";

type Props = {
  src: string | null | undefined;
  className?: string;
  /** Hint only — browser still decides; we always set src so iOS can load. */
  eager?: boolean;
};

/**
 * Always set src. Gating behind IntersectionObserver broke iPhone
 * (nested AppShell scrollport + iOS IO quirks → permanent blank heroes).
 * Windowing in GarageScreen already limits how many images mount.
 */
export function GarageHeroImage({ src, className, eager }: Props) {
  const resolved = assetUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--ts-muted)]">
        {failed ? "No photo" : ""}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      className={["absolute inset-0", className].filter(Boolean).join(" ")}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
