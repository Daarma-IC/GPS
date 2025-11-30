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
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ========================
// AUTO DETECT HOSTNAME
// ========================
const WS_URL = `ws://${window.location.hostname}:8080`;

const DEFAULT_CENTER = { lat: -2.5, lng: 118.0 };
const FALL_WAVE_DURATION = 100000;
const FALL_WAVE_EXTRA = 3500;

function Home() {
  const [gpsData, setGpsData] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const [wsStatus, setWsStatus] = useState("DISCONNECTED");

  const [fallEvents, setFallEvents] = useState([]);
  const lastFallIdRef = useRef(null);

  useWebSocket(WS_URL, {
    onOpen: () => setWsStatus("CONNECTED"),
    onClose: () => setWsStatus("DISCONNECTED"),
    onError: () => setWsStatus("ERROR"),
    onMessage: (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setGpsData(parsed);

        // Save last fix
        if (!parsed.error && parsed.latitude != null && parsed.longitude != null) {
          setLastFix({
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            satellites: parsed.satellites ?? null,
            timestamp: new Date(),
          });
        }

        // Fall detection
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
        }
      } catch (err) {
        console.error("Gagal parse data GPS:", err, event.data);
      }
    },
    shouldReconnect: () => true,
  });

  // Cleanup expired fall waves - REMOVED to keep logs persistent
  // We only want to stop the animation, not remove the log
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      // Only force re-render for animation updates if needed, but don't filter out events
      // setFallEvents((prev) => prev.map(e => ({...e, isAnimating: e.expiresAt > now}))); 
    }, 1000);
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
            <div className="mp-panel-header">
              <span className="panel-icon">🔌</span> Connection
            </div>
            <div className="mp-panel-body">
              <div className={`mp-badge mp-badge-${wsStatus.toLowerCase()}`}>
                {wsStatus}
              </div>
              <div className="mp-status-text">{statusText}</div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">
              <span className="panel-icon">🛰️</span> GPS Status
            </div>
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
            <div className="mp-panel-header">
              <span className="panel-icon">📍</span> Coordinates
            </div>
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
            <div className="mp-panel-header">
              <span className="panel-icon">⏱️</span> Last Update
            </div>
            <div className="mp-panel-body">
              <div className="mp-status-text">
                {lastFix?.timestamp ? lastFix.timestamp.toLocaleTimeString() : "-"}
              </div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel-header">
              <span className="panel-icon">🚨</span> Fall Alerts
            </div>
            <div className="mp-panel-body">
              {fallEvents.length === 0 && (
                <div className="muted">Belum ada jatuh terdeteksi</div>
              )}
              {fallEvents.map((ev) => {
                const isRecent = Date.now() - ev.ts < 60000;
                return (
                  <div key={ev.id} className={`alert-item ${!isRecent ? 'alert-old' : ''}`}>
                    <div className="alert-flex-container">
                      <span>🚨 JATUH TERDETEKSI</span>
                      {isRecent && <span className="mp-badge mp-badge-error alert-badge-new">BARU</span>}
                    </div>
                    <div className="small">
                      {new Date(ev.ts).toLocaleTimeString()} <br />
                      Lat: {ev.lat?.toFixed(6)} | Lng: {ev.lng?.toFixed(6)}
                      {ev.strength && <> | Strength: {ev.strength}</>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAP AREA */}
        <main className="mp-main">
          <div className="mp-toolbar">
            <div className="mp-toolbar-left">
              <span className="mp-title">Data GPS</span>
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
              className="map-container-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <Pane name="fallPane">
                {fallEvents.map((ev) => {
                  const isRecent = Date.now() - ev.ts < 60000; // 1 minute
                  return (
                    <React.Fragment key={ev.id}>
                      {/* Pulsing animation only for recent events */}
                      {isRecent && [0, 1, 2].map((i) => (
                        <CircleMarker
                          key={`${ev.id}-${i}`}
                          center={[ev.lat, ev.lng]}
                          radius={10}
                          pathOptions={{ className: `pulse-circle pulse-delay-${i}` }}
                        />
                      ))}
                      {/* Static marker for all events */}
                      <CircleMarker
                        center={[ev.lat, ev.lng]}
                        radius={6}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: 0.8,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <strong>JATUH TERDETEKSI</strong><br />
                          {new Date(ev.ts).toLocaleTimeString()}
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })}
              </Pane>

              <Pane name="livePane">
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

            <div className="mp-hud">
              <div className="mp-hud-card">
                <div className="mp-hud-row">
                  <span className="mp-hud-title">INFORMATION</span>
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
