import { useEffect, useState } from "react";

/** Full-screen driving HUD: wide enough and tall enough (excludes phone landscape). */
const QUERY = "(min-width: 1024px) and (min-height: 480px)";

export function useLiveHudLayout() {
  const [useHud, setUseHud] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setUseHud(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return useHud;
}
