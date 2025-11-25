/**
 * Configuration file untuk GPS Monitoring App
 * Edit nilai di bawah sesuai kebutuhan Anda
 */

// IP Address atau hostname backend
// Contoh: "192.168.1.22" atau "10.0.0.5" atau "localhost"
export const BACKEND_IP = "192.168.1.22";

// Port backend
export const BACKEND_PORT = 3001;

// Port WebSocket
export const WEBSOCKET_PORT = 8080;

// Build backend URL
export const BACKEND_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;

// Build WebSocket URL
export const WEBSOCKET_URL = `ws://${BACKEND_IP}:${WEBSOCKET_PORT}`;

// Default center map (latitude, longitude)
export const DEFAULT_CENTER = {
  lat: -6.9,  // Jawa Barat
  lng: 107.6
};

// Map zoom level
export const DEFAULT_ZOOM = 17;

// Fall detection settings
export const FALL_WAVE_DURATION = 10000;      // 10 detik radar animation
export const FALL_WAVE_EXTRA = 3500;          // 3.5 detik buffer delay
export const MAX_FALL_EVENTS = 20;            // Max fall events di state

export default {
  BACKEND_IP,
  BACKEND_PORT,
  WEBSOCKET_PORT,
  BACKEND_URL,
  WEBSOCKET_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FALL_WAVE_DURATION,
  FALL_WAVE_EXTRA,
  MAX_FALL_EVENTS
};
