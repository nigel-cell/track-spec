import { useEffect, useState } from "react";
import App from "../App";
import { LandingPage } from "./LandingPage";
import { isElectronShell } from "../lib/appUpdates";

function pathIsApp(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return clean === "/app" || clean.endsWith("/app");
}

function shouldShowApp(): boolean {
  if (typeof window === "undefined") return false;
  // Desktop exe always shows the product UI (not the marketing landing page).
  if (isElectronShell()) return true;
  return pathIsApp(window.location.pathname);
}

/**
 * `/` → marketing site (web)
 * `/app` → Track Spec PWA
 * Electron → always the app UI
 */
export function SiteRoot() {
  const [isApp, setIsApp] = useState(() => shouldShowApp());

  useEffect(() => {
    const sync = () => setIsApp(shouldShowApp());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  if (isApp) return <App />;
  return <LandingPage />;
}
