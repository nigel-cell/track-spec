import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SiteRoot } from "./site/SiteRoot";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SiteRoot />
    </StrictMode>
  );
  document.getElementById("boot-loader")?.remove();
}
