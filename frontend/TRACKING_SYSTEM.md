# 🔗 Tracking System - Fall Event Tracking URL

## Overview

Sistem tracking memungkinkan setiap fall event memiliki unique URL yang dapat dibagikan ke Telegram, keluarga, atau pihak emergency. URL ini berisi detail lengkap lokasi dan waktu jatuh.

## Tracking URL Format

```
http://localhost:3000/fall/{fallId}
```

**Contoh:**
```
http://localhost:3000/fall/1732560123456
http://localhost:3000/fall/DEMO_1732560456789
```

## Implementasi

### Backend (server.js)

**File:** `/backend/server.js`

**Fungsi:** `sendTelegramNotification()` (line 43-120)

```javascript
const fallId = fallData.fall_id || Date.now();
const fallLink = `${WEB_URL}/fall/${fallId}`;

// Telegram message dengan embedded link
const message = `
🚨🚨🚨 KAKEK ANDA JATUH! 🚨🚨🚨

📍 LOKASI JATUH:
${lat}, ${lng}

👉 KLIK LINK INI UNTUK LIHAT LOKASI:
${fallLink}
`;

// Telegram inline button
reply_markup: {
  inline_keyboard: [
    [{ text: "🗺️ LIHAT LOKASI JATUH", url: fallLink }],
    [{ text: "🚨 SEGERA HUBUNGI AMBULANS 112", url: `https://wa.me/...` }],
    [{ text: "📲 HUBUNGI KELUARGA", url: `https://t.me/...` }],
  ]
}
```

### Frontend (FallDetail.js)

**File:** `src/pages/FallDetail.js`

**Fitur:**
- Display tracking URL dengan format monospace
- Copy button untuk mudah copy URL ke clipboard
- Blue theme untuk visual distinction

```javascript
const trackingUrl = `${window.location.origin}/fall/${fallId}`;

const copyTrackingUrl = () => {
  navigator.clipboard.writeText(trackingUrl);
  alert('✅ Tracking URL copied to clipboard!');
};
```

**Output HTML:**
```html
<div className="tracking-url-box">
  <code className="tracking-code">http://localhost:3000/fall/1732560123456</code>
  <button onClick={copyTrackingUrl} className="copy-button">
    📋 Copy
  </button>
</div>
```

## User Flow

### 1. Fall Event Terjadi
```
Arduino → Backend (POST /gps)
  ├─ fall_detected: true
  ├─ fall_id: 1732560123456
  ├─ fall_lat, fall_lng, fall_strength
  └─ timestamp
```

### 2. Backend Kirim Telegram
```
Backend → Telegram API
  ├─ Message: "KAKEK JATUH! ..."
  ├─ Tracking Link: http://localhost:3000/fall/1732560123456
  └─ Inline Buttons (LIHAT LOKASI, HUBUNGI AMBULANS, SHARE)
```

### 3. Frontend Display Detail
```
User klik Telegram Link
  ↓
Frontend: GET /fall/:fallId
  ↓
Backend: GET /falls/1732560123456
  ↓
Display Fall Detail Page
  ├─ Event ID
  ├─ Waktu Jatuh
  ├─ Lokasi (Lat/Lng)
  ├─ Tracking URL (bisa di-copy)
  ├─ Google Maps Link
  └─ Map dengan marker
```

### 4. Share/Copy Tracking URL
```
User lihat Detail Jatuh
  ↓
Click "📋 Copy" button
  ↓
URL disalin ke clipboard
  ↓
User bisa share ke WhatsApp, Telegram, atau media lain
```

## API Endpoints

### GET /falls
**Deskripsi:** Get semua fall events
```bash
curl http://localhost:3001/falls
```

**Response:**
```json
{
  "status": "ok",
  "count": 2,
  "events": [
    {
      "id": 1732560123456,
      "timestamp": 1732560123456,
      "latitude": -6.89234,
      "longitude": 107.60123,
      "strength": 87.3,
      "data": {...}
    }
  ]
}
```

### GET /falls/:fallId
**Deskripsi:** Get detail specific fall event
```bash
curl http://localhost:3001/falls/1732560123456
```

**Response:**
```json
{
  "status": "ok",
  "event": {
    "id": 1732560123456,
    "timestamp": 1732560123456,
    "latitude": -6.89234,
    "longitude": 107.60123,
    "strength": 87.3
  }
}
```

### POST /falls/notify
**Deskripsi:** Frontend trigger fall notification ke Telegram
```bash
curl -X POST http://localhost:3001/falls/notify \
  -H "Content-Type: application/json" \
  -d '{
    "fall_id": "DEMO_1732560456789",
    "fall_lat": -6.89234,
    "fall_lng": 107.60123,
    "fall_ts": 1732560456789,
    "fall_strength": 85.5
  }'
```

## Styling (FallDetail.js)

### Tracking URL Box
```css
.tracking-url-box {
  display: flex;
  gap: 8px;
  align-items: center;
  background: rgba(59, 130, 246, 0.08);    /* Light blue */
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
}
```

### Tracking Code
```css
.tracking-code {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: #60a5fa;                          /* Bright blue */
  word-break: break-all;
}
```

### Copy Button
```css
.copy-button {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}
```

## Features

✅ **Unique ID per Event**
- Format: Timestamp atau "DEMO_" + timestamp
- Mudah diidentifikasi

✅ **Automatic Link Generation**
- Backend otomatis generate tracking link
- Frontend otomatis display URL

✅ **Copy to Clipboard**
- One-click copy
- Feedback visual (alert)

✅ **Share Ready**
- URL format standar
- Bisa dibagikan via WhatsApp, Telegram, Email, SMS

✅ **Telegram Integration**
- Link embedded di Telegram message
- Inline button untuk direct access
- Action buttons (Ambulans, Share keluarga)

## Testing

### Test Case 1: Real GPS Fall
1. Arahkan device ke lokasi test
2. Trigger fall pada GPS device
3. Cek Telegram notification
4. Klik link di Telegram
5. Verifikasi detail jatuh muncul
6. Copy tracking URL
7. Share ke perangkat lain

### Test Case 2: Demo Fall
1. Klik "Demo Fall" button
2. Backend kirim notifikasi ke Telegram
3. Klik link di Telegram (ke `/fall/DEMO_xxx`)
4. Check FallDetail page load dengan benar
5. Copy tracking URL
6. Verify URL dapat dibagikan

## Configuration

### Frontend Base URL
**File:** `src/pages/FallDetail.js` line 71
```javascript
const trackingUrl = `${window.location.origin}/fall/${fallId}`;
// window.location.origin = http://localhost:3000 atau domain production
```

### Backend Base URL
**File:** `server.js` line 18
```javascript
const WEB_URL = "http://192.168.1.22:3000"; // Change ini untuk production
```

## Production Checklist

- [ ] Update `WEB_URL` di backend (production domain)
- [ ] Update `window.location.origin` handling di frontend
- [ ] Test Telegram links bekerja di production
- [ ] Setup SSL/HTTPS untuk tracking links
- [ ] Configure fallback error page untuk invalid fallId
- [ ] Setup analytics untuk tracking link clicks (optional)
- [ ] Test copy-to-clipboard di semua browser
- [ ] Test URL sharing di WhatsApp, Telegram, Email

## Security Notes

⚠️ **Public URLs:** Tracking URLs adalah public dan dapat diakses siapa saja
- Jangan simpan data sensitif di halaman detail
- Hanya tampilkan: koordinat, waktu, strength
- Jangan tampilkan: nama lengkap, alamat detail, informasi medis

💡 **Recommendation:**
- Jika perlu proteksi: tambahkan PIN/password di halaman detail
- Atau: implement time-based URL expiry (24 jam)
- Atau: implement access control berdasarkan emergency contact

## Troubleshooting

### Tracking URL tidak ter-generate
- Cek `fall_id` di request
- Cek `WEB_URL` di server.js sudah correct
- Cek Telegram API response di server logs

### Copy button tidak bekerja
- Cek browser support untuk `navigator.clipboard`
- Fallback ke `document.execCommand('copy')` untuk browser lama

### Link tidak aktif di Telegram
- Cek `WEB_URL` dapat diakses dari device Telegram user
- Verify HTTPS certificate jika menggunakan HTTPS
- Check firewall rules allow incoming traffic

