import { useEffect, useState } from "react";
import { fetchCarPhoto, type CarPhotoStatus } from "../lib/carPhoto";

export function useCarPhoto(make: string, model: string) {
  const [status, setStatus] = useState<CarPhotoStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!make || !model) {
      setStatus("idle");
      setUrl(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setUrl(null);
    fetchCarPhoto(make, model).then((result) => {
      if (cancelled) return;
      if (result) {
        setUrl(result);
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [make, model]);

  return { status, url };
}
