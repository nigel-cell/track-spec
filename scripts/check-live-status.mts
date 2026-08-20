/**
 * Live connection copy for FH6 Data Out.
 * Usage: node --experimental-strip-types scripts/check-live-status.mts
 */
import { liveStatusDetail, liveStatusLabel } from "../src/lib/liveStatus.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const waiting = liveStatusLabel({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: false,
  udpBound: true,
  udpError: null,
});
if (waiting !== "Waiting for Data Out") fail(`waiting label: ${waiting}`);

const waitingDetail = liveStatusDetail({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: false,
  udpBound: true,
  udpError: null,
});
if (!waitingDetail || !waitingDetail.includes("9999") || !waitingDetail.includes("start driving")) {
  fail(`waiting detail: ${waitingDetail}`);
}

const paused = liveStatusLabel({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: true,
  udpBound: true,
  udpError: null,
});
if (paused !== "Game paused") fail(`paused label: ${paused}`);

const pausedDetail = liveStatusDetail({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: true,
  udpBound: true,
  udpError: null,
});
if (!pausedDetail || !pausedDetail.includes("driving")) fail(`paused detail: ${pausedDetail}`);

const blocked = liveStatusLabel({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: false,
  udpBound: false,
  udpError: "Port 9999 is already in use",
});
if (blocked !== "Port 9999 blocked") fail(`blocked label: ${blocked}`);

const blockedDetail = liveStatusDetail({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: false,
  sawGame: false,
  udpBound: false,
  udpError: "Port 9999 is already in use",
});
if (blockedDetail !== "Port 9999 is already in use") fail(`blocked detail: ${blockedDetail}`);

const live = liveStatusLabel({
  wsStatus: "connected",
  mockActive: false,
  isGameLive: true,
  sawGame: true,
  udpBound: true,
  udpError: null,
});
if (live !== "Game connected") fail(`live label: ${live}`);
if (
  liveStatusDetail({
    wsStatus: "connected",
    mockActive: false,
    isGameLive: true,
    sawGame: true,
    udpBound: true,
    udpError: null,
  }) != null
) {
  fail("live detail should be empty");
}

const offline = liveStatusLabel({
  wsStatus: "disconnected",
  mockActive: false,
  isGameLive: false,
  sawGame: false,
  udpBound: null,
  udpError: null,
});
if (offline !== "Relay offline") fail(`offline label: ${offline}`);

console.log("check-live-status: ok");
