// server.js
const express = require("express");
const WebSocket = require("ws");
const os = require("os");

const app = express();
const PORT = 3001;

app.use(express.json());

const wss = new WebSocket.Server({ port: 8080 });

// ===== helper: ambil IPv4 LAN =====
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

// ===== state buat status komunikasi =====
let wsClientCount = 0;
let lastEspDataAt = null;
let lastPayload = null;
let lastFallAt = null;

// ===== broadcast ke semua client WS =====
function broadcast(dataObj) {
  const json = JSON.stringify(dataObj);

  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
      sent++;
    }
  });

  console.log(
    sent > 0
      ? `✅ BACKEND → WEBSITE OK | broadcast ke ${sent} client`
      : `⚠️ BACKEND → WEBSITE belum ada client`
  );
}

// ===== WebSocket connection tracking =====
wss.on("connection", (ws) => {
  wsClientCount++;
  console.log(`✅ WEBSITE CONNECTED (WS) | total client = ${wsClientCount}`);

  ws.on("close", () => {
    wsClientCount--;
    console.log(`⚠️ WEBSITE DISCONNECTED (WS) | total client = ${wsClientCount}`);
  });
});

// ===== endpoint ESP kirim GPS + FALL =====
app.post("/gps", (req, res) => {
  const data = { ...req.body };
  lastEspDataAt = new Date();

  // ---- normalisasi tipe data (biar konsisten) ----
  if (data.latitude != null) data.latitude = Number(data.latitude);
  if (data.longitude != null) data.longitude = Number(data.longitude);
  if (data.satellites != null) data.satellites = Number(data.satellites);

  // ---- kalau fall_detected, kasih window aktif 10 detik ----
  if (data.fall_detected) {
    lastFallAt = new Date();
    data.fall_active_until = Date.now() + 10_000; // 10 detik dari sekarang
  }

  lastPayload = data;

  const isFix =
    typeof data.latitude === "number" &&
    typeof data.longitude === "number" &&
    !data.error;

  console.log("--------------------------------------------------");
  console.log(`✅ ESP → BACKEND OK | ${lastEspDataAt.toLocaleTimeString()}`);
  console.log(isFix ? "[FIX]" : "[NO FIX]", data);

  broadcast(data);

  res.json({
    status: "ok",
    ws_clients: wsClientCount,
    last_esp_data_at: lastEspDataAt,
    last_fall_at: lastFallAt,
  });
});

app.get("/", (req, res) => {
  res.send("GPS backend running");
});

// ===== heartbeat status tiap 5 detik =====
setInterval(() => {
  const now = new Date();
  const espAgeMs = lastEspDataAt ? now - lastEspDataAt : null;
  const fallAgeMs = lastFallAt ? now - lastFallAt : null;

  console.log("============== HEARTBEAT ==============");
  console.log(`WS clients        : ${wsClientCount}`);
  console.log(
    lastEspDataAt
      ? `Last ESP data    : ${lastEspDataAt.toLocaleTimeString()} (${Math.round(
          espAgeMs / 1000
        )}s ago)`
      : `Last ESP data    : belum ada`
  );

  console.log(
    lastFallAt
      ? `Last FALL event  : ${lastFallAt.toLocaleTimeString()} (${Math.round(
          fallAgeMs / 1000
        )}s ago)`
      : `Last FALL event  : belum ada`
  );

  if (lastPayload) {
    console.log(`Last payload      : ${JSON.stringify(lastPayload)}`);
  }
  console.log("=======================================");
}, 5000);

// ===== start server =====
app.listen(PORT, () => {
  const ip = getLocalIP();

  console.log(`HTTP server (local)  : http://localhost:${PORT}`);
  if (ip) console.log(`HTTP server (LAN)    : http://${ip}:${PORT}`);

  console.log(`WebSocket (local)    : ws://localhost:8080`);
  if (ip) console.log(`WebSocket (LAN)      : ws://${ip}:8080`);

  if (!ip) console.log("[WARN] IP LAN tidak ketemu. Cek WiFi/LAN.");
});
