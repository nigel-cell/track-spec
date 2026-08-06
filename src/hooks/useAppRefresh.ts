import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function useAppRefresh() {
  const [updateReady, setUpdateReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const updateSwRef = useRef<((reloadPage?: boolean) => Promise<void>) | undefined>();

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    updateSwRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateReady(true);
      },
    });
  }, []);

  const refreshApp = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      if (import.meta.env.PROD && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) await registration.update();
      }

      if (updateReady && updateSwRef.current) {
        await updateSwRef.current(true);
        return;
      }

      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, [refreshing, updateReady]);

  return { updateReady, refreshing, refreshApp };
}
