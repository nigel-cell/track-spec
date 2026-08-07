import { useEffect, useState } from "react";
import App from "../App";
import { LandingPage } from "./LandingPage";

function pathIsApp(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return clean === "/app" || clean.endsWith("/app");
}

/**
 * `/` → marketing site
 * `/app` → Track Spec PWA (Electron + Home Screen)
 */
export function SiteRoot() {
  const [isApp, setIsApp] = useState(() =>
    typeof window !== "undefined" ? pathIsApp(window.location.pathname) : false,
  );

  useEffect(() => {
    const sync = () => setIsApp(pathIsApp(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  if (isApp) return <App />;
  return <LandingPage />;
}
