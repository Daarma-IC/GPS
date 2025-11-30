// src/components/GpsCard.js
import React from 'react';

function GpsCard({ data, lastFix }) {
  // posisi default (tengah Indonesia)
  const defaultCenter = {
    latitude: -2.5,
    longitude: 118.0,
  };

  const hasFixNow =
    data &&
    !data.error &&
    data.latitude != null &&
    data.longitude != null;

  const center = hasFixNow
    ? {
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
    }
    : lastFix
      ? lastFix
      : defaultCenter;

  const lat = center.latitude;
  const lng = center.longitude;
  const mapSrc = `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;

  return (
    <div className="gps-card">
      <h1 className="gps-title">Data GPS dari Arduino</h1>

      <div className="gps-card-inner">
        <h2 className="gps-section-title">GPS Live Map</h2>

        {/* STATUS */}
        {data && data.error === 'no_fix' && (
          <p className="gps-status gps-status-warning">
            Status: NO FIX (menunggu sinyal GPS)
          </p>
        )}

        {hasFixNow && (
          <p className="gps-status gps-status-ok">
            Status: FIX · Satelit: {data.satellites ?? '-'}
          </p>
        )}

        {!hasFixNow && !lastFix && (
          <p className="gps-text gps-text-muted">
            Belum ada posisi valid. Map di-center ke posisi default
            (misal Indonesia).
          </p>
        )}

        {!hasFixNow && lastFix && (
          <p className="gps-text gps-text-muted">
            Menampilkan posisi terakhir yang valid:
            <br />
            <strong>Lat:</strong> {lastFix.latitude}{' '}
            <strong>Lng:</strong> {lastFix.longitude}
          </p>
        )}

        {/* KOORDINAT */}
        {hasFixNow && (
          <div className="gps-coords">
            <div>
              <span className="gps-label">Latitude</span>
              <span className="gps-value">
                {Number(data.latitude).toFixed(6)}
              </span>
            </div>
            <div>
              <span className="gps-label">Longitude</span>
              <span className="gps-value">
                {Number(data.longitude).toFixed(6)}
              </span>
            </div>
          </div>
        )}

        {/* MAP */}
        <div className="gps-map-container">
          <iframe
            title="gps-map"
            src={mapSrc}
            width="100%"
            height="100%"
            className="gps-iframe"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="gps-link"
        >
          Buka di Google Maps
        </a>
      </div>

      <footer className="gps-footer">
        © 2025 GPS Monitoring
      </footer>
    </div>
  );
}

export default GpsCard;
