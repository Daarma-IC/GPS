// server.js
const express = require("express");
const WebSocket = require("ws");
const os = require("os");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 8080; // Changed to 8080 to match ngrok tunnel

app.use(express.json());
app.use(cors());

// ===== Telegram Bot Config =====
const TELEGRAM_BOT_TOKEN = "8504372055:AAH8QnsObWHkxSLKJWYxD3LYpf9Wlh89lz4";
const TELEGRAM_CHAT_ID = 1310552986; // INTEGER, bukan string
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const ip = getLocalIP();
const WEB_URL = ip ? `http://${ip}:3000` : `http://localhost:3000`;

const wss = new WebSocket.Server({ port: 8081 }); // Changed to 8081 to avoid conflict with HTTP server

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
let fallEvents = []; // Store all fall events with timestamps

// ===== Function untuk kirim notifikasi ke Telegram =====
async function sendTelegramNotification(fallData) {
  try {
    const fallId = fallData.fall_id || Date.now();
    const lat = fallData.fall_lat || fallData.latitude || "?";
    const lng = fallData.fall_lng || fallData.longitude || "?";
    const fallLink = `${WEB_URL}/fall/${fallId}`;
    const now = new Date();

    const message = `
    🚨🚨🚨 KAKEK ANDA JATUH! 🚨🚨🚨

    ⚠️ SITUASI DARURAT ⚠️
    Kakek terdeteksi jatuh dan membutuhkan bantuan segera!

    ━━━━━━━━━━━━━━━━━━━━━━━━━
    📍 LOKASI JATUH:
    ${lat}, ${lng}

    🕐 WAKTU KEJADIAN:
    ${now.toLocaleString("id-ID")}

    💪 KEKUATAN IMPACT:
    ${fallData.fall_strength ? `${fallData.fall_strength} (Moderate-Severe)` : "N/A"}

    ━━━━━━━━━━━━━━━━━━━━━━━━━
    🆘 TINDAKAN CEPAT DIPERLUKAN 🆘

    👉 KLIK LINK INI UNTUK LIHAT LOKASI:
    ${fallLink}

    ━━━━━━━━━━━━━━━━━━━━━━━━━

    Pesan dari Sistem Monitoring GPS
    🔔 Notifikasi dikirim otomatis
    `.trim();

    console.log(`📤 Sending to Telegram...`);
    console.log(`   Chat ID: ${TELEGRAM_CHAT_ID} (type: ${typeof TELEGRAM_CHAT_ID})`);
    console.log(`   Message length: ${message.length}`);

    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🗺️ LIHAT LOKASI JATUH",
              url: fallLink,
            },
          ],
          [
            {
              text: "🚨 SEGERA HUBUNGI AMBULANS 112",
              url: `https://wa.me/?text=Tolong! Orang tua saya jatuh di koordinat: ${lat}, ${lng}. Link: ${fallLink}`,
            },
          ],
          [
            {
              text: "📲 HUBUNGI KELUARGA",
              url: "https://t.me/share/url?url=Orang%20tua%20saya%20jatuh!%20Lokasi%20jatuh:%20" + encodeURIComponent(`${lat}, ${lng}`) + "&text=" + encodeURIComponent(fallLink),
            },
          ],
        ],
      },
    });

    console.log(`✅ Telegram notification sent for fall ID: ${fallId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending Telegram notification:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

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

    // Store fall event dan kirim notifikasi Telegram
    const fallEvent = {
      id: data.fall_id || Date.now(),
      timestamp: Date.now(),
      latitude: data.fall_lat || data.latitude,
      longitude: data.fall_lng || data.longitude,
      strength: data.fall_strength || null,
      data: data,
    };
    fallEvents.push(fallEvent);

    // Kirim notifikasi ke Telegram
    sendTelegramNotification(data);
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

// ===== endpoint GET semua fall events =====
app.get("/falls", (req, res) => {
  res.json({
    status: "ok",
    count: fallEvents.length,
    events: fallEvents,
  });
});

// ===== endpoint GET detail fall event by ID =====
app.get("/falls/:fallId", (req, res) => {
  const { fallId } = req.params;
  const fallEvent = fallEvents.find((e) => String(e.id) === String(fallId));

  if (!fallEvent) {
    return res.status(404).json({
      status: "error",
      message: "Fall event not found",
    });
  }

  res.json({
    status: "ok",
    event: fallEvent,
  });
});

app.get("/ws-info", (req, res) => {
  const ip = getLocalIP();
  res.json({
    ws_url: ip ? `ws://${ip}:8081` : `ws://localhost:8081`
  });
});


// ===== endpoint POST untuk notify fall event dari frontend =====
app.post("/falls/notify", async (req, res) => {
  const fallData = req.body;

  // Kirim ke Telegram
  const result = await sendTelegramNotification(fallData);

  res.json({
    status: "ok",
    message: "Fall notification sent",
    telegram_sent: result ? true : false,
  });
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

  console.log(`WebSocket (local)    : ws://localhost:8081`);
  if (ip) console.log(`WebSocket (LAN)      : ws://${ip}:8081`);

  if (!ip) console.log("[WARN] IP LAN tidak ketemu. Cek WiFi/LAN.");
});