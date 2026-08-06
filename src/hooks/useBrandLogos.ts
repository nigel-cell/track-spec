import { useEffect, useState } from "react";
import { brandLogoUrl, loadBrandMap, logoCodeForMake } from "../lib/garageBrands";

export function useBrandLogos() {
  const [map, setMap] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadBrandMap()
      .then((m) => {
        if (!cancelled) setMap(m);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const urlForMake = (make: string) => {
    const code = logoCodeForMake(map, make);
    return brandLogoUrl(code);
  };

  return { map, ready, urlForMake, codeForMake: (make: string) => logoCodeForMake(map, make) };
}
