# 🚀 How to Run Ngrok - Step by Step Guide

## 📋 Prerequisites
✅ Ngrok installed (you already have it)  
✅ Auth token configured (already done)  
✅ Backend server running on port 8080

---

## 🎯 Step-by-Step Instructions

### **Step 1: Open PowerShell**
1. Press `Windows + X`
2. Click **"Windows PowerShell"** or **"Terminal"**
3. Navigate to your project folder:
   ```powershell
   cd c:\Users\darma\Documents\GPS
   ```

---

### **Step 2: Run Ngrok Command**

**Copy and paste this EXACT command:**
```powershell
ngrok http --url=nonaffinitive-cablelaid-kara.ngrok-free.dev 8080
```

**Press Enter**

---

### **Step 3: Verify It's Running**

You should see output like this:

```
ngrok                                                                           

Session Status                online
Account                       UnCalculs (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://nonaffinitive-cablelaid-kara.ngrok-free.dev -> http://localhost:8080

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Look for:**
✅ `Session Status: online`  
✅ `Forwarding: https://nonaffinitive-cablelaid-kara.ngrok-free.dev`

---

### **Step 4: Open Dashboard (Optional)**

Open your browser and visit:
```
http://localhost:4040
```

This shows:
- Active tunnel status
- Real-time HTTP requests
- Connection logs

---

### **Step 5: Keep Terminal Open**

⚠️ **IMPORTANT:** 
- **DO NOT CLOSE** the PowerShell window
- **DO NOT PRESS Ctrl+C** (this stops ngrok)
- Minimize the window if needed
- Ngrok must stay running for ESP32 to connect

---

## ⚠️ Common Issues & Solutions

### **Problem: "authentication failed"**
**Solution:**
```powershell
ngrok config add-authtoken 33KBBd0M0wsUOeiJwPEy4NRjOTN_2gV2Dy7FhsuxxaxJyKFVg
```

### **Problem: "Your account is limited to 1 simultaneous session"**
**Solution:** Ngrok is already running! Check for:
- Other PowerShell windows with ngrok
- Run: `Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}`
- Kill existing ngrok: `taskkill /F /IM ngrok.exe`

### **Problem: Port 8080 is not available**
**Solution:** Make sure backend server is running:
```powershell
cd c:\Users\darma\Documents\GPS\backend
node server.js
```

---

## 🔄 How to Stop Ngrok

When you want to stop ngrok:
1. Go to the PowerShell window running ngrok
2. Press **Ctrl + C**
3. The tunnel will close

---

## 🔁 How to Restart Ngrok

If you closed ngrok and need to start again:
1. Open PowerShell
2. Run:
   ```powershell
   cd c:\Users\darma\Documents\GPS
   ngrok http --url=nonaffinitive-cablelaid-kara.ngrok-free.dev 8080
   ```

**Your URL stays the same!** ✅

---

## 📝 Daily Workflow

Every time you want to use the GPS tracker remotely:

1. **Start Backend:**
   ```powershell
   cd c:\Users\darma\Documents\GPS\backend
   node server.js
   ```

2. **Start Frontend:**
   ```powershell
   cd c:\Users\darma\Documents\GPS\frontend
   npm start
   ```

3. **Start Ngrok:**
   ```powershell
   cd c:\Users\darma\Documents\GPS
   ngrok http --url=nonaffinitive-cablelaid-kara.ngrok-free.dev 8080
   ```

4. **Power on ESP32** (with updated code)

---

## 🎯 Your Ngrok Details

**Your Static URL:**
```
https://nonaffinitive-cablelaid-kara.ngrok-free.dev
```

**Your Command:**
```powershell
ngrok http --url=nonaffinitive-cablelaid-kara.ngrok-free.dev 8080
```

**Dashboard:**
```
http://localhost:4040
```

---

## ✅ Quick Check

To verify ngrok is running, use ANY of these methods:

**Method 1: Check browser**
- Visit: http://localhost:4040
- Should see ngrok dashboard

**Method 2: Check process**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}
```
- Should see "ngrok" in output

**Method 3: Test URL**
- Visit: https://nonaffinitive-cablelaid-kara.ngrok-free.dev
- Should get some response (even error is OK)

---

## 🚀 Next Steps After Ngrok is Running

1. ✅ Ngrok is running
2. 🔧 Update ESP32 code (line 19):
   ```cpp
   const char* ngrokDomain = "nonaffinitive-cablelaid-kara.ngrok-free.dev";
   ```
3. 📤 Upload to ESP32
4. 🎉 ESP32 can now send data from anywhere!

---

## 💡 Pro Tips

- **Bookmark** http://localhost:4040 for easy access
- **Keep 3 terminals open**: Backend, Frontend, Ngrok
- **Use Windows Terminal** - can have multiple tabs
- **Don't close PowerShell** windows while system is running

---

**Need help?** Check if all 3 services are running:
1. Backend on port 8080
2. Frontend on port 3000  
3. Ngrok tunnel active

Good luck! 🎉
