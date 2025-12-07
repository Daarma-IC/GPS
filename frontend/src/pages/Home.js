import React, { useRef, useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Pane,
  useMap,
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
const WS_URL = `ws://${window.location.hostname}:8081`; // Changed from 8080 to 8081

const DEFAULT_CENTER = { lat: -2.5, lng: 118.0 };

// Component to auto-center map when GPS location is detected
function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center.lat !== DEFAULT_CENTER.lat && center.lng !== DEFAULT_CENTER.lng) {
      // Pan to new location smoothly
      map.setView([center.lat, center.lng], map.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [center, map]);

  return null;
}

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

          // Skip auto-calibration messages (not real falls)
          const fallStrength = parsed.fall_strength || "";
          if (typeof fallStrength === "string" &&
            (fallStrength.toLowerCase().includes("calibrat") ||
              fallStrength.toLowerCase().includes("auto"))) {
            console.log('ℹ️ Skipping auto-calibration message (not a real fall)');
            return;
          }

          const fallLat =
            parsed.fall_lat != null ? Number(parsed.fall_lat) : Number(parsed.latitude);
          const fallLng =
            parsed.fall_lng != null ? Number(parsed.fall_lng) : Number(parsed.longitude);

          // Only create fall event if coordinates are valid
          if (!isFinite(fallLat) || !isFinite(fallLng)) {
            console.warn('⚠️ Fall detected but coordinates are invalid (NaN). Skipping fall event.', {
              fallLat,
              fallLng,
              rawData: parsed
            });
            return;
          }

          setFallEvents((prev) => {
            const now = Date.now();
            // Use Date.now() instead of parsed.fall_ts because ESP32 sends millis() (uptime)
            // which doesn't match real time. Browser time is more accurate.
            const fallTimestamp = now;

            console.log('🚨 Adding fall event:', {
              id: fid,
              timestamp: new Date(fallTimestamp).toLocaleTimeString(),
              lat: fallLat,
              lng: fallLng
            });

            const next = [
              {
                id: fid,
                lat: fallLat,
                lng: fallLng,
                ts: fallTimestamp,
                strength: parsed.fall_strength ?? null,
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

  // Cleanup expired fall events (remove after 10 minutes)
  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000; // 600,000 ms = 10 minutes

      setFallEvents((prev) => {
        const filtered = prev.filter(e => {
          const age = now - e.ts;
          const ageMinutes = Math.floor(age / 60000);
          const keepEvent = age < TEN_MINUTES;

          if (!keepEvent) {
            console.log(`🗑️ Removing fall event (age: ${ageMinutes} minutes)`);
          }

          return keepEvent;
        });

        if (filtered.length !== prev.length) {
          console.log(`✅ Cleanup: Removed ${prev.length - filtered.length} events older than 10 minutes`);
          console.log(`📊 Remaining events: ${filtered.length}`);
        }

        return filtered;
      });
    }, 60000); // Check every minute
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
              <div className="fall-alerts-scroll">
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

              {/* Auto-center map when GPS location is detected */}
              <MapUpdater center={center} />

              <Pane name="fallPane">
                {fallEvents.filter(ev => isFinite(ev.lat) && isFinite(ev.lng)).map((ev) => {
                  const age = Date.now() - ev.ts;
                  const isFresh = age < 600000; // Show animation for 10 minutes (600 seconds)

                  return (
                    <React.Fragment key={ev.id}>
                      {/* Radar-like wave animation for fresh events */}
                      {isFresh && [0, 1, 2, 3].map((i) => (
                        <CircleMarker
                          key={`${ev.id}-wave-${i}`}
                          center={[ev.lat, ev.lng]}
                          radius={50}
                          pathOptions={{
                            color: '#ef4444',
                            fillColor: 'none',
                            weight: 2,
                            opacity: 0,
                            className: `fall-wave fall-wave-${i}`
                          }}
                        />
                      ))}

                      {/* Central marker for all events */}
                      <CircleMarker
                        center={[ev.lat, ev.lng]}
                        radius={8}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: isFresh ? 1.0 : 0.6,
                          weight: 3
                        }}
                      >
                        <Popup>
                          <strong>🚨 JATUH TERDETEKSI</strong><br />
                          Waktu: {new Date(ev.ts).toLocaleTimeString()}<br />
                          {/* {ev.strength && `Kekuatan: ${ev.strength}g`} */}
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
