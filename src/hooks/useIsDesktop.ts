import { useEffect, useState } from "react";

/** Matches Tailwind `md` (768px) — desktop sidebar layout. */
const QUERY = "(min-width: 768px)";

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return desktop;
}

/** Nearest scrollable ancestor (AppShell main), else viewport. */
export function getScrollParent(el: Element | null): Element | null {
  let node: Element | null = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") return node;
    node = node.parentElement;
  }
  return document.querySelector("[data-app-scroll]") ?? null;
}
