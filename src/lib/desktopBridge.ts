export type DesktopUpdateProgress = {
  received: number;
  total: number;
  percent: number;
};

export type DesktopInfo = {
  isDesktop: boolean;
  isPackaged: boolean;
  isPortable: boolean;
  portablePath: string | null;
  version: string;
  userData: string;
};

export type TrackSpecDesktopApi = {
  isDesktop: true;
  getInfo: () => Promise<DesktopInfo>;
  downloadUpdate: (url: string) => Promise<{ ok: boolean; path?: string; bytes?: number; error?: string }>;
  installUpdate: () => Promise<{ ok: boolean; mode?: string; target?: string; path?: string; error?: string }>;
  cancelUpdate: () => Promise<{ ok: boolean }>;
  onUpdateProgress: (handler: (progress: DesktopUpdateProgress) => void) => () => void;
};

declare global {
  interface Window {
    trackSpecDesktop?: TrackSpecDesktopApi;
  }
}

export function getDesktopBridge(): TrackSpecDesktopApi | null {
  if (typeof window === "undefined") return null;
  return window.trackSpecDesktop ?? null;
}

export function hasDesktopUpdater(): boolean {
  return !!getDesktopBridge()?.downloadUpdate;
}
