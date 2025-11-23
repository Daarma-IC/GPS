import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "../App.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BACKEND_URL = "http://localhost:3001";

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

  return (
    <div className="fall-detail-container">
      <button className="back-button" onClick={() => navigate("/")}>
        ← Kembali
      </button>

      <div className="fall-detail-content">
        <h1>🚨 Detail Jatuh</h1>

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
            <label>📍 Lokasi:</label>
            <span className="info-value">
              {lat}, {lng}
            </span>
          </div>

          {fallEvent.strength && (
            <div className="info-row">
              <label>💪 Kekuatan Impact:</label>
              <span className="info-value">{fallEvent.strength}</span>
            </div>
          )}

          <div className="info-row">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="google-maps-link"
            >
              🗺️ Buka di Google Maps
            </a>
          </div>
        </div>

        {lat !== "?" && lng !== "?" && (
          <div className="map-container">
            <MapContainer
              center={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
              zoom={15}
              style={{ height: "400px", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <CircleMarker
                center={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
                radius={20}
                fillColor="red"
                fillOpacity={0.7}
                stroke={true}
                color="darkred"
                weight={2}
              >
                <Popup>
                  Lokasi jatuh: {lat}, {lng}
                </Popup>
              </CircleMarker>
            </MapContainer>
          </div>
        )}
      </div>

      <style jsx>{`
        .fall-detail-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e5e7eb;
          padding: 20px;
        }

        .back-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          margin-bottom: 20px;
          transition: background 0.3s;
        }

        .back-button:hover {
          background: #2563eb;
        }

        .loading,
        .error {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #475569;
        }

        .error {
          color: #f87171;
          border-color: #dc2626;
        }

        .fall-detail-content {
          max-width: 900px;
          margin: 0 auto;
        }

        h1 {
          margin-bottom: 30px;
          font-size: 32px;
          text-align: center;
        }

        .fall-info-panel {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #475569;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 30px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #334155;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row label {
          font-weight: 600;
          color: #cbd5e1;
          min-width: 150px;
        }

        .info-value {
          color: #f1f5f9;
          font-family: monospace;
          word-break: break-all;
        }

        .google-maps-link {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        }

        .google-maps-link:hover {
          color: #93c5fd;
          text-decoration: underline;
        }

        .map-container {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid #475569;
          border-radius: 12px;
          overflow: hidden;
          padding: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}

export default FallDetail;
