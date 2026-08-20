/** Plain-English Live connection status — FH6 only sends Data Out while driving. */

export type LiveWsStatus = "disconnected" | "connecting" | "connected";

export type LiveLinkState = {
  wsStatus: LiveWsStatus;
  mockActive: boolean;
  isGameLive: boolean;
  sawGame: boolean;
  udpBound: boolean | null;
  udpError: string | null;
};

export function liveStatusLabel(s: LiveLinkState): string {
  if (s.mockActive) return "Mock data active";
  if (s.wsStatus !== "connected") return "Relay offline";
  if (s.udpBound === false) return "Port 9999 blocked";
  if (s.isGameLive) return "Game connected";
  if (s.sawGame) return "Game paused";
  return "Waiting for Data Out";
}

export function liveStatusDetail(s: LiveLinkState): string | null {
  if (s.mockActive) return null;
  if (s.wsStatus !== "connected") {
    return "Open TrackSpec-Live.exe on this PC. On a phone, type the PC’s Wi-Fi IP below.";
  }
  if (s.udpBound === false) {
    return (
      s.udpError ||
      "Close other Track Spec windows, then reopen this one. Forza Data Out uses port 9999."
    );
  }
  if (s.isGameLive) return null;
  if (s.sawGame) {
    return "FH6 only sends Data Out while you are driving — not in menus, pause, or replay.";
  }
  return "In FH6: Settings → HUD and Gameplay → Data Out ON, IP 127.0.0.1 (this PC) or this PC’s Wi-Fi IP (Xbox), port 9999. Then start driving.";
}

export function liveStatusColor(s: LiveLinkState): string {
  if (s.wsStatus !== "connected" && !s.mockActive) return "var(--ts-danger)";
  if (s.udpBound === false && !s.mockActive) return "var(--ts-danger)";
  if (s.mockActive || s.isGameLive) return "var(--ts-success)";
  return "var(--ts-warning)";
}
