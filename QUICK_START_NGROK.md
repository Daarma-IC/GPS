# 🚀 Quick Start Guide - Ngrok Setup

## ⚡ Fast Setup (5 minutes)

### Step 1: Get Ngrok Running
1. Download ngrok: https://ngrok.com/download
2. Extract to `C:\ngrok\`
3. Sign up free: https://ngrok.com/signup
4. Get auth token: https://dashboard.ngrok.com/get-started/your-authtoken
5. Run:
   ```powershell
   cd C:\ngrok
   .\ngrok authtoken YOUR_TOKEN_HERE
   ```

### Step 2: Start Your Servers
Open 3 terminals:

**Terminal 1 - Backend:**
```powershell
cd c:\Users\darma\Documents\GPS\backend
node server.js
```

**Terminal 2 - Ngrok:**
```powershell
cd C:\ngrok
.\ngrok http 8080
```

**Terminal 3 - Frontend:**
```powershell
cd c:\Users\darma\Documents\GPS\frontend
npm start
```

### Step 3: Update ESP32
1. Copy the **ngrok URL** from terminal 2 (e.g., `abc123.ngrok.io`)
2. Open `GPSxMPU_ngrok.ino` in Arduino IDE
3. Update line 19:
   ```cpp
   const char* ngrokDomain = "abc123.ngrok.io";  // YOUR URL HERE
   ```
4. Upload to ESP32

### Step 4: Test!
- ESP32 Serial Monitor should show: `[HTTP 200]`
- Backend should show: `✅ ESP → BACKEND OK`
- Frontend map should update with GPS data

---

## 🎯 ngrok URLs You'll See

When you run `ngrok http 8080`, you'll see:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8080
```

**Important:**
- Backend server runs on port **8080** (WebSocket)
- Frontend runs on port **3000** (React app)
- You only need to tunnel port **8080**

---

## 💡 Configuration Examples

### LOCAL MODE (Same WiFi):
```cpp
// In GPSxMPU_ngrok.ino:
const char* serverUrl  = "http://192.168.1.8:3001/gps";  
const bool useHTTPS = false;
```

### NGROK MODE (Anywhere):
```cpp
// In GPSxMPU_ngrok.ino:
const char* ngrokDomain = "abc123.ngrok.io";
const bool useHTTPS = true;
```

---

## ⚠️ Common Issues

### ESP32 shows `[HTTP -1]`:
- ✅ Check ngrok is running
- ✅ Check ngrok URL is correct (no https://)
- ✅ Verify `useHTTPS = true`

### Backend doesn't receive data:
- ✅ Server must be on port 8080
- ✅ Ngrok must tunnel port 8080
- ✅ Firewall not blocking

### Ngrok URL changes:
- This is normal on free tier
- Update ESP32 code with new URL
- Or upgrade to paid plan for static URL

---

## 🔄 Daily Workflow

1. Start backend: `node server.js`
2. Start ngrok: `.\ngrok http 8080`
3. Copy ngrok URL → Update ESP32 if changed
4. Power on ESP32
5. Open http://localhost:3000 to view map

That's it! 🎉
