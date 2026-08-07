import { useState } from "react";
import { assetUrl } from "../../lib/assetUrl";

type Props = {
  src: string | null | undefined;
  /** Used if primary src 404s (e.g. Cloudflare without local heros). */
  fallbackSrc?: string | null | undefined;
  className?: string;
  eager?: boolean;
};

/**
 * Always set src. Windowing in GarageScreen limits how many mount.
 * On cloud builds, thumbs load locally; full heros fall back to CDN.
 */
export function GarageHeroImage({ src, fallbackSrc, className, eager }: Props) {
  const primary = assetUrl(src);
  const fallback = assetUrl(fallbackSrc);
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedAll, setFailedAll] = useState(false);

  const active = !failedPrimary ? primary : fallback;

  if (!active || failedAll) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--ts-muted)]">
        {failedAll ? "No photo" : ""}
      </div>
    );
  }

  return (
    <img
      src={active}
      alt=""
      className={["absolute inset-0", className].filter(Boolean).join(" ")}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      onError={() => {
        if (!failedPrimary && fallback && fallback !== primary) setFailedPrimary(true);
        else setFailedAll(true);
      }}
    />
  );
}
