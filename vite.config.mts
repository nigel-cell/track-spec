import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo-banner.png"],
      manifest: {
        name: "Track Spec",
        short_name: "Track Spec",
        description: "Forza Horizon tuning calculator and live telemetry",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "./app",
        icons: [
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2,webp}"],
        globIgnores: ["**/forzaGarage.json", "**/forzaGarage-list.json", "**/starterTunes.json", "**/garage/**"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /updates\.json$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "updates-manifest",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /starterTunes\.json$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "starter-tunes",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /forzaGarage(-list)?\.json$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "garage-data",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /\/garage\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "garage-assets",
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/super-android\/tunelab\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "cardb-cache", expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
      },
    }),
  ],
  build: {
    minify: true,
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
