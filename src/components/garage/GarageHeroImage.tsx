import { useEffect, useRef, useState } from "react";
import { getScrollParent } from "../../hooks/useIsDesktop";
import { assetUrl } from "../../lib/assetUrl";

type Props = {
  src: string | null | undefined;
  className?: string;
  /** When true, set src immediately (desktop windowed grid). */
  eager?: boolean;
};

/**
 * Loads hero images against the AppShell scrollport.
 * Native loading="lazy" often never fires inside overflow:auto panels.
 */
export function GarageHeroImage({ src, className, eager }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const resolved = assetUrl(src);
  const [activeSrc, setActiveSrc] = useState<string | null>(() => (eager && resolved ? resolved : null));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!resolved) {
      setActiveSrc(null);
      return;
    }
    if (eager) {
      setActiveSrc(resolved);
      return;
    }

    const el = wrapRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setActiveSrc(resolved);
      return;
    }

    const root = getScrollParent(el);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActiveSrc(resolved);
          obs.disconnect();
        }
      },
      { root: root instanceof Element ? root : null, rootMargin: "400px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [resolved, eager]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {activeSrc && !failed ? (
        <img
          src={activeSrc}
          alt=""
          className={className}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--ts-muted)]">
          {failed ? "No photo" : ""}
        </div>
      )}
    </div>
  );
}
