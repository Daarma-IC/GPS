// src/pages/Home.js
import React, { useRef, useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Pane,
} from "react-leaflet";
import L from "leaflet";

// Fix default icon leaflet biar marker default gak error (meski kita gak pakai pin lagi)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = { lat: -2.5, lng: 118.0 };
const FALL_WAVE_DURATION = 10000; // 10 detik radar
const FALL_WAVE_EXTRA = 3500;     // buffer buat delay gelombang
const BACKEND_URL = "http://localhost:3001";

// Function untuk kirim notifikasi ke backend
async function sendFallNotificationToBackend(fallData) {
  try {
    const response = await fetch(`${BACKEND_URL}/falls/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallData),
    });
    if (response.ok) {
      console.log("✅ Notifikasi fall terkirim ke backend");
    } else {
      console.error("❌ Gagal kirim notifikasi:", response.status);
    }
  } catch (error) {
    console.error("❌ Error kirim notifikasi:", error);
  }
}

function Home() {
  const [gpsData, setGpsData] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const [wsStatus, setWsStatus] = useState("DISCONNECTED");

  const [fallEvents, setFallEvents] = useState([]);
  const lastFallIdRef = useRef(null);

  useWebSocket("ws://localhost:8080", {
    onOpen: () => setWsStatus("CONNECTED"),
    onClose: () => setWsStatus("DISCONNECTED"),
    onError: () => setWsStatus("ERROR"),
    onMessage: (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setGpsData(parsed);

        if (!parsed.error && parsed.latitude != null && parsed.longitude != null) {
          setLastFix({
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            satellites: parsed.satellites ?? null,
            timestamp: new Date(),
          });
        }

        if (parsed.fall_detected) {
          const fid = parsed.fall_id ?? Date.now();
          if (fid === lastFallIdRef.current) return;
          lastFallIdRef.current = fid;

          const fallLat =
            parsed.fall_lat != null ? Number(parsed.fall_lat) : Number(parsed.latitude);
          const fallLng =
            parsed.fall_lng != null ? Number(parsed.fall_lng) : Number(parsed.longitude);

          setFallEvents((prev) => {
            const now = Date.now();
            const next = [
              {
                id: fid,
                lat: fallLat,
                lng: fallLng,
                ts: parsed.fall_ts ?? now,
                strength: parsed.fall_strength ?? null,
                expiresAt: now + FALL_WAVE_DURATION + FALL_WAVE_EXTRA,
              },
              ...prev,
            ];
            return next.slice(0, 20);
          });

          // Kirim notifikasi ke backend (backend akan forward ke Telegram)
          sendFallNotificationToBackend({
            fall_id: fid,
            fall_lat: fallLat,
            fall_lng: fallLng,
            fall_ts: parsed.fall_ts ?? Date.now(),
            fall_strength: parsed.fall_strength ?? null,
          });
        }
      } catch (err) {
        console.error("Gagal parse data GPS:", err, event.data);
      }
    },
    shouldReconnect: () => true,
  });

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      setFallEvents((prev) => prev.filter((e) => e.expiresAt > now));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const hasFixNow =
    gpsData && !gpsData.error && gpsData.latitude != null && gpsData.longitude != null;

  const center = hasFixNow
    ? { lat: Number(gpsData.latitude), lng: Number(gpsData.longitude) }
    : lastFix
    ? { lat: lastFix.latitude, lng: lastFix.longitude }
    : DEFAULT_CENTER;

  const sats =
    (gpsData && gpsData.satellites) || (lastFix && lastFix.satellites) || 0;

  const statusText = (() => {
    if (!gpsData && !lastFix) return "Menunggu data...";
    if (gpsData && gpsData.error === "no_fix") return "NO FIX · menunggu sinyal GNSS";
    if (hasFixNow) return "FIX · posisi terkini";
    if (lastFix) return "FIX · menampilkan posisi terakhir";
    return "Menunggu data...";
  })();

  const fixQuality = (() => {
    if (sats === 0) return "No signal";
    if (sats <= 3) return "Poor";
    if (sats <= 7) return "Moderate";
    return "Good";
  })();

  const currentLat = hasFixNow
    ? Number(gpsData.latitude).toFixed(6)
    : lastFix
    ? lastFix.latitude.toFixed(6)
    : "-";

  const currentLng = hasFixNow
    ? Number(gpsData.longitude).toFixed(6)
    : lastFix
    ? lastFix.longitude.toFixed(6)
    : "-";

  return (
    <div className="mp-root">
      <div className="mp-layout">
        {/* SIDEBAR */}
        <aside className="mp-sidebar">
          <h2 className="mp-sidebar-title">TELEMETRY</h2>

          <div className="mp-panel">
            <div className="mp-panel-header">Connection</div>
            <div className="mp-panel-body">
              <div className={`mp-badge mp-badge-${wsStatus.toLowerCase()}`}>
                {wsStatus}
              </div>
              <div className="mp-status-text">{statusText}</div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">GNSS Status</div>
            <div className="mp-panel-body mp-grid">
              <div>
                <span className="mp-label">Satellites</span>
                <span className="mp-value">{sats}</span>
              </div>
              <div>
                <span className="mp-label">Fix</span>
                <span className="mp-value">{hasFixNow || lastFix ? "YES" : "NO"}</span>
              </div>
              <div>
                <span className="mp-label">Quality</span>
                <span className="mp-value">{fixQuality}</span>
              </div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">Coordinates</div>
            <div className="mp-panel-body mp-grid">
              <div>
                <span className="mp-label">Latitude</span>
                <span className="mp-value">{currentLat}</span>
              </div>
              <div>
                <span className="mp-label">Longitude</span>
                <span className="mp-value">{currentLng}</span>
              </div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">Last Update</div>
            <div className="mp-panel-body">
              <div className="mp-status-text">
                {lastFix?.timestamp ? lastFix.timestamp.toLocaleTimeString() : "-"}
              </div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">Fall Alerts</div>
            <div className="mp-panel-body">
              {fallEvents.length === 0 && (
                <div className="muted">Belum ada jatuh terdeteksi</div>
              )}
              {fallEvents.map((ev) => (
                <div key={ev.id} className="alert-item">
                  🚨 JATUH TERDETEKSI
                  <div className="small">
                    {new Date(ev.ts).toLocaleTimeString()} <br />
                    Lat: {ev.lat?.toFixed(6)} | Lng: {ev.lng?.toFixed(6)}
                    {ev.strength && <> | Strength: {ev.strength}</>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="mp-main">
          <div className="mp-toolbar">
            <div className="mp-toolbar-left">
              <span className="mp-title">Data GPS dari Arduino</span>
              <span className="mp-subtitle">
                {hasFixNow ? "Live Position" : "Waiting for Fix"}
              </span>
            </div>
            <div className="mp-toolbar-right">
              <span className="mp-chip">
                Center: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="mp-map-wrapper">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={17}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Pane radar di bawah */}
              <Pane name="fallPane" style={{ zIndex: 400 }}>
                {fallEvents.map((ev) => (
                  <React.Fragment key={ev.id}>
                    {[0, 1, 2].map((i) => (
                      <CircleMarker
                        key={`${ev.id}-${i}`}
                        center={[ev.lat, ev.lng]}
                        radius={10}
                        pathOptions={{ className: `pulse-circle pulse-delay-${i}` }}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </Pane>

              {/* Pane dot biru di atas radar */}
              <Pane name="livePane" style={{ zIndex: 650 }}>
                {(hasFixNow || lastFix) && (
                  <CircleMarker
                    center={[center.lat, center.lng]}
                    radius={7}
                    pathOptions={{ className: "live-dot" }}
                  >
                    <Popup>
                      Posisi sekarang <br />
                      Lat: {currentLat} <br />
                      Lng: {currentLng}
                    </Popup>
                  </CircleMarker>
                )}
              </Pane>
            </MapContainer>

            {/* HUD overlay */}
            <div className="mp-hud">
              <div className="mp-hud-card">
                <div className="mp-hud-row">
                  <span className="mp-hud-title">GNSS</span>
                  <span
                    className={
                      hasFixNow
                        ? "mp-hud-pill mp-hud-pill-fix"
                        : "mp-hud-pill mp-hud-pill-nofix"
                    }
                  >
                    {hasFixNow ? "FIX" : "NO FIX"}
                  </span>
                </div>
                <div className="mp-hud-grid">
                  <div>
                    <span className="mp-label">Sat</span>
                    <span className="mp-value">{sats}</span>
                  </div>
                  <div>
                    <span className="mp-label">Quality</span>
                    <span className="mp-value">{fixQuality}</span>
                  </div>
                  <div>
                    <span className="mp-label">Lat</span>
                    <span className="mp-value-small">{currentLat}</span>
                  </div>
                  <div>
                    <span className="mp-label">Lng</span>
                    <span className="mp-value-small">{currentLng}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mp-statusbar">
            <span>
              {statusText} | Sat: {sats}
            </span>
            <a
              href={`https://www.google.com/maps?q=${center.lat},${center.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Buka di Google Maps
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;
