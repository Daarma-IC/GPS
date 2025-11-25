import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "../App.css";
import { BACKEND_URL } from "../config";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


function FallDetail() {
  const { fallId } = useParams();
  const navigate = useNavigate();
  const [fallEvent, setFallEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFallDetail = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/falls/${fallId}`);
        if (!response.ok) {
          throw new Error("Fall event not found");
        }
        const data = await response.json();
        setFallEvent(data.event);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFallDetail();
  }, [fallId]);

  if (loading) {
    return (
      <div className="fall-detail-container">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Kembali
        </button>
        <div className="loading">Loading fall detail...</div>
      </div>
    );
  }

  if (error || !fallEvent) {
    return (
      <div className="fall-detail-container">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Kembali
        </button>
        <div className="error">❌ {error || "Fall event tidak ditemukan"}</div>
      </div>
    );
  }

  const lat = fallEvent.latitude || "?";
  const lng = fallEvent.longitude || "?";
  const timestamp = new Date(fallEvent.timestamp);
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const trackingUrl = `${window.location.origin}/fall/${fallId}`;

  // Function untuk copy tracking URL
  const copyTrackingUrl = () => {
    navigator.clipboard.writeText(trackingUrl);
    alert('✅ Tracking URL copied to clipboard!');
  };

  return (
    <div className="fall-detail-container">
      <button className="back-button" onClick={() => navigate("/")}>
        ← Back
      </button>

      <div className="fall-detail-content">
        <div className="fall-header">
          <h1>Fall Event Details</h1>
          <p className="fall-time">{timestamp.toLocaleString("id-ID")}</p>
        </div>

        <div className="fall-layout">
          {lat !== "?" && lng !== "?" && (
            <div className="fall-map-section">
              <MapContainer
                center={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <CircleMarker
                  center={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
                  radius={8}
                  fillColor="#ef4444"
                  fillOpacity={0.8}
                  stroke={true}
                  color="#dc2626"
                  weight={1.5}
                >
                  <Popup>
                    📍 {lat}, {lng}
                  </Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          )}

          <div className="fall-info-panel">
          <div className="info-row">
            <label>ID Event:</label>
            <span className="info-value">{fallEvent.id}</span>
          </div>

          <div className="info-row">
            <label>Waktu:</label>
            <span className="info-value">
              {timestamp.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="info-row">
            <label>Lokasi:</label>
            <span className="info-value">
              {lat}, {lng}
            </span>
          </div>

          {fallEvent.strength && (
            <div className="info-row">
              <label>Kekuatan Impact:</label>
              <span className="info-value">{fallEvent.strength}</span>
            </div>
          )}

          <div className="info-row">
            <label>Tracking URL:</label>
            <div className="tracking-url-wrapper">
              <div className="tracking-url-box">
                <code className="tracking-code">{trackingUrl}</code>
                <button onClick={copyTrackingUrl} className="copy-button">
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="info-row">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="google-maps-link"
            >
              Buka di google Maps
            </a>
          </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .fall-detail-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #111827 50%, #0f172a 100%);
          color: #e5e7eb;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        .back-button {
          background: transparent;
          color: #60a5fa;
          border: none;
          padding: 16px 20px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .back-button:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .loading,
        .error {
          text-align: center;
          padding: 48px 24px;
          font-size: 1rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%);
          border: 1px solid rgba(148, 163, 184, 0.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .error {
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.3);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%);
        }

        .fall-detail-content {
          flex: 1;
          width: 100%;
        }

        .fall-header {
          background: linear-gradient(90deg, rgba(10, 14, 39, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
          padding: 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .fall-header h1 {
          margin: 0 0 8px 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .fall-time {
          margin: 0;
          font-size: 0.95rem;
          color: #94a3b8;
        }

        .fall-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 24px;
          padding-bottom: 80px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .fall-map-section {
          background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          height: 500px;
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .fall-info-panel {
          background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fall-info-panel:hover {
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        .info-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .info-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .info-row label {
          font-weight: 600;
          color: #94a3b8;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          color: #f1f5f9;
          font-family: 'Fira Code', 'Courier New', monospace;
          word-break: break-all;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .google-maps-link {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .google-maps-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .map-container {
          background: linear-gradient(135deg, #0f172a 0%, #1a1f3a 100%);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 12px;
          overflow: hidden;
          padding: 0;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .map-container:hover {
          border-color: rgba(148, 163, 184, 0.2);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        .tracking-url-wrapper {
          width: 100%;
          margin-top: 8px;
        }

        .tracking-url-box {
          display: flex;
          gap: 8px;
          align-items: center;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          width: 100%;
        }

        .tracking-code {
          flex: 1;
          font-family: 'Fira Code', monospace;
          font-size: 0.85rem;
          color: #60a5fa;
          background: transparent;
          padding: 0;
          border: none;
          word-break: break-all;
          padding: 0 !important;
          border-radius: 0 !important;
        }

        .copy-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .copy-button:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .copy-button:active {
          transform: scale(0.98);
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 1024px) {
          .fall-layout {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .fall-map-section {
            height: 400px;
          }
        }

        @media (max-width: 768px) {
          .fall-detail-container {
            padding: 0;
            padding-bottom: 60px;
          }

          .back-button {
            padding: 12px 16px;
            font-size: 0.9rem;
          }

          .fall-header {
            padding: 16px;
          }

          .fall-header h1 {
            font-size: 1.5rem;
            margin-bottom: 4px;
          }

          .fall-layout {
            grid-template-columns: 1fr;
            padding: 16px;
            padding-bottom: 40px;
            gap: 16px;
          }

          .fall-map-section {
            height: 300px;
          }

          .fall-info-panel {
            padding: 16px;
            gap: 12px;
          }

          .info-row {
            padding-bottom: 12px;
          }

          .tracking-url-wrapper {
            width: 100%;
            margin-top: 6px;
          }

          .tracking-url-box {
            flex-direction: column;
            gap: 8px;
            padding: 8px 10px;
          }

          .tracking-code {
            font-size: 0.75rem;
            word-break: break-all;
          }

          .copy-button {
            width: 100%;
            padding: 8px 12px;
            font-size: 0.7rem;
          }
        }

        @media (max-width: 480px) {
          .fall-detail-container {
            padding-bottom: 70px;
          }

          .fall-header h1 {
            font-size: 1.25rem;
          }

          .fall-layout {
            padding-bottom: 30px;
          }

          .fall-map-section {
            height: 250px;
          }

          .fall-info-panel {
            padding: 12px;
          }

          .info-row label {
            font-size: 0.8rem;
          }

          .info-value {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}

export default FallDetail;
