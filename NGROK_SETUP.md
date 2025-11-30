# 🌐 Ngrok Setup Guide - ESP32 Remote Access

## Overview
This guide will help you expose your local GPS tracking server to the internet using **ngrok**, allowing your ESP32 to send data from anywhere in the world.

---

## 📥 Step 1: Install Ngrok

### Option A: Download Manually
1. Go to: https://ngrok.com/download
2. Download Windows version (ZIP file)
3. Extract to `C:\ngrok\` or any folder
4. Add folder to PATH (optional)

### Option B: Using Winget (Windows 11)
```powershell
winget install --id=ngrok.ngrok -e
```

---

## 🔑 Step 2: Create Account & Get Auth Token

1. **Sign up**: https://ngrok.com/signup (FREE account)
2. **Get token**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Configure ngrok**:
   ```powershell
   cd C:\ngrok
   ngrok authtoken YOUR_TOKEN_HERE
   ```

---

## 🚀 Step 3: Start Ngrok Tunnel

### Method 1: Using the Helper Script
Double-click `start-ngrok.bat` in the project folder

### Method 2: Manual Command
```powershell
cd C:\ngrok
ngrok http 8080
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:8080
```

**Copy the HTTPS URL** (e.g., `https:// abc123.ngrok.io`)

---

## 🔧 Step 4: Update ESP32 Code

Open your ESP32 Arduino sketch and update these lines:

```cpp
// OLD (Local network only):
const char* serverHost = "192.168.1.100";  // Your PC's IP
const int serverPort = 8080;

// NEW (Works from anywhere with ngrok):
const char* serverHost = "abc123.ngrok.io";  // Your ngrok subdomain (NO https://)
const int serverPort = 443;  // HTTPS port
const bool useHTTPS = true;  // Enable HTTPS
```

### Full Example Update:
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Ngrok server config
const char* serverHost = "abc123.ngrok.io";  // REPLACE with your ngrok URL
const int serverPort = 443;
const String serverPath = "/gps";

void sendGPSData(float lat, float lng, int satellites) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Use HTTPS with ngrok
    String url = "https://" + String(serverHost) + serverPath;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    String jsonData = "{";
    jsonData += "\"latitude\":" + String(lat, 6) + ",";
    jsonData += "\"longitude\":" + String(lng, 6) + ",";
    jsonData += "\"satellites\":" + String(satellites);
    jsonData += "}";
    
    int httpCode = http.POST(jsonData);
    
    if (httpCode > 0) {
      Serial.printf("[HTTP] POST code: %d\n", httpCode);
      Serial.println(http.getString());
    } else {
      Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
    }
    
    http.end();
  }
}
```

---

## ✅ Step 5: Test Everything

### 1. Start Backend Server:
```powershell
cd backend
node server.js
```

### 2. Start Ngrok Tunnel:
```powershell
# Double-click start-ngrok.bat
# OR run manually:
ngrok http 8080
```

### 3. Update ESP32 Code:
- Replace `serverHost` with ngrok URL (without https://)
- Upload to ESP32
- Monitor Serial output

### 4. Verify:
You should see in server logs:
```
✅ ESP → BACKEND OK | 20:30:45
[FIX] { latitude: -6.2088, longitude: 106.8456, satellites: 12 }
✅ BACKEND → WEBSITE OK | broadcast ke 1 client
```

---

## 🔄 Important Notes

### Ngrok Free Tier Limitations:
- ✅ **Random URL** changes every restart (e.g., `abc123.ngrok.io`)
- ✅ **40 connections/minute** limit (plenty for GPS tracker)
- ✅ **1 online tunnel** at a time
- ✅ **Expires after 2 hours** (need to restart)

### To Keep Same URL (Paid Plan):
```powershell
# Paid plan allows custom subdomains:
ngrok http 8080 --subdomain=mygpstracker
# URL will be: https://mygpstracker.ngrok.io
```

### Auto-Restart Script:
If you want ngrok to auto-restart, you can use a service like **nssm** or Windows Task Scheduler.

---

## 🛠️ Troubleshooting

### ESP32 Can't Connect:
1. **Check ngrok is running** - Look for "Forwarding https://..." message
2. **Use correct URL** - Copy full subdomain (e.g., `abc123.ngrok.io`)
3. **Remove https://** from ESP32 code - Only use domain name
4. **Use port 443** for HTTPS
5. **Check ESP32 WiFi** - Must be connected

### Server Not Receiving Data:
1. Check backend server is running (`node server.js`)
2. Check ngrok tunnel is active
3. Look at ngrok web interface: http://localhost:4040

### Ngrok Web Interface:
Visit **http://localhost:4040** to see:
- Real-time requests
- Request/response details
- Connection status

---

## 📱 Multiple ESP32 Devices

To track multiple devices, you can:
1. Use same ngrok URL for all ESP32s
2. Add device ID in the JSON data:
   ```cpp
   jsonData += "\"device_id\":\"ESP32_001\",";
   ```
3. Filter by device_id on the frontend

---

## 🔐 Security Tips

1. **Don't share ngrok URL publicly** - It's public internet
2. **Add authentication** to your server (optional):
   ```javascript
   app.use('/gps', (req, res, next) => {
     const apiKey = req.headers['x-api-key'];
     if (apiKey !== 'YOUR_SECRET_KEY') {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   });
   ```
3. **Regenerate ngrok** tunnel if compromised

---

## 📞 Quick Reference

| Service | Local | Ngrok |
|---------|-------|-------|
| Backend HTTP | `http://localhost:3001` | Not needed |
| WebSocket | `ws://localhost:8080` | `https://abc123.ngrok.io` |
| Frontend | `http://localhost:3000` | Access via local |
| ESP32 POST | `http://192.168.1.x:8080/gps` | `https://abc123.ngrok.io/gps` |

---

## 🎯 Next Steps

After ngrok is working:
1. ✅ Test from different WiFi network
2. ✅ Test from mobile hotspot
3. ✅ Configure fall detection alerts
4. ✅ Add battery monitoring
5. ✅ Set up cloud database (optional)

---

**Need help?** Check ngrok docs: https://ngrok.com/docs
