/** Resolve a public asset path against Vite `base` (works on Cloudflare + relative hosts). */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = import.meta.env.BASE_URL || "./";
  const clean = path.replace(/^\.\//, "").replace(/^\//, "");
  return `${base.endsWith("/") ? base : `${base}/`}${clean}`;
}
