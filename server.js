const express = require("express");

const http = require("http");

const WebSocket = require("ws");

const dgram = require("dgram");

const path = require("path");

const os = require("os");

const { createLapTracker } = require("./server/lapTracker");

const lapTracker = createLapTracker();



const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });



const DIST_DIR = process.env.TRACK_SPEC_DIST
  ? path.resolve(process.env.TRACK_SPEC_DIST)
  : path.join(__dirname, "dist");

app.use(express.static(DIST_DIR));

app.use(express.json());

app.get("/api/sessions", (_req, res) => {
  res.json(lapTracker.listSessions());
});

app.get("/api/sessions/:id", (req, res) => {
  const session = lapTracker.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

app.delete("/api/sessions/:id", (req, res) => {
  if (!lapTracker.deleteSession(req.params.id)) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ ok: true });
});



app.get("/ping", (req, res) => {
  res.type("text").send("Track Spec OK — relay running on UDP 9999, WebSocket on 3000");

});



const udpSocket = dgram.createSocket("udp4");

const FORZA_UDP_PORT = 9999;

const HTTP_PORT = 3000;



let activeWsClients = new Set();

let simulationInterval = null;

let simTime = 0;

let simSpeed = 0;

let simRpm = 1000;

let simGear = 1;

let simThrottle = 0;

let simSteerAngle = 0;

let simLapTime = 0;

let simLastLap = 0;

let simBestLap = 0;

let simLapNum = 0;

let simDistance = 0;

const SIM_LAP_LENGTH = 88;



function publishTelemetry(raw) {

  const enriched = lapTracker.enrich(raw);

  broadcastToClients(JSON.stringify({ type: "telemetry", data: enriched }));

}



function broadcastToClients(payload) {

  for (const client of activeWsClients) {

    if (client.readyState === WebSocket.OPEN) client.send(payload);

  }

}



function readWheelFloats(msg, offset) {

  return [

    msg.readFloatLE(offset),

    msg.readFloatLE(offset + 4),

    msg.readFloatLE(offset + 8),

    msg.readFloatLE(offset + 12),

  ];

}



/** Parse FH6 324-byte Data Out packet (FH5 Dash layout). */

function parseForzaTelemetry(msg) {

  if (msg.length < 232) return null;



  const readFloat = (o) => msg.readFloatLE(o);

  const readInt32 = (o) => msg.readInt32LE(o);

  const readUInt32 = (o) => msg.readUInt32LE(o);

  const readUInt8 = (o) => msg.readUInt8(o);

  const readInt8 = (o) => msg.readInt8(o);

  const readUInt16 = (o) => msg.readUInt16LE(o);



  const slipAngle = msg.length >= 196 ? readWheelFloats(msg, 164) : [0, 0, 0, 0];

  const combinedSlip = msg.length >= 196 ? readWheelFloats(msg, 180) : [0, 0, 0, 0];



  const telemetry = {

    isRaceOn: readInt32(0),

    timestampMs: readUInt32(4),

    engineMaxRpm: readFloat(8),

    engineIdleRpm: readFloat(12),

    currentEngineRpm: readFloat(16),

    accelX: readFloat(20) / 9.80665,

    accelY: readFloat(24) / 9.80665,

    accelZ: readFloat(28) / 9.80665,

    velocityX: readFloat(32),

    velocityY: readFloat(36),

    velocityZ: readFloat(40),

    yaw: readFloat(56),

    pitch: readFloat(60),

    roll: readFloat(64),

    tireSlipAngleFL: slipAngle[0],

    tireSlipAngleFR: slipAngle[1],

    tireSlipAngleRL: slipAngle[2],

    tireSlipAngleRR: slipAngle[3],

    tireSlipFL: combinedSlip[0],

    tireSlipFR: combinedSlip[1],

    tireSlipRL: combinedSlip[2],

    tireSlipRR: combinedSlip[3],

    wheelRotationFL: readFloat(100),

    wheelRotationFR: readFloat(104),

    wheelRotationRL: readFloat(108),

    wheelRotationRR: readFloat(112),

    suspensionTravelFL: readFloat(196),

    suspensionTravelFR: readFloat(200),

    suspensionTravelRL: readFloat(204),

    suspensionTravelRR: readFloat(208),

    carOrdinal: readInt32(212),

    carClass: readInt32(216),

    carPerformanceIndex: readInt32(220),

    drivetrainType: readInt32(224),

    numGears: readInt32(228),

  };



  if (msg.length >= 311) {

    telemetry.positionX = readFloat(244);

    telemetry.positionY = readFloat(248);

    telemetry.positionZ = readFloat(252);

    telemetry.speedKmh = readFloat(256) * 3.6;

    telemetry.powerHp = readFloat(260) / 745.7;

    telemetry.torqueNm = readFloat(264);

    const toC = (f) => (f - 32) * (5 / 9);

    telemetry.tireTempFL = toC(readFloat(268));

    telemetry.tireTempFR = toC(readFloat(272));

    telemetry.tireTempRL = toC(readFloat(276));

    telemetry.tireTempRR = toC(readFloat(280));

    telemetry.distanceTraveled = readFloat(292);

    telemetry.bestLap = readFloat(296);

    telemetry.lastLap = readFloat(300);

    telemetry.currentLap = readFloat(304);

    telemetry.currentRaceTime = readFloat(308);

    telemetry.lapNumber = readUInt16(312);

    telemetry.accelInput = readUInt8(315) / 255;

    telemetry.brakeInput = readUInt8(316) / 255;

    telemetry.clutchInput = readUInt8(317) / 255;

    telemetry.handbrakeInput = readUInt8(318) / 255;

    telemetry.gear = readUInt8(319);

    telemetry.steer = readInt8(320) / 127;

  } else {

    telemetry.speedKmh = Math.sqrt(

      telemetry.velocityX ** 2 + telemetry.velocityY ** 2 + telemetry.velocityZ ** 2

    ) * 3.6;

    telemetry.tireTempFL = telemetry.tireTempFR = telemetry.tireTempRL = telemetry.tireTempRR = 20;

    telemetry.accelInput = telemetry.brakeInput = 0;

    telemetry.gear = 11;

    telemetry.steer = 0;

    telemetry.bestLap = telemetry.lastLap = telemetry.currentLap = 0;

    telemetry.distanceTraveled = 0;

    telemetry.lapNumber = 0;

  }



  return telemetry;

}



function startLocalSimulation() {

  if (simulationInterval) return;

  simTime = 0;

  simSpeed = 0;

  simRpm = 1000;

  simGear = 1;

  simLapTime = 0;

  simLastLap = 0;

  simBestLap = 0;

  simLapNum = 0;

  simDistance = 0;

  lapTracker.resetSession();



  simulationInterval = setInterval(() => {

    simTime += 0.016;

    simLapTime += 0.016;

    simDistance += simSpeed * 0.016;

    if (simLapTime >= SIM_LAP_LENGTH) {

      simLastLap = simLapTime;

      if (simBestLap === 0 || simLapTime < simBestLap) simBestLap = simLapTime;

      simLapTime = 0;

      simDistance = 0;

      simLapNum += 1;

    }

    const buf = Buffer.alloc(324);



    if (simTime % 10 < 7) {

      simThrottle = 1.0;

      simSpeed += 0.25;

      simRpm += 120;

      if (simRpm > 7800) {

        if (simGear < 6) { simGear++; simRpm = 4500; } else simRpm = 7800;

      }

    } else {

      simThrottle = 0;

      simSpeed = Math.max(0, simSpeed - 0.4);

      simRpm = Math.max(900, simRpm - 200);

      if (simRpm === 900) simGear = 1;

    }



    simSteerAngle = Math.sin(simTime * 0.5);

    const lateralG = simSteerAngle * (simSpeed / 30) * 1.2;

    const longitudinalG = simThrottle > 0 ? 0.6 : -1.1;

    const slipMag = Math.abs(simSteerAngle) * 0.45;

    const trackAngle = simTime * simSpeed * 0.003;



    buf.writeInt32LE(1, 0);

    buf.writeUInt32LE(Math.floor(simTime * 1000), 4);

    buf.writeFloatLE(8500, 8);

    buf.writeFloatLE(900, 12);

    buf.writeFloatLE(simRpm, 16);

    buf.writeFloatLE(lateralG * 9.80665, 20);

    buf.writeFloatLE(9.80665, 24);

    buf.writeFloatLE(longitudinalG * 9.80665, 28);

    buf.writeFloatLE(trackAngle, 56);



    buf.writeFloatLE(slipMag * 1.1, 164);

    buf.writeFloatLE(slipMag * 1.1, 168);

    buf.writeFloatLE(slipMag * 0.4, 172);

    buf.writeFloatLE(slipMag * 0.4, 176);

    buf.writeFloatLE(slipMag, 180);

    buf.writeFloatLE(slipMag, 184);

    buf.writeFloatLE(0.08, 188);

    buf.writeFloatLE(0.08, 192);



    const wheelRps = simSpeed / (2 * Math.PI * 0.33);

    buf.writeFloatLE(wheelRps, 100);

    buf.writeFloatLE(wheelRps, 104);

    buf.writeFloatLE(wheelRps, 108);

    buf.writeFloatLE(wheelRps, 112);

    buf.writeInt32LE(1005, 212);

    buf.writeInt32LE(4, 216);

    buf.writeInt32LE(900, 220);

    buf.writeInt32LE(2, 224);

    buf.writeInt32LE(6, 228);



    buf.writeFloatLE(200 * Math.cos(trackAngle), 244);

    buf.writeFloatLE(0, 248);

    buf.writeFloatLE(200 * Math.sin(trackAngle), 252);

    buf.writeFloatLE(simSpeed, 256);

    buf.writeFloatLE(simThrottle * 550000, 260);

    buf.writeFloatLE(simThrottle * 650, 264);



    const baseTemp = 180 + Math.sin(simTime * 0.1) * 10;

    buf.writeFloatLE(baseTemp + Math.abs(simSteerAngle) * 15, 268);

    buf.writeFloatLE(baseTemp + Math.abs(simSteerAngle) * 15, 272);

    buf.writeFloatLE(baseTemp, 276);

    buf.writeFloatLE(baseTemp, 280);

    buf.writeFloatLE(simDistance, 292);

    buf.writeFloatLE(simBestLap || simLastLap, 296);

    buf.writeFloatLE(simLastLap, 300);

    buf.writeFloatLE(simLapTime, 304);

    buf.writeFloatLE(simTime, 308);

    buf.writeUInt16LE(simLapNum, 312);

    buf.writeUInt8(simThrottle > 0 ? 255 : 0, 315);

    buf.writeUInt8(simThrottle === 0 ? 200 : 0, 316);

    buf.writeUInt8(simGear, 319);

    buf.writeInt8(simSteerAngle * 127, 320);



    const telemetry = parseForzaTelemetry(buf);

    if (telemetry) publishTelemetry(telemetry);

  }, 16);



  broadcastToClients(JSON.stringify({ type: "simulation_status", active: true }));

  console.log("[SIM] Mock telemetry started");

}



function stopLocalSimulation() {

  if (!simulationInterval) return;

  clearInterval(simulationInterval);

  simulationInterval = null;

  broadcastToClients(JSON.stringify({ type: "simulation_status", active: false }));

  console.log("[SIM] Mock telemetry stopped");

}



wss.on("connection", (ws) => {

  activeWsClients.add(ws);

  const ips = [];

  for (const ifaces of Object.values(os.networkInterfaces())) {

    for (const iface of ifaces) {

      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);

    }

  }

  ws.send(JSON.stringify({ type: "init", data: { ips: ips.length ? ips : ["127.0.0.1"], port: FORZA_UDP_PORT } }));

  ws.send(JSON.stringify({ type: "simulation_status", active: simulationInterval !== null }));



  ws.on("message", (message) => {

    try {

      const parsed = JSON.parse(message);

      if (parsed.type === "toggle_simulation") {

        parsed.active ? startLocalSimulation() : stopLocalSimulation();

      }

    } catch {}

  });



  ws.on("close", () => activeWsClients.delete(ws));

});



let packetCount = 0;

let lastLogTime = 0;



udpSocket.on("message", (msg) => {

  if (simulationInterval) return;

  const telemetry = parseForzaTelemetry(msg);

  if (!telemetry) return;

  packetCount++;

  const now = Date.now();

  if (now - lastLogTime > 5000) {

    console.log(`[UDP] ${packetCount} pkts/5s | Car ${telemetry.carOrdinal} | PI ${telemetry.carPerformanceIndex}`);

    packetCount = 0;

    lastLogTime = now;

  }

  publishTelemetry(telemetry);

});



udpSocket.on("listening", () => {

  const { address, port } = udpSocket.address();

  console.log(`[UDP] Listening on ${address}:${port}`);

});



udpSocket.on("error", (err) => {

  console.error("[UDP] Error:", err.message);

  if (err.code === "EADDRINUSE") {

    console.error("Port 9999 is already in use. Close other telemetry tools first.");

  }

  if (!process.env.TRACK_SPEC_ELECTRON) process.exit(1);

});



udpSocket.bind(FORZA_UDP_PORT);



app.get("*", (req, res) => {

  const indexPath = path.join(DIST_DIR, "index.html");

  if (require("fs").existsSync(indexPath)) res.sendFile(indexPath);

  else res.status(200).send("<h1>Track Spec relay running</h1><p>Run npm run build first, or use npm run dev for development.</p>");

});



server.listen(HTTP_PORT, "0.0.0.0", () => {

  const ips = [];

  for (const ifaces of Object.values(os.networkInterfaces())) {

    for (const iface of ifaces) {

      if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);

    }

  }

  console.log("\n  ╔══════════════════════════════════════════╗");

  console.log("  ║         Track Spec is running            ║");

  console.log("  ╚══════════════════════════════════════════╝\n");

  console.log(`  PC browser:  http://localhost:${HTTP_PORT}`);

  if (ips.length) {

    for (const ip of ips) {

      console.log(`  iPhone:      http://${ip}:${HTTP_PORT}`);

    }

  }

  if (!process.env.TRACK_SPEC_ELECTRON) {

    console.log("\n  iPhone Tune/Garage: use your Cloudflare URL (recommended)");

    console.log("  iPhone Live: same Wi-Fi → http://<PC-IP>:3000\n");

  }

  console.log("  Forza: Data Out ON | IP = this PC | Port 9999\n");

});


