// src/pages/Home.js
import React, { useState } from 'react';
import useWebSocket from 'react-use-websocket';

const DEFAULT_CENTER = { lat: -2.5, lng: 118.0 }; // tengah Indonesia

function Home() {
  const [gpsData, setGpsData] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');

  useWebSocket('ws://localhost:8080', {
    onOpen: () => setWsStatus('CONNECTED'),
    onClose: () => setWsStatus('DISCONNECTED'),
    onError: () => setWsStatus('ERROR'),
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
      } catch (err) {
        console.error('Gagal parse data GPS:', err, event.data);
      }
    },
    shouldReconnect: () => true,
  });

  const hasFixNow =
    gpsData &&
    !gpsData.error &&
    gpsData.latitude != null &&
    gpsData.longitude != null;

  const center = hasFixNow
    ? { lat: Number(gpsData.latitude), lng: Number(gpsData.longitude) }
    : lastFix
    ? { lat: lastFix.latitude, lng: lastFix.longitude }
    : DEFAULT_CENTER;

  const mapUrl = `https://www.google.com/maps?q=${center.lat},${center.lng}&z=17&output=embed`;

  const sats =
    (gpsData && gpsData.satellites) ||
    (lastFix && lastFix.satellites) ||
    0;

  const statusText = (() => {
    if (!gpsData && !lastFix) return 'Menunggu data...';
    if (gpsData && gpsData.error === 'no_fix') return 'NO FIX · menunggu sinyal GNSS';
    if (hasFixNow) return 'FIX · posisi terkini';
    if (lastFix) return 'FIX · menampilkan posisi terakhir';
    return 'Menunggu data...';
  })();

  const fixQuality = (() => {
    if (sats === 0) return 'No signal';
    if (sats <= 3) return 'Poor';
    if (sats <= 7) return 'Moderate';
    return 'Good';
  })();

  const currentLat = hasFixNow
    ? Number(gpsData.latitude).toFixed(6)
    : lastFix
    ? lastFix.latitude.toFixed(6)
    : '-';

  const currentLng = hasFixNow
    ? Number(gpsData.longitude).toFixed(6)
    : lastFix
    ? lastFix.longitude.toFixed(6)
    : '-';

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
                <span className="mp-value">
                  {hasFixNow || lastFix ? 'YES' : 'NO'}
                </span>
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
                {lastFix && lastFix.timestamp
                  ? lastFix.timestamp.toLocaleTimeString()
                  : '-'}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN AREA */}
        <main className="mp-main">
          <div className="mp-toolbar">
            <div className="mp-toolbar-left">
              <span className="mp-title">Data GPS dari Arduino</span>
              <span className="mp-subtitle">
                {hasFixNow ? 'Live Position' : 'Waiting for Fix'}
              </span>
            </div>
            <div className="mp-toolbar-right">
              <span className="mp-chip">
                Center: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </span>
            </div>
          </div>

          <div className="mp-map-wrapper">
            <iframe
              title="gps-map"
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            {/* HUD overlay di atas map */}
            <div className="mp-hud">
              <div className="mp-hud-card">
                <div className="mp-hud-row">
                  <span className="mp-hud-title">GNSS</span>
                  <span
                    className={
                      hasFixNow
                        ? 'mp-hud-pill mp-hud-pill-fix'
                        : 'mp-hud-pill mp-hud-pill-nofix'
                    }
                  >
                    {hasFixNow ? 'FIX' : 'NO FIX'}
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
