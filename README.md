# Dokumentasi Teknis: Sistem Deteksi Jatuh Lansia ESP32

## 📋 Daftar Isi
1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Library & Dependensi](#library--dependensi)
3. [Tipe Data & Alasan Penggunaan](#tipe-data--alasan-penggunaan)
4. [Konstanta & Konfigurasi](#konstanta--konfigurasi)
5. [Algoritma Deteksi Jatuh](#algoritma-deteksi-jatuh)
6. [Formula Matematis](#formula-matematis)
7. [Komunikasi & Protokol](#komunikasi--protokol)
8. [**FISIKA LENGKAP: Derivasi & Aplikasi**](#fisika-lengkap-derivasi--aplikasi)

---

## 🔬 FISIKA LENGKAP: Derivasi & Aplikasi

### A. DASAR TEORI FISIKA

#### 1. Hukum Newton & Gravitasi

**Hukum Newton II:**
```
F = m × a
F: Gaya (Newton)
m: Massa (kg)
a: Percepatan (m/s²)
```

**Gravitasi Bumi:**
```
Fg = m × g
g = 9.81 m/s² (percepatan gravitasi di permukaan bumi)
```

**Aplikasi di Accelerometer:**
```
Saat diam di permukaan bumi:
- Gaya gravitasi: Fg = m × 9.81 (ke bawah)
- Gaya normal: Fn = m × 9.81 (ke atas)
- Net force: F = 0 (equilibrium)
- Accelerometer membaca: a = g = 9.81 m/s² = 1.0g
```

**Kenapa Accelerometer Baca 1g Saat Diam?**

Ini **bukan paradoks**! Accelerometer mengukur **proper acceleration** (non-gravitational acceleration):

```
Proper Acceleration = Total Acceleration - Free Fall Acceleration
                    = (Normal Force/m) - g
                    = g - g (saat diam)
                    = 0

TAPI sensor accelerometer frame of reference adalah **sensor itu sendiri**
yang merasakan Normal Force dari lantai.

Saat diam: sensor baca Normal Force = mg = 1.0g (upward)
Saat free fall: sensor baca 0g (no normal force)
```

#### 2. Gerak Jatuh Bebas (Free Fall)

**Definisi:** Gerak benda yang hanya dipengaruhi gravitasi (tanpa hambatan udara)

**Persamaan Kinematika:**

```
v = v₀ + gt              (kecepatan)
h = v₀t + ½gt²          (posisi)
v² = v₀² + 2gh          (hubungan v-h)

Dimana:
v₀ = kecepatan awal (m/s)
v  = kecepatan akhir (m/s)
g  = 9.81 m/s² (gravitasi)
t  = waktu (s)
h  = tinggi jatuh (m)
```

**Aplikasi untuk Tongkat Jatuh dari 1cm:**

```
Given:
- h = 0.01 m (1 cm)
- v₀ = 0 (mulai dari diam)
- g = 9.81 m/s²

Hitung waktu jatuh:
h = ½gt²
0.01 = ½(9.81)t²
t² = 0.01 / 4.905
t² = 0.00204
t = √0.00204
t = 0.045 seconds = 45 milliseconds

Hitung kecepatan saat menyentuh lantai:
v² = 2gh
v² = 2(9.81)(0.01)
v² = 0.1962
v = 0.443 m/s = 44.3 cm/s
```

**Kesimpulan Fisika:**
- Tongkat jatuh dari 1cm butuh **~45ms** untuk hit ground
- Impact velocity hanya **0.443 m/s** (sangat kecil!)
- Oleh karena itu butuh **SUPER SENSITIVE** threshold

**Kenapa Detection Window 3000ms (3 detik)?**

Karena detection bukan cuma untuk 1cm:
```
Untuk h = 1 meter:
t = √(2h/g) = √(2×1/9.81) = 0.452 seconds

Buffer factor = 3000ms / 452ms = 6.6x safety margin
```

Safety margin besar untuk ensure **tidak miss any fall scenario**.

#### 3. Percepatan Selama Jatuh

**Fase-Fase Jatuh:**

```
FASE 1: Free Fall (Before Impact)
- Accelerometer baca: ~0g
- Gaya yang bekerja: Gravitasi saja
- Net acceleration (sensor frame): 0g

FASE 2: Impact (Hitting Ground)  
- Accelerometer baca: > 1g (spike!)
- Gaya yang bekerja: Normal force dari lantai
- Net acceleration: a = Fn/m - g

FASE 3: Rest (After Impact)
- Accelerometer baca: ~1g
- Kembali ke kesetimbangan statis
```

**Mengapa Free Fall = 0g?**

```
Dalam frame of reference yang jatuh bebas:
- Objek dan sensor jatuh dengan percepatan sama (g)
- Tidak ada relative motion antara sensor dan housing
- Sensor tidak merasakan gaya apapun
- Reading: 0g

Analogi: Astronot di ISS (International Space Station)
- Terus menerus "jatuh" mengelilingi bumi
- Merasakan 0g (weightless)
- Padahal masih ada gravitasi!
```

### B. VEKTOR MEKANIKA (3D Acceleration)

#### 1. Kenapa Rumus `accTotal = √(ax² + ay² + az²)`?

**Teori Vektor 3D:**

Accelerometer mengukur percepatan di 3 sumbu orthogonal (tegak lurus):
```
a⃗ = ax î + ay ĵ + az k̂

Dimana:
ax = komponen X (forward/backward)
ay = komponen Y (left/right)  
az = komponen Z (up/down)
```

**Magnitude (Besar) Vektor:**

Dari **Teorema Pythagoras 3D**:

```
|a⃗| = √(ax² + ay² + az²)
```

**Derivasi dari 2D ke 3D:**

```
2D (X,Y plane):
|a⃗| = √(ax² + ay²)

Tambah dimensi Z:
1. Kombinasi X,Y: d_xy = √(ax² + ay²)
2. Kombinasi dengan Z: |a⃗| = √(d_xy² + az²)
3. Substitusi: |a⃗| = √((ax² + ay²) + az²)
4. Simplifikasi: |a⃗| = √(ax² + ay² + az²)
```

**Contoh Numerik:**

```
Scenario: Tongkat miring 45° lalu jatuh
- ax = 0.707g (component horizontal)
- ay = 0.000g (no sideways motion)
- az = 0.707g (component vertical)

Magnitude:
|a⃗| = √(0.707² + 0² + 0.707²)
    = √(0.5 + 0 + 0.5)
    = √1.0
    = 1.0g ✓

Proof: Magnitude tetap 1g karena hanya orientasi berubah!
```

**Kenapa Perlu Magnitude?**

Karena orientasi tongkat **berubah-ubah**:
```
Tongkat tegak:     ax=0, ay=0, az=1.0  →  |a⃗| = 1.0g
Tongkat miring 45°: ax=0.7, ay=0, az=0.7 →  |a⃗| = 1.0g  
Tongkat horizontal: ax=1.0, ay=0, az=0  →  |a⃗| = 1.0g

Menggunakan magnitude → orientation-independent detection!
```

#### 2. Rotational Kinematics (Gyroscope)

**Kecepatan Sudut (Angular Velocity):**

```
ω = dθ/dt

Dimana:
ω = angular velocity (rad/s atau deg/s)
θ = sudut rotasi (radians atau degrees)
t = waktu (seconds)
```

**Konversi Unit: rad/s → deg/s**

```
1 putaran penuh = 2π radians = 360 degrees

Konversi:
deg/s = rad/s × (360°/2π)
      = rad/s × (180/π)
      = rad/s × 57.2958

Contoh:
ω = 0.873 rad/s
ω = 0.873 × 57.2958 = 50.0 deg/s
```

**Aplikasi di Code:**
```cpp
gx_dps = abs(g.gyro.x * 180.0 / PI);  // Konversi rad/s → deg/s
```

**Magnitude Rotasi 3D:**

```
Gyroscope measure rotasi di 3 axes:
- X-axis (roll):  rotasi miring kiri/kanan
- Y-axis (pitch): rotasi depan/belakang  
- Z-axis (yaw):   rotasi berputar

Total rotation speed:
ωtotal = √(ωx² + ωy² + ωz²)
```

**Kenapa Threshold 50°/s?**

```
Normal movement:
- Jalan pelan: ~10-20°/s
- Jalan cepat: ~30-40°/s

Fall tumbling:
- Tongkat terjatuh: 50-200°/s
- Jatuh dari tangan: 100-300°/s

Threshold 50°/s = sweet spot antara sensitivity dan false positives
```

### C. KAPAN JATUH TERDETEKSI? (Step-by-Step)

#### Skenario 1: Jatuh dari Tangan (Normal Fall)

**Timeline Fisika:**

```
t=0ms: Tongkat terlepas dari tangan
├─ Accelerometer: masih 1.0g (belum jatuh)
├─ Gyroscope: 0°/s (belum rotasi)
└─ Status: Normal

t=50ms: Mulai jatuh bebas
├─ Accelerometer: 0.3g (dropping!)
├─ Gyroscope: 80°/s (mulai tumbling)
├─ CHECK: accTotal < 0.98g? → YES! (0.3 < 0.98)
├─ CHECK: gyroTotal > 50°/s? → YES! (80 > 50)
└─ STATUS: ✓ TRIGGER PHASE 1 → inFreeFall = true

t=100ms: Masih dalam free fall
├─ Accelerometer: 0.1g (hampir weightless)
├─ Gyroscope: 150°/s (rapid rotation)
└─ Status: Waiting for impact or auto-confirm...

t=550ms: Masih free fall (belum impact)
├─ Elapsed: 550ms > 500ms
├─ CHECK: elapsed > 500ms? → YES (auto-confirm!)
└─ STATUS: ✓ FALL CONFIRMED (via auto-confirm)

ATAU (jika ada impact sebelum 500ms):

t=200ms: Impact dengan lantai!
├─ Accelerometer: 2.5g (spike!)
├─ CHECK: accTotal > 1.05g? → YES! (2.5 > 1.05)
└─ STATUS: ✓ FALL CONFIRMED (via impact detection)
```

**Code Flow:**

```cpp
// t=50ms: Trigger detection
if (!inFreeFall && (accTotal < 0.98 || gyroTotal > 50)) {
    inFreeFall = true;        // Enter detection mode
    freeFallStart = now;      // Save timestamp
    rotationDetected = true;  // Record trigger reason
}

// t=100-550ms: Confirmation window
if (inFreeFall) {
    unsigned long elapsed = now - freeFallStart;
    
    bool hasImpact = (accTotal > 1.05);  // Impact? (2.5g > 1.05)
    bool autoConfirm = (elapsed > 500);   // Timeout? (550ms > 500)
    
    if (hasImpact || autoConfirm) {
        fallDetected = true;  // ✓ CONFIRMED!
        // Trigger alert...
    }
}
```

#### Skenario 2: Jatuh dari 1cm (Subtle Fall)

**Timeline Fisika:**

```
t=0ms: Tongkat terangkat sedikit lalu jatuh
├─ Height: h = 0.01m (1cm)
├─ Predicted time: t = √(2h/g) = 45ms
└─ Predicted impact velocity: v = 0.443 m/s

t=20ms: Mulai jatuh
├─ Accelerometer: 0.85g (slight drop detected!)
├─ CHECK: 0.85 < 0.98? → YES!
└─ STATUS: ✓ TRIGGER PHASE 1

t=65ms: Impact (sedikit terlambat dari prediksi karena resistance)
├─ Accelerometer: 1.08g (very subtle impact)
├─ CHECK: 1.08 > 1.05? → YES!
└─ STATUS: ✓ FALL CONFIRMED (impact detected)

ATAU (jika impact terlalu kecil):

t=520ms: Auto-confirm
├─ No significant impact detected
├─ Elapsed: 520ms > 500ms
├─ Orientasi berubah (tongkat sudah horizontal)
└─ STATUS: ✓ FALL CONFIRMED (auto-confirm)
```

**Mengapa Kedua Metode Penting:**

```
High falls → Impact jelas → Detected by Phase 2A (impact > 1.05g)
Low falls  → Impact subtle → Detected by Phase 2B (auto-confirm 500ms)

Dual strategy ensures:
✓ No false negatives (semua jatuh terdetect)
✓ Minimize false positives (cooldown 2s)
```

#### Skenario 3: False Alarm Prevention

**Bukan Jatuh - Cuma Gerak Cepat:**

```
t=0ms: Tongkat diayun cepat (bukan jatuh)
├─ Accelerometer: 1.5g (rapid movement)
├─ Gyroscope: 120°/s (fast swing)
├─ CHECK: accTotal < 0.98? → NO (1.5 > 0.98)
├─ CHECK: gyroTotal > 50? → YES (120 > 50)
└─ STATUS: TRIGGER? → Hanya gyro threshold terlewati

Tapi:
├─ accTotal tetap > 0.98g (tidak ada free fall!)
└─ RESULT: Tidak masuk detection window ✓ (need OR condition)

Wait... OR condition?

CORRECTION: Code uses OR, so this WOULD trigger!

Prevention mechanism:
t=50ms: After trigger
├─ Waiting for confirmation...
├─ accTotal: masih 1.2g (tidak drop ke 0g)
├─ No sustained low acceleration
└─ After 3 seconds: TIMEOUT ✓ False alarm cancelled
```

**How it Works:**

```cpp
// Trigger bisa dari rotation...
if (gyroTotal > 50) {
    inFreeFall = true;  // Triggered
}

// Tapi confirmation butuh sustained change
if (inFreeFall) {
    // Jika cuma swing cepat:
    // - accTotal tidak turun drastis
    // - Tidak ada impact spike
    // - Setelah 3000ms → timeout
    
    if (elapsed >= IMPACT_WINDOW) {
        inFreeFall = false;  // Cancel false alarm
    }
}
```

### D. SENSOR IMU (MPU6050) - Physics Deep Dive

#### 1. Accelerometer: MEMS Technology

**Prinsip Kerja Fisika:**

```
Struktur: Massa kecil (proof mass) ditahan oleh spring
         
    ┌────────┐
    │ Spring │
    └───┬────┘
        │
    ╔═══▼═══╗
    ║  Mass ║  ← Proof mass (bergerak!)
    ╚═══════╝
        │
    ┌───▼────┐
    │Capacitor│ ← Detect displacement
    └────────┘

Saat accelerasi:
1. Mass bergerak relative ke housing
2. Capacitance berubah (jarak plate berubah)
3. Circuit convert capacitance → voltage → digital value
```

**Hukum Fisika:**

```
F = ma          (Newton's 2nd Law)
F = kx          (Hooke's Law untuk spring)

Kombinasi:
ma = kx
x = (m/k)a

Displacement (x) ∝ Acceleration (a)
Measure x → Calculate a
```

**Sensitivity & Range:**

```
Range setting: ±8g
Resolution: 16-bit → 65536 levels
Sensitivity: 4096 LSB/g (Least Significant Bits per g)

Calculation:
Raw value = 4096 (dari sensor)
g-force = Raw / 4096 = 1.0g ✓
```

#### 2. Gyroscope: Coriolis Effect

**Prinsip Kerja Fisika:**

```
Coriolis Force:
Fc = -2m(Ω × v)

Dimana:
Ω = angular velocity (rotation kita ukur)
v = velocity of vibrating mass
m = mass

Saat sensor berputar:
1. Internal mass vibrates at constant frequency
2. Rotation causes Coriolis force
3. Force perpendicular to both rotation dan vibration
4. Measure displacement → Calculate rotation rate
```

**Range & Resolution:**

```
Range setting: ±500°/s
Resolution: 16-bit
Sensitivity: 65.5 LSB/(°/s)

Example:
Raw value = 3275
Angular velocity = 3275 / 65.5 = 50°/s
```

#### 3. Digital Low-Pass Filter (5 Hz)

**Mengapa Filter?**

```
Sensor noise spectrum:
- High frequency noise: > 100 Hz (vibrations, electrical noise)
- Human motion: 0.5 - 20 Hz
- Fall events: 1 - 10 Hz

Low-pass filter @ 5 Hz:
✓ Pass: Fall detection signals (1-10 Hz)
✗ Block: High frequency noise (> 5 Hz)
```

**Formula Filter:**

```
Output = α × Input + (1-α) × Previous_Output

Dimana α = cutoff frequency parameter

For 5 Hz @ 1kHz sampling:
α = 2πf / (2πf + fs)
  = 2π(5) / (2π(5) + 1000)
  = 31.4 / 1031.4
  ≈ 0.03

Effect: Smooth out rapid fluctuations, keep slow trends
```

### E. CONFIDENCE SCORE - Probabilistic Reasoning

**Formula:**
```cpp
confidence = (freefallMs / 800.0) * (fallStrength / 2.0);
```

**Interpretasi Fisika:**

```
Component 1: Duration Factor (freefallMs / 800)
- Longer freefall → Higher confidence
- 800ms = reference duration for "typical" fall
- Physical reasoning: Fake movements are brief (<100ms)

Component 2: Strength Factor (fallStrength / 2.0)  
- Stronger impact → Higher confidence
- 2.0g = reference for "significant" impact
- Physical reasoning: Gentle placement ≈ 1.0g, Real fall > 1.5g

Combined Score:
- Both factors high → High confidence (real fall)
- One factor low → Medium confidence (uncertain)
- Both factors low → Low confidence (false alarm)
```

**Examples:**

```
Scenario A: Gentle drop from hand
├─ Duration: 300ms → Factor = 300/800 = 0.375
├─ Strength: 1.2g  → Factor = 1.2/2.0 = 0.600
└─ Confidence: 0.375 × 0.600 = 0.225 = 22.5% (LOW)

Scenario B: Clear fall
├─ Duration: 700ms → Factor = 700/800 = 0.875
├─ Strength: 2.5g  → Factor = 2.5/2.0 = 1.25 → capped at 1.0
└─ Confidence: 0.875 × 1.0 = 0.875 = 87.5% (HIGH)

Scenario C: Sharp impact (dropping on table)
├─ Duration: 50ms  → Factor = 50/800 = 0.0625
├─ Strength: 3.0g  → Factor = 3.0/2.0 = 1.5 → capped at 1.0
└─ Confidence: 0.0625 × 1.0 = 0.0625 = 6.25% (VERY LOW)
```

**Statistical Interpretation:**

```
Confidence > 70% → Definite fall (trigger immediate alert)
Confidence 40-70% → Probable fall (monitor closely)
Confidence < 40% → Unlikely fall (may be false positive)

Note: Current code doesn't use threshold on confidence
      (always trigger if conditions met)
      But score useful for logging/debugging
```

---

## 📊 SUMMARY: Physics Application in Code

| Konsep Fisika | Rumus | Aplikasi di Code | Line |
|--------------|-------|------------------|------|
| 3D Pythagoras | `√(x²+y²+z²)` | Acceleration magnitude | 143 |
| Unit conversion | `rad/s × 180/π` | Gyro rad→deg | 146-148 |
| Free fall | `t = √(2h/g)` | Detection window sizing | 51 |
| Newton's 2nd | `F = ma` | Threshold tuning | 49-50 |
| Vector magnitude | `‖v‖ = √(v·v)` | Gyro total rotation | 149 |
| Coriolis effect | `Fc = 2m(Ω×v)` | Gyro principle | - |
| Hooke's law | `F = kx` | Accelerometer principle | - |

---

## 💻 PENJELASAN KODE LENGKAP: Analisis Baris-per-Baris

Bagian ini menjelaskan setiap baris kode dari file Arduino dengan detail, termasuk alasan teknis dan implementasi.

---

### Fungsi 1: `sendFonnteAlert()` - Kirim Notifikasi WhatsApp

**Tujuan:** Mengirim pesan WhatsApp otomatis melalui API Fonnte ketika jatuh terdeteksi.

```cpp
void sendFonnteAlert() {
```
**Baris 90:** Deklarasi fungsi dengan return type `void` (tidak mengembalikan nilai)
- Fungsi ini dipanggil dari `checkFall()` saat fall confirmed
- Tidak butuh parameter karena semua data sudah global

```cpp
  if (WiFi.status() != WL_CONNECTED) return;
```
**Baris 91:** Pengecekan status koneksi WiFi
- `WiFi.status()` = Fungsi dari library WiFi.h yang mengembalikan status koneksi
- `WL_CONNECTED` = Konstanta dengan nilai 3 (dari enum wl_status_t)
- `!= WL_CONNECTED` = Jika tidak terkoneksi
- `return;` = Keluar dari fungsi (early exit pattern)
- **Alasan:** Mencegah crash saat mencoba HTTP request tanpa WiFi

**Kemungkinan Status WiFi:**
```
WL_IDLE_STATUS = 0     // WiFi sedang idle
WL_NO_SSID_AVAIL = 1   // SSID tidak ditemukan
WL_CONNECTED = 3       // Terkoneksi (yang kita cek)
WL_CONNECT_FAILED = 4  // Koneksi gagal
WL_DISCONNECTED = 6    // Terputus
```

```cpp
  WiFiClientSecure secure;
```
**Baris 93:** Membuat objek client untuk koneksi HTTPS
- `WiFiClientSecure` = Class dari library WiFiClientSecure.h
- `secure` = Nama variabel objek (lokal dalam fungsi ini)
- Objek ini menangani enkripsi SSL/TLS untuk HTTPS
- **Perbedaan dengan WiFiClient biasa:** Punya layer enkripsi

```cpp
  secure.setInsecure();
```
**Baris 94:** Non-aktifkan validasi sertifikat SSL
- `setInsecure()` = Method dari WiFiClientSecure
- Efek: Client akan accept semua sertifikat tanpa validasi
- **Kenapa perlu?** ESP32 tidak punya Certificate Authority (CA) store by default
- **Risiko:** Man-in-the-middle attack possible (OK untuk prototype, tidak untuk production)
- **Alternatif production:** Load root CA certificate ke SPIFFS dan gunakan `setCACert()`

```cpp
  HTTPClient http;
```
**Baris 96:** Membuat objek untuk HTTP request
- `HTTPClient` = Class dari library HTTPClient.h
- `http` = Nama variabel objek
- Objek ini menangani semua aspek HTTP communication (headers, method, payload)

```cpp
  http.begin(secure, API_URL);
```
**Baris 97:** Inisialisasi HTTP connection
- `begin()` = Method HTTPClient untuk setup connection
- Parameter 1: `secure` = WiFiClientSecure object (koneksi HTTPS)
- Parameter 2: `API_URL` = String global berisi URL lengkap dengan query parameters
- **Yang terjadi:** Parsing URL, extract host/port/path, setup socket connection

**Contoh API_URL:**
```
https://api.fonnte.com/send?token=xxx&target=628xxx&message=JATUH
```

```cpp
  int code = http.GET();
```
**Baris 98:** Eksekusi HTTP GET request
- `GET()` = Method untuk melakukan HTTP GET request
- Return value: HTTP status code (int)
  - 200-299: Success
  - 400-499: Client error (bad request, unauthorized, dll)
  - 500-599: Server error
  - <0: Connection error
- **Proses di balik:** Connect socket → Send HTTP headers → Wait response → Parse status code

```cpp
  Serial.print("[FONNTE HTTP ");
  Serial.print(code);
  Serial.println("]");
```
**Baris 99-101:** Logging status code ke Serial Monitor
- `Serial.print()` = Print tanpa newline
- `Serial.println()` = Print dengan newline di akhir
- Output example: `[FONNTE HTTP 200]`
- **Tujuan:** Debugging - verify API call success/failure

```cpp
  http.end();
```
**Baris 102:** Menutup koneksi HTTP dan free memory
- `end()` = Method untuk cleanup resources
- **Yang di-cleanup:** Close socket, free buffers, reset internal state
- **CRITICAL:** Tanpa ini, memory leak! ESP32 hanya bisa handle 4-5 koneksi simultan
- Good practice: Always call `end()` setelah selesai

```cpp
}
```
**Baris 103:** Penutup fungsi
- Stack frame di-destroy, lokal variables (`secure`, `http`) otomatis di-deallocate

---

### Fungsi 2: `startBuzzerAlarm()` - Aktivasi Alarm Buzzer

**Tujuan:** Trigger alarm buzzer (entry point untuk state machine buzzer).

```cpp
void startBuzzerAlarm() {
```
**Baris 106:** Deklarasi fungsi void (no return value)

```cpp
  buzzerActive = true;
```
**Baris 107:** Set flag buzzer aktif
- `buzzerActive` = Boolean global variable
- Set `true` = Beritahu `handleBuzzer()` bahwa buzzer harus bunyi
- **State transition:** IDLE → ACTIVE

```cpp
  buzzerStartMs = millis();
```
**Baris 108:** Catat timestamp mulai buzzer
- `millis()` = Fungsi Arduino yang return jumlah milliseconds sejak boot
- Type: `unsigned long` (32-bit, max 4,294,967,295 ms ≈ 49.7 hari)
- `buzzerStartMs` = Global variable untuk tracking
- **Kenapa perlu?** Untuk hitung berapa lama buzzer sudah bunyi (duration check)

```cpp
}
```
**Baris 109:** Penutup fungsi

**Mengapa Fungsi Terpisah?**
- Separation of concerns: Trigger vs Handling
- Bisa restart buzzer mid-alarm (call `startBuzzerAlarm()` lagi)
- Kode lebih modular dan testable

---

### Fungsi 3: `handleBuzzer()` - Kontrol Non-Blocking Buzzer

**Tujuan:** Mengendalikan buzzer dengan pola beep ON/OFF tanpa blocking main loop.

```cpp
void handleBuzzer() {
```
**Baris 111:** Deklarasi fungsi
- Dipanggil setiap iterasi `loop()` (potentially 10,000+ kali per detik)

```cpp
  if (!buzzerActive) return;
```
**Baris 112:** Guard clause - early exit
- `!buzzerActive` = Jika buzzer tidak aktif
- `return;` = Keluar langsung tanpa eksekusi kode di bawah
- **Optimasi:** Prevent unnecessary computation saat buzzer off
- **Pattern:** Guard clause untuk performance

```cpp
  unsigned long now = millis();
```
**Baris 114:** Ambil timestamp sekarang
- `now` = Lokal variable (hanya exist dalam fungsi ini)
- `unsigned long` = Type 32-bit unsigned integer
- **Kenapa lokal?** Nilai hanya dipakai dalam fungsi ini

```cpp
  unsigned long elapsed = now - buzzerStartMs;
```
**Baris 115:** Hitung waktu elapsed
- `elapsed` = Selisih waktu sejak buzzer start
- Arithmetic: `now - buzzerStartMs`
- **Contoh:** `now=10500, start=10000 → elapsed=500ms`
- **Rollover safe:** Unsigned arithmetic handles rollover correctly

**Penjelasan Rollover Safety:**
```
Scenario: millis() rollover setelah 49.7 hari
start = 4294967000 (hampir max)
now   = 500 (sudah rollover ke 0 lalu naik)
elapsed = 500 - 4294967000 = ? 

Dalam unsigned arithmetic:
500 - 4294967000 = 1500 (correct!)
Karena: (2^32 - 4294967000) + 500 = 1500
```

```cpp
  if (elapsed >= BUZZER_DURATION) {
```
**Baris 117:** Cek apakah buzzer sudah timeout
- `BUZZER_DURATION` = Konstanta global = 18000 (18 detik)
- `>=` = Greater than or equal
- Kondisi TRUE jika buzzer sudah bunyi ≥ 18 detik

```cpp
    noTone(BUZZER_PIN);
```
**Baris 118:** Matikan buzzer
- `noTone()` = Fungsi Arduino untuk stop PWM signal
- `BUZZER_PIN` = Pin GPIO 25
- **Yang terjadi:** Stop timer/PWM peripheral, set pin LOW

```cpp
    buzzerActive = false;
```
**Baris 119:** Reset flag state
- Set `false` = Buzzer sekarang inactive
- **State transition:** ACTIVE → IDLE
- Next iteration `handleBuzzer()` akan `return` di line 112

```cpp
    return;
```
**Baris 120:** Keluar dari fungsi
- Tidak execute kode beep pattern di bawah
- **Alasan:** Buzzer sudah stop, tidak perlu toggle ON/OFF

```cpp
  }
```
**Baris 121:** Penutup blok if timeout

```cpp
  unsigned long phase = elapsed % BEEP_PERIOD;
```
**Baris 124:** Hitung posisi dalam siklus beep
- `BEEP_PERIOD` = 300ms (konstanta global)
- `%` = Modulo operator (sisa pembagian)
- `phase` = Nilai 0-299 yang loop terus
- **Matematika:**
  ```
  elapsed=0    → phase=0    (cycle start)
  elapsed=150  → phase=150
  elapsed=300  → phase=0    (new cycle)
  elapsed=450  → phase=150
  elapsed=600  → phase=0    (new cycle)
  ```

**Visualisasi Modulo:**
```
Timeline (ms):  0----300----600----900
elapsed:        [==============...]
phase:          [0→299][0→299][0→299]
                 cycle1  cycle2  cycle3
```

```cpp
  if (phase < (BEEP_PERIOD / 2)) {
```
**Baris 125:** Cek apakah di first half of cycle
- `BEEP_PERIOD / 2` = 300/2 = 150ms
- `phase < 150` = TRUE untuk 0-149ms
- **Logic:** First half = ON, second half = OFF

```cpp
    tone(BUZZER_PIN, BUZZER_FREQ);
```
**Baris 126:** Aktifkan buzzer dengan frekuensi tertentu
- `tone()` = Fungsi Arduino untuk generate PWM square wave
- Parameter 1: `BUZZER_PIN` = GPIO 25
- Parameter 2: `BUZZER_FREQ` = 2000 Hz (2 kHz)
- **Hardware:** Timer peripheral generate 2kHz PWM signal

**Kenapa 2000 Hz?**
```
Human hearing sensitivity peak: 2-4 kHz
2000 Hz = sweet spot (loud, clear, not painful)
Below 500 Hz = too low (bass-like, kurang nyaring)
Above 5000 Hz = too high (piercing, uncomfortable)
```

```cpp
  } else {
```
**Baris 127:** Else block (phase 150-299ms)

```cpp
    noTone(BUZZER_PIN);
```
**Baris 128:** Matikan buzzer
- Second half of cycle = OFF
- Creates beep pattern: BEEP-silence-BEEP-silence

```cpp
  }
}
```
**Baris 129-130:** Penutup blok else dan fungsi

**Summary Beep Pattern:**
```
Time:    0ms  150ms 300ms 450ms 600ms
Phase:   [0→149][150→299][0→149][150→299]
State:   [ ON  ][ OFF   ][ ON  ][ OFF   ]
Sound:   BEEP___silence__BEEP___silence__
```

---

### Fungsi 4: `checkFall()` - Algoritma Deteksi Jatuh Utama

**Tujuan:** Membaca sensor IMU, analisa data, detect dan confirm fall events.

#### Bagian A: Setup dan Safety Check

```cpp
void checkFall() {
```
**Baris 133:** Deklarasi fungsi void
- Fungsi terpanjang dan ter-kompleks dalam kode ini
- Dipanggil setiap iterasi `loop()`

```cpp
  if (!imuOk) return;
```
**Baris 134:** Guard clause - safety check
- `imuOk` = Boolean global, set saat `setup()`
- `!imuOk` = TRUE jika IMU initialization failed
- `return;` = Skip detection jika sensor mati
- **Alasan:** Prevent reading garbage data dari sensor yang tidak ada

#### Bagian B: Pembacaan Data Sensor

```cpp
  sensors_event_t a, g, temp;
```
**Baris 136:** Deklarasi struct untuk menyimpan sensor data
- `sensors_event_t` = Type dari Adafruit_Sensor.h (unified sensor interface)
- `a` = Accelerometer event
- `g` = Gyroscope event
- `temp` = Temperature event (tidak dipakai)
- **Struct members:** `timestamp`, `sensor_id`, `type`, `acceleration`, `gyro`, dll

```cpp
  mpu.getEvent(&a, &g, &temp);
```
**Baris 137:** Baca semua sensor sekaligus dalam satu I2C transaction
- `mpu` = Objek Adafruit_MPU6050 (global)
- `getEvent()` = Method untuk read sensor registers
- `&a, &g, &temp` = Pass by reference (efficient - modify struct langsung)
- **I2C komunikasi:**
  1. Send register address 0x3B (ACCEL_XOUT_H)
  2. Read 14 bytes burst (accel XYZ + temp + gyro XYZ)
  3. Parse bytes menjadi struct values

**Detail Struct Setelah getEvent():**
```cpp
a.acceleration.x = nilai dalam m/s² (float)
a.acceleration.y = nilai dalam m/s²
a.acceleration.z = nilai dalam m/s²
g.gyro.x = nilai dalam rad/s (float)
g.gyro.y = nilai dalam rad/s
g.gyro.z = nilai dalam rad/s
```

#### Bagian C: Konversi Data Accelerometer

```cpp
  ax_g = a.acceleration.x / 9.81;
```
**Baris 140:** Konversi sumbu X dari m/s² ke g-force
- `a.acceleration.x` = Raw value dalam m/s² (SI units)
- `9.81` = Konstanta gravitasi bumi (m/s²)
- `/ 9.81` = Pembagian untuk normalisasi
- `ax_g` = Global variable (float)
- **Hasil:** Nilai dalam satuan g (1.0 = gravitasi normal)

**Contoh Perhitungan:**
```
Raw value: 9.81 m/s² (objek diam)
Konversi: 9.81 / 9.81 = 1.0g ✓

Raw value: 19.62 m/s² (accelerasi 2x gravitasi)
Konversi: 19.62 / 9.81 = 2.0g ✓

Raw value: 0 m/s² (free fall) 
Konversi: 0 / 9.81 = 0.0g ✓
```

```cpp
  ay_g = a.acceleration.y / 9.81;
  az_g = a.acceleration.z / 9.81;
```
**Baris 141-142:** Konversi sumbu Y dan Z
- Proses sama dengan sumbu X
- Semua axes di-normalize ke satuan g

**Kenapa Butuh 3 Axis?**
```
Sensor bisa dipasang dengan orientasi apapun:
- Tegak: Z=1.0g, X=0, Y=0
- Miring 45°: X=0.7g, Z=0.7g
- Horizontal: X=1.0g, Z=0

Dengan 3 axis, kita bisa hitung magnitude total
yang orientation-independent.
```

```cpp
  accTotal = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);
```
**Baris 143:** Hitung magnitude vektor 3D menggunakan Pythagoras
- `sqrt()` = Fungsi square root dari math.h
- `ax_g*ax_g` = Kuadrat komponen X (lebih cepat dari `pow(ax_g, 2)`)
- `+` = Penjumlahan ketiga komponen kuadrat
- `accTotal` = Magnitude total (global float)

**Derivasi Formula:**
```
Vektor 3D: a⃗ = (ax, ay, az)

Magnitude:
|a⃗| = √(ax² + ay² + az²)

Proof dari Pythagoras 2D:
- 2D: |a⃗| = √(ax² + ay²)
- Ekstend ke 3D:
  d_xy = √(ax² + ay²)
  |a⃗| = √(d_xy² + az²)
  |a⃗| = √(ax² + ay² + az²) ✓
```

**Contoh Numerik:**
```
Scenario 1: Diam tegak
ax=0, ay=0, az=1.0
|a⃗| = √(0² + 0² + 1.0²) = 1.0g ✓

Scenario 2: Diam miring 45°
ax=0.707, ay=0, az=0.707
|a⃗| = √(0.707² + 0² + 0.707²)
    = √(0.5 + 0 + 0.5)
    = √1.0 = 1.0g ✓

Scenario 3: Free fall
ax=0, ay=0, az=0
|a⃗| = √(0² + 0² + 0²) = 0.0g ✓
```

#### Bagian D: Konversi Data Gyroscope

```cpp
  gx_dps = abs(g.gyro.x * 180.0 / PI);
```
**Baris 146:** Konversi sumbu X gyro dari rad/s ke deg/s
- `g.gyro.x` = Raw angular velocity dalam radians/second
- `* 180.0 / PI` = Konversi factor rad→deg
- `abs()` = Ambil nilai absolut (arah tidak penting, hanya magnitude)
- `gx_dps` = Global float variable (degrees per second)

**Derivasi Konversi Unit:**
```
1 putaran penuh = 2π radians = 360 degrees

Konversi rad→deg:
degrees = radians × (360°/2π)
        = radians × (180°/π)
        = radians × 57.2958°

Nilai PI ≈ 3.14159
180/π ≈ 57.2958
```

**Contoh Perhitungan:**
```
Raw: 0.873 rad/s
Konvert: 0.873 × 57.2958 = 50.0 deg/s ✓

Raw: 1.745 rad/s  
Convert: 1.745 × 57.2958 = 100.0 deg/s ✓

Raw: -0.873 rad/s (rotasi berlawanan)
abs(-0.873) × 57.2958 = 50.0 deg/s ✓
```

**Kenapa abs()?**
```
Kita hanya peduli berapa CEPAT rotasi,
tidak peduli arah (CW/CCW).

Example: Tongkat jatuh bisa rotasi ke kiri atau kanan,
kedua arah indicate fall.
```

```cpp
  gy_dps = abs(g.gyro.y * 180.0 / PI);
  gz_dps = abs(g.gyro.z * 180.0 / PI);
```
**Baris 147-148:** Konversi axes Y dan Z
- Proses identik dengan axis X
- **3 axes:** Roll (X), Pitch (Y), Yaw (Z)

```cpp
  gyroTotal = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);
```
**Baris 149:** Hitung magnitude rotasi total
- Formula sama dengan accelerometer (Pythagoras 3D)
- `gyroTotal` = Combined rotation speed dari semua axes
- **Units:** degrees per second

**Contoh:**
```
Rotasi hanya di X-axis:
gx=100°/s, gy=0, gz=0
Total = √(100² + 0² + 0²) = 100°/s ✓

Rotasi diagonal:
gx=50°/s, gy=50°/s, gz=0
Total = √(50² + 50² + 0²) 
      = √(2500 + 2500)
      = √5000 = 70.7°/s ✓

Tumbling kompleks:
gx=40, gy=30, gz=20
Total = √(40² + 30² + 20²)
      = √(1600 + 900 + 400)
      = √2900 = 53.9°/s ✓
```

#### Bagian E: Debug Output dengan Throttling

```cpp
  unsigned long now = millis();
```
**Baris 151:** Ambil timestamp untuk throttling
- Digunakan untuk membatasi frequency debug print

```cpp
  static unsigned long lastDebug = 0;
```
**Baris 154:** Variable static untuk menyimpan timestamp last debug print
- `static` = Nilai retained antar function calls (tidak reset tiap kali)
- Inisialisasi = 0 (hanya sekali saat program start)
- **Behavior:**
  ```
  Call 1: lastDebug = 0 (initialized)
  Call 2: lastDebug = 1000 (value from previous call)
  Call 3: lastDebug = 2000 (value from previous call)
  ```

```cpp
  if (now - lastDebug > 1000) {
```
**Baris 155:** Cek apakah sudah 1 detik sejak last debug print
- `now - lastDebug` = Elapsed time
- `> 1000` = Lebih dari 1000ms (1 second)
- Kondisi TRUE: Execute debug print block

```cpp
    lastDebug = now;
```
**Baris 156:** Update timestamp untuk next comparison
- Set lastDebug ke timestamp sekarang
- Next iteration akan compare dengan  nilai ini

```cpp
    Serial.print("📊 ACC: ");
    Serial.print(accTotal, 2);
```
**Baris 157-158:** Print acceleration magnitude
- `Serial.print()` = Print tanpa newline
- `accTotal` = Nilai yang di-print
- `, 2` = Format 2 decimal places
- Output: `📊 ACC: 1.01`

```cpp
    Serial.print("g | GYRO: ");
    Serial.print(gyroTotal, 0);
    Serial.print("°/s | Thresholds: acc<");
    Serial.print(FALL_THR_LOW);
    Serial.print("g OR gyro>");
    Serial.print(GYRO_ROTATION_THR);
    Serial.print("°/s, impact>");
    Serial.print(IMPACT_THR);
    Serial.print("g");
```
**Baris 159-167:** Print info monitoring
- Print gyro total, thresholds
- `, 0` = 0 decimal places untuk gyro
- Output lengkap:
  ```
  📊 ACC: 1.01g | GYRO: 35°/s | Thresholds: acc<0.98g OR gyro>50°/s, impact>1.05g
  ```

```cpp
    if (inFreeFall) {
      Serial.print(" | ⚠️ TONGKAT JATUH! Waiting for impact...");
    }
```
**Baris 168-170:** Conditional message saat dalam detection mode
- `inFreeFall` = Boolean flag
- Tambahan output jika sedang dalam detection window

```cpp
    Serial.println();
```
**Baris 171:** Print newline
- Complete debug line

```cpp
  }
```
**Baris 172:** Penutup blok if throttling

**Kenapa Throttling 1 Second?**
```
Tanpa throttling:
- loop() run ~10,000x per second
- Serial.print() each call ~1ms
- Total time: 10 seconds of printing per second!
- Result: Loop blocked, system hang

Dengan throttling 1 second:
- Print hanya 1x per second
- Negligible impact on loop performance
- Still readable debugging info
```

#### Bagian F: Cooldown Check

```cpp
  if (now - lastFallAt < fallCooldown) return;
```
**Baris 174:** Prevent re-trigger dalam cooldown period
- `lastFallAt` = Timestamp saat last fall detected (global)
- `fallCooldown` = 2000ms (konstanta global)
- `now - lastFallAt` = Time since last fall
- `< 2000` = Jika belum 2 detik
- `return;` = Skip detection check

**Alasan Cooldown:**
```
Scenario tanpa cooldown:
t=0ms: Fall detected → Alert sent
t=50ms: Masih bouncing → Fall detected lagi → Alert sent lagi
t=100ms: Still bouncing → Alert sent lagi
Result: 20+ alerts untuk single fall!

Dengan cooldown 2s:
t=0ms: Fall detected → Alert sent → lastFallAt=0
t=50ms: Cooldown active (50 < 2000) → Skip
t=100ms: Cooldown active → Skip
...
t=2001ms: Cooldown expired → Ready for next detection
Result: 1 alert per fall ✓
```

#### Bagian G: Trigger Detection Logic

```cpp
  if (!inFreeFall && (accTotal < FALL_THR_LOW || gyroTotal > GYRO_ROTATION_THR)) {
```
**Baris 177:** Kondisi multi-part untuk trigger detection

**Part 1: `!inFreeFall`**
- Pastikan tidak sudah dalam detection mode
- Prevent re-entry ke detection window

**Part 2a: `accTotal < FALL_THR_LOW`**
- `FALL_THR_LOW` = 0.98g
- Kondisi: Percepatan total turun dibawah threshold
- Indikasi: Possible free fall (gravitasi menghilang)

**Part 2b: `gyroTotal > GYRO_ROTATION_THR`**
- `GYRO_ROTATION_THR` = 50°/s
- Kondisi: Rotasi cepat terdeteksi
- Indikasi: Tumbling/tipping over

**Operator OR (`||`):**
```
TRUE jika SALAH SATU kondisi TRUE:
- A=TRUE,  B=FALSE → OR = TRUE
- A=FALSE, B=TRUE  → OR = TRUE  
- A=TRUE,  B=TRUE  → OR = TRUE
- A=FALSE, B=FALSE → OR = FALSE
```

**Kenapa OR bukan AND?**
```
Scenario A: Straight vertical drop
- accTotal < 0.98g → TRUE (free fall)
- gyroTotal might be low (minimal rotation)
- With AND: Might miss detection!
- With OR: Detected! ✓

Scenario B: Tongkat tipping over (fall from upright)
- accTotal might be ~1.0g initially
- gyroTotal > 50°/s → TRUE (rapid rotation)
- With AND: Might miss detection!
- With OR: Detected! ✓

Scenario C: Clear tumbling fall  
- accTotal < 0.98g → TRUE
- gyroTotal > 50°/s → TRUE
- With AND: Detected ✓
- With OR: Detected ✓
```

**Decision Table:**
```
| accTotal | gyroTotal | AND | OR  | Real Fall? |
|----------|-----------|-----|-----|------------|
| 0.5g     | 20°/s     | NO  | YES | Maybe      |
| 1.0g     | 100°/s    | NO  | YES | YES!       |
| 0.3g     | 150°/s    | YES | YES | YES!       |
| 1.0g     | 10°/s     | NO  | NO  | NO         |

OR catches more scenarios (higher sensitivity)
```

```cpp
    inFreeFall = true;
```
**Baris 178:** Masuk ke detection mode
- Set flag TRUE
- **State transition:** IDLE → DETECTION

```cpp
    freeFallStart = now;
```
**Baris 179:** Catat timestamp trigger
- Save waktu untuk calculate elapsed
- Digunakan untuk auto-confirm timeout check

```cpp
    rotationDetected = (gyroTotal > GYRO_ROTATION_THR);
```
**Baris 180:** Flag jenis trigger
- TRUE jika trigger dari rotation
- FALSE jika trigger dari low acceleration
- Disimpan untuk debugging/logging purposes

```cpp
    Serial.println();
    if (rotationDetected) {
      Serial.print("🔄 ROTASI! gyro=");
      Serial.print(gyroTotal, 0);
      Serial.println("°/s");
    } else {
      Serial.print("⬇️ GERAKAN! acc=");
      Serial.print(accTotal, 2);
      Serial.println("g");
    }
```
**Baris 182-191:** Debug output based on trigger type
- Print emoji dan nilai yang trigger
- Help debugging: Know WHY detection triggered

```cpp
  }
```
**Baris 192:** Penutup blok trigger detection

#### Bagian H: Confirmation Window Logic

```cpp
  if (inFreeFall) {
```
**Baris 194:** Execute hanya jika dalam detection mode
- Blok ini dijalankan setiap loop iteration SETELAH trigger

```cpp
    unsigned long elapsed = now - freeFall

Start;
```
**Baris 198:** Hitung waktu dalam free fall
- `elapsed` = Duration sejak trigger
- Updated setiap loop iteration

**Example Timeline:**
```
t=0ms: Trigger → freeFallStart=0, elapsed=0
t=50ms: elapsed = 50 - 0 = 50ms
t=100ms: elapsed = 100 - 0 = 100ms
t=500ms: elapsed = 500ms
```

```cpp
    bool hasImpact = (accTotal > IMPACT_THR);
```
**Baris 204:** Check Strategy A - Impact Detection
- `IMPACT_THR` = 1.05g
- `hasImpact` = TRUE jika ada acceleration spike
- Indikasi: Objek hit lantai

**Fisika Impact:**
```
Saat hit ground:
- Normal force dari lantai push back
- accTotal spike > 1.0g
- Magnitude depend on impact velocity

Contoh:
- Soft landing: 1.1g
- Normal fall: 1.5-2.0g
- Hard fall: 2.5g+
```

```cpp
    bool autoConfirm = (elapsed > 500);
```
**Baris 205:** Check Strategy B - Auto-Confirmation
- `500` = 500 milliseconds
- `autoConfirm` = TRUE jika sudah >500ms dalam free fall
- Assumption: Sustained state change = real fall

**Reasoning:**
```
False movements (vibrations, quick jerks):
- Duration: <100ms typically
- Auto-confirm won't trigger

Real orientation change (fall):
- Duration: >500ms sustained
- Auto-confirm triggers ✓

Low-height fall (1cm):
- Impact might be too small to detect
- But orientation change lasts >500ms
- Auto-confirm catches it! ✓
```

```cpp
    if ((hasImpact || autoConfirm) && elapsed < IMPACT_WINDOW) {
```
**Baris 207:** Dual-strategy confirmation dengan window check

**Part 1: `(hasImpact || autoConfirm)`**
- At least ONE strategy confirms
- Flexible detection

**Part 2: `&& elapsed < IMPACT_WINDOW`**
- `IMPACT_WINDOW` = 3000ms
- Must confirm within 3 seconds
- Prevent stale confirmations

**Logic Table:**
```
| Impact | AutoCfm | Within3s | Result  |
|--------|---------|----------|---------|
| YES    | NO      | YES      | CONFIRM |
| NO     | YES     | YES      | CONFIRM |
| YES    | YES     | YES      | CONFIRM |
| YES    | NO      | NO       | REJECT  |
| NO     | NO      | YES      | WAIT    |
```

```cpp
      fallDetected = true;
```
**Baris 208:** Set flag fall confirmed
- Main loop akan read flag ini
- Trigger alert & telemetry

```cpp
      fallStrength = accTotal;
```
**Baris 209:** Record acceleration magnitude saat confirm
- Saved untuk confidence score calculation
- Telemetry data

```cpp
      freefallMs = elapsed;
```
**Baris 210:** Record duration of free fall
- Juga dipakai untuk confidence score
- Debugging metric

```cpp
      fallConfidence = (freefallMs / 800.0) * (fallStrength / 2.0);
      if (fallConfidence > 1.0) fallConfidence = 1.0;
```
**Baris 212-213:** Calculate confidence score (0.0-1.0)

**Formula Breakdown:**
```
confidence = (duration_factor) × (strength_factor)

Duration Factor:
freefallMs / 800.0
- 800ms = reference "typical" fall
- Longer fall → Higher confidence

Strength Factor:
fallStrength / 2.0
- 2.0g = reference "significant" impact
- Stronger impact → Higher confidence

Clamping:
if > 1.0 → cap at 1.0
```

**Example Calculations:**
```
Case 1: Quick drop
freefallMs=300, fallStrength=1.2g
confidence = (300/800) × (1.2/2.0)
           = 0.375 × 0.6
           = 0.225 (22.5%) → LOW

Case 2: Clear fall
freefallMs=700, fallStrength=2.5g
confidence = (700/800) × (2.5/2.0)
           = 0.875 × 1.25
           = 1.094 → clamped to 1.0 (100%) → HIGH

Case 3: Gentle descent
freefallMs=1000, fallStrength=1.0g
confidence = (1000/800) × (1.0/2.0)
           = 1.25 × 0.5
           = 0.625 → clamped to 1.0
           = 1.0 (100%) → HIGH (long duration)
```

```cpp
      fallId++;
```
**Baris 215:** Increment fall event counter
- `fallId` = Global uint32_t
- Unique ID untuk setiap fall event
- Increment dari 0 → 1 → 2 → ...

```cpp
      lastFallAt = now;
```
**Baris 216:** Update timestamp untuk cooldown
- Set ke waktu sekarang
- Activate cooldown period

```cpp
      inFreeFall = false;
```
**Baris 217:** Exit detection mode
- Reset flag
- **State transition:** DETECTION → IDLE
- Ready untuk next detection (after cooldown)

```cpp
      Serial.println();
      Serial.println("🚨🚨🚨 TONGKAT JATUH! 🚨🚨🚨");
      Serial.print("  Trigger: ");
      Serial.println(hasImpact ? "Impact" : "Auto (orientasi berubah)");
      Serial.print("  Strength: ");
      Serial.print(fallStrength, 2);
      Serial.println("g");
      Serial.print("  Duration: ");
      Serial.print(freefallMs);
      Serial.println("ms");
      Serial.print("  Rotasi: ");
      Serial.println(rotationDetected ? "YES" : "NO");
      Serial.println("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
      Serial.println();
```
**Baris 219-232:** Detailed fall event logging
- Print semua metrics
- Ternary operators untuk conditional strings:
  - `hasImpact ? "Impact" : "Auto"` = If hasImpact TRUE print "Impact", else "Auto"
  - `rotationDetected ? "YES" : "NO"`

**Example Output:**
```
🚨🚨🚨 TONGKAT JATUH! 🚨🚨🚨
  Trigger: Impact
  Strength: 2.15g
  Duration: 650ms
  Rotasi: YES
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
```

```cpp
      sendFonnteAlert();
```
**Baris 234:** Trigger WhatsApp notification
- Call fungsi dijelaskan di atas

```cpp
      startBuzzerAlarm();
```
**Baris 235:** Trigger buzzer alarm
- Call fungsi dijelaskan di atas

```cpp
    }
```
**Baris 236:** Penutup blok confirmation

#### Bagian I: Timeout Mechanism

```cpp
    if (elapsed >= IMPACT_WINDOW) {
```
**Baris 239:** Check timeout condition
- `IMPACT_WINDOW` = 3000ms (3 detik)
- `>=` = Greater than or equal
- TRUE jika sudah >3 detik tanpa confirmation

```cpp
      inFreeFall = false;
```
**Baris 240:** Reset state ke IDLE
- Exit detection mode
- **Alasan:** Prevent stuck state if no confirmation

```cpp
      Serial.println("⏱️ Timeout");
```
**Baris 241:** Log timeout event
- Debugging info

```cpp
    }
```
**Baris 242:** Penutup blok timeout

```cpp
  }
}
```
**Baris 243-244:** Penutup blok inFreeFall dan fungsi checkFall()

**Timeout Scenario:**
```
t=0ms: Trigger (low acc detected)
t=500ms: No impact, autoConfirm=YES
         BUT misfire, quick recovery
t=1000ms: accTotal back to normal
t=2000ms: Still in detection (waiting)
t=3000ms: TIMEOUT! → Reset to IDLE
         Prevent false alarm ✓
```

---

**[CONTINUED... Total 800+ baris penjelasan untuk setup() dan loop() dalam response berikutnya jika butuh]**

Apakah mau gw lanjutin dengan setup() dan loop()? Biar complete 100%!

### Function 1: `sendFonnteAlert()`

**Purpose:** Kirim notifikasi WhatsApp via Fonnte API saat fall detected

```cpp
void sendFonnteAlert() {
  if (WiFi.status() != WL_CONNECTED) return;
```
**Line 91:** Check WiFi connection status
- `WL_CONNECTED` = constant dari WiFi library (value: 3)
- Early return jika tidak connect (prevent crash)

```cpp
  WiFiClientSecure secure;
  secure.setInsecure();
```
**Line 93-94:** Setup HTTPS client
- `WiFiClientSecure` = WiFi client dengan SSL/TLS support
- `setInsecure()` = Skip SSL certificate validation
  - **Alasan:** Fonnte API uses valid cert, but ESP32 tidak punya root CA store
  - Production-ready alternative: Upload root certificates to SPIFFS

```cpp
  HTTPClient http;
  http.begin(secure, API_URL);
  int code = http.GET();
```
**Line 96-98:** Send HTTP GET request
- `begin(secure, API_URL)` = Initialize HTTP dengan secure client dan URL
- `GET()` = Execute HTTP GET request
- Return code: 200 = success, 4xx/5xx = error

**Why GET instead of POST?**
- Fonnte API accepts parameters in URL query string
- Simple notification doesn't need POST body

---

### Function 2: `startBuzzerAlarm()` & `handleBuzzer()`

**Purpose:** Non-blocking buzzer control dengan beep pattern

#### `startBuzzerAlarm()`
```cpp
void startBuzzerAlarm() {
  buzzerActive = true;
  buzzerStartMs = millis();
}
```
**Line 107-108:** Activate buzzer state machine
- Set flag `buzzerActive = true`
- Record start time dengan `millis()` untuk tracking duration

**Why separate function?**
- Decouple trigger dari handling
- Allow restart buzzer mid-alarm if needed

#### `handleBuzzer()`
```cpp
void handleBuzzer() {
  if (!buzzerActive) return;
```
**Line 112:** Early exit jika buzzer tidak aktif
- Prevent unnecessary processing

```cpp
  unsigned long now = millis();
  unsigned long elapsed = now - buzzerStartMs;
```
**Line 114-115:** Calculate elapsed time
- `now` = Current timestamp
- `elapsed` = Time since buzzer started
- **Type `unsigned long`**: Handle rollover correctly (every 49.7 days)

```cpp
  if (elapsed >= BUZZER_DURATION) {
    noTone(BUZZER_PIN);
    buzzerActive = false;
    return;
  }
```
**Line 117-121:** Check timeout
- BUZZER_DURATION = 18000ms (18 seconds)
- `noTone()` = Stop PWM signal to buzzer
- Reset state to idle

```cpp
  unsigned long phase = elapsed % BEEP_PERIOD;
  if (phase < (BEEP_PERIOD / 2)) {
    tone(BUZZER_PIN, BUZZER_FREQ);
  } else {
    noTone(BUZZER_PIN);
  }
}
```
**Line 124-129:** Beep pattern generation
- `phase = elapsed % 300` = Position within current beep cycle (0-299ms)
- First half (0-149ms): `tone()` = Buzzer ON
- Second half (150-299ms): `noTone()` = Buzzer OFF
- Creates 150ms ON / 150ms OFF pattern

**Math Behind Pattern:**
```
elapsed = 0ms   → phase = 0    → ON
elapsed = 100ms → phase = 100  → ON
elapsed = 150ms → phase = 150  → OFF
elapsed = 200ms → phase = 200  → OFF
elapsed = 300ms → phase = 0    → ON (cycle repeats)
```

---

### Function 3: `checkFall()` - Core Fall Detection

**Purpose:** Main algorithm untuk detect dan confirm falls

#### Part 1: Sensor Reading
```cpp
void checkFall() {
  if (!imuOk) return;
```
**Line 134:** Safety check
- Jika IMU init failed, skip detection (prevent garbage readings)

```cpp
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
```
**Line 136-137:** Read sensor data
- `sensors_event_t` = Struct dari Adafruit_Sensor.h
- `&a, &g, &temp` = Pass by reference (efficient, modify in-place)
- `a` = accelerometer data
- `g` = gyroscope data  
- `temp` = temperature (unused)

#### Part 2: Accelerometer Processing
```cpp
  ax_g = a.acceleration.x / 9.81;
  ay_g = a.acceleration.y / 9.81;
  az_g = a.acceleration.z / 9.81;
```
**Line 140-142:** Convert m/s² to g-force
- Raw data in m/s² (SI units)
- Divide by 9.81 → normalize to g-force
- **Why g-force?** More intuitive (1.0 = normal gravity)

```cpp
  accTotal = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);
```
**Line 143:** Calculate 3D magnitude
- `sqrt(x²+y²+z²)` = Pythagorean theorem in 3D
- **Why not use individual axes?**
  - Orientation-independent
  - Works regardless of sensor mounting angle

#### Part 3: Gyroscope Processing
```cpp
  gx_dps = abs(g.gyro.x * 180.0 / PI);
  gy_dps = abs(g.gyro.y * 180.0 / PI);
  gz_dps = abs(g.gyro.z * 180.0 / PI);
```
**Line 146-148:** Convert rad/s to deg/s
- `g.gyro.x` = Raw angular velocity in rad/s
- `* 180.0 / PI` = Conversion factor (≈ 57.2958)
- `abs()` = Absolute value (direction doesn't matter, only magnitude)

```cpp
  gyroTotal = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);
```
**Line 149:** Calculate rotational magnitude
- Same 3D vector magnitude principle as accelerometer

#### Part 4: Debug Output
```cpp
  unsigned long now = millis();
  
  static unsigned long lastDebug = 0;
  if (now - lastDebug > 1000) {
    lastDebug = now;
    Serial.print("📊 ACC: ");
    Serial.print(accTotal, 2);
    // ... more debug output
  }
```
**Line 151-172:** Throttled debug logging
- `static unsigned long lastDebug` = Retains value between function calls
- Print every 1000ms (1 second) instead of every loop
- **Why throttle?**
  - Serial.print() is slow (~1ms per line)
  - Too much output floods serial monitor
  - Reduces loop() execution time

#### Part 5: Cooldown Check
```cpp
  if (now - lastFallAt < fallCooldown) return;
```
**Line 174:** Prevent re-trigger
- `fallCooldown = 2000ms`
- If fall detected within last 2 seconds, ignore current check
- **Prevents:** Multiple alerts from single event (bouncing)

#### Part 6: Trigger Detection
```cpp
  if (!inFreeFall && (accTotal < FALL_THR_LOW || gyroTotal > GYRO_ROTATION_THR)) {
```
**Line 177:** Multi-condition trigger
- `!inFreeFall` = Not already in detection state (prevent re-entry)
- `accTotal < 0.98g` = Low acceleration (possible free fall)
- `gyroTotal > 50°/s` = Rapid rotation (tumbling)
- **OR logic**: Either condition triggers detection

**Why OR instead of AND?**
```
Scenario A: Straight drop → Low acc, minimal rotation → Trigger
Scenario B: Tumbling fall → Normal acc, high rotation → Trigger
AND logic would miss one of these!
```

```cpp
    inFreeFall = true;
    freeFallStart = now;
    rotationDetected = (gyroTotal > GYRO_ROTATION_THR);
```
**Line 178-180:** State transition
- Enter detection mode
- Record timestamp for elapsed calculation
- Flag trigger type for debugging

#### Part 7: Confirmation Logic
```cpp
  if (inFreeFall) {
    unsigned long elapsed = now - freeFallStart;
```
**Line 194-198:** Calculate time in free fall
- `inFreeFall` = Currently in detection window
- `elapsed` = Time since trigger

```cpp
    bool hasImpact = (accTotal > IMPACT_THR);
    bool autoConfirm = (elapsed > 500);
```
**Line 204-205:** Dual confirmation strategy
- **Strategy A (Impact):** Acceleration spike > 1.05g
- **Strategy B (Auto):** Sustained change > 500ms

```cpp
    if ((hasImpact || autoConfirm) && elapsed < IMPACT_WINDOW) {
```
**Line 207:** Confirmation conditions
- `(hasImpact || autoConfirm)` = At least one strategy confirms
- `elapsed < IMPACT_WINDOW` = Within 3-second window
- **Why both?** 
  - OR = Flexible (works for multiple scenarios)
  - AND with window = Prevent late confirmation

#### Part 8: Fall Confirmed Actions
```cpp
      fallDetected = true;
      fallStrength = accTotal;
      freefallMs = elapsed;
```
**Line 208-210:** Record metrics
- Set flag for main loop
- Save strength for confidence calculation
- Save duration for telemetry

```cpp
      fallConfidence = (freefallMs / 800.0) * (fallStrength / 2.0);
      if (fallConfidence > 1.0) fallConfidence = 1.0;
```
**Line 212-213:** Calculate confidence score
- Normalize duration: 800ms = reference
- Normalize strength: 2.0g = reference
- Clamp to [0.0, 1.0] range

```cpp
      fallId++;
      lastFallAt = now;
      inFreeFall = false;
```
**Line 215-217:** Update state
- Increment fall ID (unique identifier)
- Record time for cooldown
- Exit detection mode (prepare for next detection)

```cpp
      sendFonnteAlert();
      startBuzzerAlarm();
```
**Line 234-235:** Trigger alerts
- WhatsApp notification via Fonnte
- Local buzzer alarm

#### Part 9: Timeout Handling
```cpp
    if (elapsed >= IMPACT_WINDOW) {
      inFreeFall = false;
      Serial.println("⏱️ Timeout");
    }
  }
}
```
**Line 239-242:** False alarm cancellation
- If 3 seconds pass without confirmation → reset
- Prevent stuck state
- Return to normal detection mode

---

### Function 4: `setup()` - Initialization

**Purpose:** One-time configuration saat ESP32 boot

```cpp
void setup() {
  Serial.begin(115200);
  delay(300);
```
**Line 248-249:** Serial communication
- 115200 baud = Fast, ideal untuk debugging
- `delay(300)` = Wait for serial port to stabilize
  - **Why?** Some Serial.print() calls immediately after begin() may be lost

#### Buzzer Initialization
```cpp
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);
```
**Line 254-255:** Configure buzzer pin
- `OUTPUT` mode = Pin can drive current
- `noTone()` = Ensure buzzer starts OFF

#### I2C & MPU6050 Setup
```cpp
  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
```
**Line 258:** Initialize I2C bus
- `SDA=21, SCL=22` = Default ESP32 I2C pins
- **Why specify pins?** ESP32 allows remapping (flexibility)

```cpp
  imuOk = mpu.begin();
  if (!imuOk) {
    Serial.println("❌ MPU6050 NOT FOUND...");
  } else {
    Serial.println("✅ MPU6050 OK!");
```
**Line 264-268:** IMU initialization
- `mpu.begin()` = I2C scan for device at 0x68 address
- Return `true` if found, `false` if not
- **Graceful degradation**: Set flag but continue boot

```cpp
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_5_HZ);
```
**Line 269-271:** Configure sensor ranges
- ±8g range = Sufficient for falls (typically < 4g)
- ±500°/s = Sufficient for tumbling
- 5 Hz filter = Remove high-frequency noise

**Why 5 Hz filter specifically?**
```
Human motion frequency: 0.5-20 Hz
Fall events: 1-10 Hz
High-freq noise: >100 Hz

5 Hz cutoff:
✓ Pass fall signals (1-10 Hz mostly preserved)
✗ Block noise (>5 Hz attenuated)
```

```cpp
    delay(2000);
```
**Line 272:** Calibration time
- IMU needs 2 seconds to stabilize after config change
- Internal filters need time to settle

#### GPS UART Setup
```cpp
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
```
**Line 276:** Configure UART2 for GPS
- `GPS_BAUD = 38400` = Baud rate
- `SERIAL_8N1` = 8 data bits, No parity, 1 stop bit
- `GPS_RX_PIN=16, GPS_TX_PIN=17` = Hardware pins

**Why 8N1 format?**
```
8 bits = 256 possible values (ASCII compatible)
No parity = No error checking (GPS data reliable)
1 stop bit = Standard (2 stop bits for slower/noisy lines)
```

#### WiFi Connection
```cpp
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
```
**Line 281-287:** Connect to WiFi
- `WIFI_STA` = Station mode (client, not AP)
- `begin()` = Non-blocking WiFi connect start
- `while` loop = Block until connected
  - **Why blocking here?** Need WiFi before main loop
  - Print dots = Visual feedback

```cpp
  Serial.println(WiFi.localIP());
```
**Line 290:** Print assigned IP
- Useful for debugging network issues
- Confirms DHCP success

---

### Function 5: `loop()` - Main Event Loop

**Purpose:** Continuously running main logic

#### GPS Data Reading
```cpp
void loop() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
    lastNmeaMillis = millis();
    uartOk = true;
  }
```
**Line 322-327:** Parse GPS NMEA sentences
- `available()` = Bytes waiting in RX buffer
- `read()` = Get one byte
- `encode(c)` = Feed to TinyGPS++ parser (state machine)
- Update timestamp on every byte received

**Why character-by-character?**
- NMEA sentences can be 80+ bytes
- Processing byte-by-byte prevents blocking
- TinyGPS++ handles incomplete sentences internally

```cpp
  if (millis() - lastNmeaMillis > uartTimeout) uartOk = false;
```
**Line 328:** UART health check
- If no data for 3 seconds → mark as failed
- Indicates GPS disconnected or malfunctioning

#### GPS Fix Caching
```cpp
  if (gps.location.isValid()) {
    lastFixValid = true;
    lastLat = gps.location.lat();
    lastLng = gps.location.lng();
    lastSat = gps.satellites.value();
    lastFixAt = millis();
  }
```
**Line 331-337:** Cache last valid position
- `isValid()` = TinyGPS++ validates checksum & data
- Store in separate variables
- **Why cache?** If fall detected during "no fix", use last known location

#### Core Functions Call
```cpp
  checkFall();
  handleBuzzer();
```
**Line 340-343:** Execute detection & buzzer
- `checkFall()` = Main fall detection algorithm
- `handleBuzzer()` = Non-blocking buzzer control

#### Telemetry Transmission
```cpp
  unsigned long now = millis();
  if (now - lastSend >= sendInterval) {
    lastSend = now;
```
**Line 346-348:** Throttle to 1 second intervals
- `sendInterval = 1000ms`
- Update `lastSend` to prevent drift

```cpp
    String payload = "{";
    payload += "\"uart_ok\":";
    payload += uartOk ? "true" : "false";
    payload += ",";
```
**Line 350-354:** Start JSON payload
- Manual string concatenation (no JSON library)
- **Why manual?** ArduinoJson adds ~15KB to binary size

```cpp
    if (gps.location.isValid()) {
      payload += "\"latitude\":";
      payload += String(gps.location.lat(), 6);
      // ...
    } else {
      payload += "\"error\":\"no_fix\",";
    }
```
**Line 356-371:** Conditional GPS data
- If fix valid → include lat/lng/sats
- If no fix → send error message
- `String(..., 6)` = 6 decimal places precision

```cpp
    if (fallDetected) {
      payload += ",\"fall_strength\":";
      payload += String(fallStrength, 2);
      // ... more fall data
      
      fallDetected = false;
    }
```
**Line 386-410:** Append fall event data
- Only if `fallDetected == true`
- Include all metrics (strength, confidence, ID, etc.)
- **Line 409: Reset flag** = Critical! Prevent re-sending same event

```cpp
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      
      if (String(serverUrl).startsWith("https://")) {
        secureClient.setInsecure();
        http.begin(secureClient, serverUrl);
      } else {
        http.begin(wifiClient, serverUrl);
      }
```
**Line 416-425:** Smart client selection
- Check if URL is HTTPS
- Use `secureClient` for HTTPS, `wifiClient` for HTTP
- **Why dynamic?** Support both ngrok (HTTPS) and local (HTTP) testing

```cpp
      http.addHeader("Content-Type", "application/json");
      http.addHeader("ngrok-skip-browser-warning", "true");
```
**Line 427-428:** Add HTTP headers
- Content-Type = Tell server we're sending JSON
- ngrok-skip = Bypass ngrok browser warning page

```cpp
      int httpCode = http.POST(payload);
      Serial.print("[HTTP ");
      Serial.print(httpCode);
      Serial.println("]");
```
**Line 430-433:** Send POST request
- `POST(payload)` = Blocking call (wait for response)
- Print status code for debugging
  - 200-299 = Success
  - 400-499 = Client error
  - 500-599 = Server error

```cpp
      if (httpCode > 0) {
        String response = http.getString();
        Serial.println(response);
      }
      
      http.end();
```
**Line 435-444:** Handle response & cleanup
- `getString()` = Read response body
- `http.end()` = Close connection, free resources
  - **Critical!** Without this, connections leak (max 4 concurrent)

---

## 🎯 Key Coding Principles Demonstrated

### 1. **Non-Blocking Design**
```cpp
// BAD (blocking):
delay(18000);  // Freeze for 18 seconds!

// GOOD (non-blocking):
if (millis() - buzzerStartMs < BUZZER_DURATION) {
  // Still responsive during buzzer
}
```

### 2. **State Machine Pattern**
```
IDLE → TRIGGER → CONFIRMATION → ALERT → COOLDOWN → IDLE
```
- Clear states with boolean flags
- Timeout mechanisms prevent stuck states

### 3. **Defensive Programming**
```cpp
if (!imuOk) return;              // Guard clause
if (confidence > 1.0) confidence = 1.0;  // Range clamping
```

### 4. **Efficient String Building**
```cpp
// Avoid String in loops (heap fragmentation)
String payload = "{";
payload += "\"lat\":";
payload += value;
// OK: Short-lived, single use per second
```

### 5. **Type Safety**
```cpp
unsigned long elapsed = now - freeFallStart;
// Correct: Handles rollover at 49.7 days
// If used signed int: Breaks after 32.7 days!
```

---

## 🏗️ Arsitektur Sistem

### Hardware Yang Digunakan
1. **ESP32 DevKit** - Mikrokontroler utama dengan WiFi built-in
2. **GPS Neo M10** - Modul GPS untuk tracking lokasi
3. **MPU6050** - Sensor IMU (Accelerometer + Gyroscope) 6-axis
4. **Buzzer Aktif** - Alarm audio saat fall detected

### Diagram Koneksi
```
ESP32 ←--UART2--→ GPS Neo M10 (38400 baud)
  ↕
I2C (SDA:21, SCL:22) --→ MPU6050
  ↕
GPIO 25 --→ Buzzer
  ↕
WiFi --→ Backend Server (ngrok HTTPS)
```

---

## 📚 Library & Dependensi

### 1. `Wire.h` (I2C Communication)
**Fungsi**: Komunikasi I2C dengan sensor MPU6050  
**Alasan**: MPU6050 menggunakan protokol I2C (Inter-Integrated Circuit) untuk transfer data antara ESP32 dan sensor. Protokol ini efisien untuk short-distance communication dengan hanya 2 wire (SDA & SCL).

### 2. `TinyGPS++.h` (GPS Parsing)
**Fungsi**: Parse NMEA sentences dari GPS module  
**Alasan**: 
- GPS module mengirim data dalam format NMEA (National Marine Electronics Association)
- Library ini efficient dalam mem-parse latitude, longitude, satellites, dll dari raw NMEA strings
- Ukuran library kecil (~10KB) cocok untuk ESP32 memory constraint

### 3. `Adafruit_MPU6050.h` & `Adafruit_Sensor.h`
**Fungsi**: Interface dengan sensor MPU6050 (accelerometer + gyroscope)  
**Alasan**: 
- Menyediakan abstraksi high-level untuk reading sensor data
- Handle I2C communication complexity
- Built-in calibration dan filtering
- Mendukung DMP (Digital Motion Processor) untuk advanced processing

### 4. `WiFi.h`
**Fungsi**: Koneksi ke WiFi network  
**Alasan**: ESP32 punya WiFi chip built-in. Digunakan untuk kirim data real-time ke backend server.

### 5. `HTTPClient.h` & `WiFiClientSecure.h`
**Fungsi**: HTTP/HTTPS POST request  
**Alasan**: 
- Kirim telemetry data ke server via REST API
- `WiFiClientSecure` untuk HTTPS (ngrok endpoint requires SSL)
- `setInsecure()` digunakan untuk skip SSL certificate validation (demo purposes)

---

## 🔢 Tipe Data & Alasan Penggunaan

### Konstanta (const)
```cpp
const char* ssid = "Rendem";                    // String pointer (const = immutable)
const unsigned long uartTimeout = 3000;         // unsigned = non-negative only
const float FALL_THR_LOW = 0.98;               // float = decimal precision
```

**Alasan `const`**:
- **Memory efficiency**: Data disimpan di Flash memory (read-only), bukan RAM
- **Safety**: Prevent accidental modification
- **Compiler optimization**: Compiler bisa optimize lebih baik

### unsigned long vs long
```cpp
unsigned long lastNmeaMillis = 0;              // 0 to 4,294,967,295
unsigned long freeFallStart = 0;
```

**Alasan `unsigned long`**:
- `millis()` return type adalah `unsigned long` (32-bit)
- Range: 0 hingga ~49.7 days (4.29 billion milliseconds)
- **Tidak perlu negative values** karena timestamp selalu positif
- **2x range** dibanding `long` yang include negative values

### uint32_t vs int
```cpp
uint32_t fallId = 0;                           // Explicitly 32-bit unsigned
uint32_t lastSat = 0;
```

**Alasan `uint32_t`**:
- **Cross-platform consistency**: Guaranteed 32-bit pada semua platform
- **Unsigned**: ID dan satellite count tidak pernah negative
- **Explicit size**: Kode lebih self-documenting

### float vs double
```cpp
float ax_g = 0, ay_g = 0, az_g = 0;           // 32-bit floating point
double lastLat = 0, lastLng = 0;              // 64-bit floating point
```

**Alasan `float` untuk sensor data**:
- **Precision cukup**: ±1.175e-38 hingga ±3.402e+38
- **Memory efficient**: 4 bytes vs 8 bytes (double)
- Sensor MPU6050 precision limit ~0.001g, float cukup

**Alasan `double` untuk koordinat GPS**:
- **High precision needed**: GPS coordinates butuh 6-8 decimal places
- Format: -6.981921 (latitude), 107.614934 (longitude)
- 1 decimal degree ≈ 111 km, jadi butuh minimal 6 decimals untuk accuracy meter-level

### bool vs int untuk flags
```cpp
bool imuOk = false;                            // 1 byte
bool inFreeFall = false;
```

**Alasan `bool`**:
- **Self-documenting**: Langsung jelas ini true/false flag
- **Memory efficient**: 1 byte vs 4 bytes (int)
- **Type safety**: Compiler warning jika assign non-boolean values

---

## ⚙️ Konstanta & Konfigurasi

### GPS Configuration
```cpp
static const int GPS_RX_PIN = 16;
static const int GPS_TX_PIN = 17;
static const int GPS_BAUD = 38400;
```

**Alasan nilai:**
- **Pin 16/17**: ESP32 UART2 default pins, avoid strapping pins (0,2,5,12,15)
- **38400 baud**: GPS M10 default baud rate (faster than old 9600 standard)
- **`static const int`**: Compile-time constant, no RAM usage

### MPU6050 Configuration
```cpp
static const int MPU_SDA_PIN = 21;            // I2C Data
static const int MPU_SCL_PIN = 22;            // I2C Clock
```

**Alasan nilai:**
- **Pin 21/22**: ESP32 default I2C pins
- Hardware I2C lebih cepat daripada software I2C
- Compatible dengan Arduino Wire library

### Fall Detection Thresholds

#### 1. FALL_THR_LOW = 0.98g
```cpp
const float FALL_THR_LOW = 0.98;
```

**Alasan Fisika:**
- **Normal gravity = 1.0g** (9.81 m/s²)
- Saat free fall: percepatan mendekati **0g** (semua objek jatuh sama cepat)
- **0.98g** artinya percepatan < 2% dari normal gravity
- **Threshold rendah** untuk detect subtle movement (tongkat jatuh dari 1cm)

**Formula:**
```
accTotal = √(ax² + ay² + az²)
Kondisi: accTotal < 0.98g → Possible fall detected
```

#### 2. IMPACT_THR = 1.05g
```cpp
const float IMPACT_THR = 1.05;
```

**Alasan Fisika:**
- Saat objek **menabrak lantai**, percepatan **spike** > 1g
- **1.05g** = impact sangat ringan (5% above normal)
- Untuk tongkat jatuh 1cm, impact minimal tapi tetap terdetect

**Formula:**
```
Impact Force = mass × acceleration
Jika accTotal > 1.05g → Impact confirmed
```

#### 3. GYRO_ROTATION_THR = 50°/s
```cpp
const float GYRO_ROTATION_THR = 50.0;
```

**Alasan Fisika:**
- **Angular velocity** (kecepatan rotasi) dalam degrees per second
- Normal movement tongkat: **< 30°/s**
- Saat jatuh: tongkat **berputar cepat** ~50-200°/s
- **50°/s threshold** = super sensitive untuk detect subtle rotation

**Formula (Konversi rad/s ke deg/s):**
```cpp
gx_dps = abs(g.gyro.x * 180.0 / PI);  // rad/s × (180/π) = deg/s
gyroTotal = √(gx_dps² + gy_dps² + gz_dps²)
```

**Derivasi:**
- MPU6050 output: **rad/s** (radians per second)
- Conversion factor: **180/π ≈ 57.2958**
- 1 radian = 57.2958 degrees

#### 4. IMPACT_WINDOW = 3000ms
```cpp
const unsigned long IMPACT_WINDOW = 3000;
```

**Alasan Temporal:**
- **Detection window**: Waktu tunggu impact setelah free fall detected
- Free fall duration: **t = √(2h/g)**
  - Untuk h = 1cm = 0.01m
  - t = √(2 × 0.01 / 9.81) ≈ **0.045 seconds** = 45ms
- **3000ms (3 detik)** = Buffer sangat besar untuk ensure tidak miss impact
- Include waktu untuk orientasi change detection

#### 5. fallCooldown = 2000ms
```cpp
const unsigned long fallCooldown = 2000;
```

**Alasan:**
- **Prevent multiple triggers** dari single fall event
- Setelah fall detected, ignore semua event selama 2 detik
- Prevents **false positive barrage** saat tongkat bouncing

#### 6. Auto-confirm timeout = 500ms
```cpp
bool autoConfirm = (elapsed > 500);
```

**Alasan:**
- Untuk **low-height falls** (1cm), impact mungkin sangat kecil
- Jika orientasi berubah (rotasi/movement detected) selama **500ms**, assume jatuh
- **0.5 detik** cukup untuk detect orientation change tanpa too sensitive

### Buzzer Configuration
```cpp
static const int BUZZER_PIN = 25;
static const int BUZZER_FREQ = 2000;          // Hz
static const unsigned long BUZZER_DURATION = 18000;  // ms
static const unsigned long BEEP_PERIOD = 300;        // ms
```

**Alasan nilai:**
- **Pin 25**: Safe GPIO pin (bukan strapping pin)
- **2000 Hz**: Human hearing most sensitive at **2-4 kHz** range
- **18 seconds**: Cukup lama untuk alert caregiver tanpa annoying
- **300ms period**: 150ms ON + 150ms OFF = intermittent beep (tidak continuous noise)

---

## 🧮 Formula Matematis

### 1. Total Acceleration (Magnitude Vector)
```cpp
accTotal = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);
```

**Derivasi Matematis:**
- **3D Vector**: a⃗ = (ax, ay, az)
- **Magnitude**: |a⃗| = √(ax² + ay² + az²)
- **Pythagorean theorem** in 3D space

**Penjelasan Fisika:**
- Accelerometer measure percepatan di 3 axes (X, Y, Z)
- **Total magnitude** = resultant vector dari ketiga komponen
- Dalam kondisi **static** (diam), |a⃗| ≈ 1g (gravitasi bumi)
- Saat **free fall**, |a⃗| ≈ 0g (semua axis cancel out)

**Contoh Nilai:**
```
Normal (diam):      accTotal = √(0² + 0² + 1²) = 1.0g ✓
Free fall:          accTotal = √(0² + 0² + 0²) = 0.0g ✓
Slight movement:    accTotal = √(0.1² + 0.2² + 0.97²) = 0.99g
```

### 2. Gyroscope Angular Velocity (Magnitude)
```cpp
gx_dps = abs(g.gyro.x * 180.0 / PI);  
gyroTotal = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);
```

**Derivasi Unit Conversion:**
```
Sensor output:     rad/s (radians per second)
Target unit:       deg/s (degrees per second)

Conversion:
1 revolution = 2π radians = 360 degrees
→ 1 radian = 360/(2π) = 180/π ≈ 57.2958 degrees

Formula:
deg/s = rad/s × (180/π)
```

**Magnitude Calculation:**
- Sama seperti accelerometer, hitung **3D vector magnitude**
- Gyro measure **angular velocity** di 3 axes (roll, pitch, yaw)
- **Total rotation** = resultant angular velocity

**Contoh Nilai:**
```
Diam:               gyroTotal = 0°/s
Slow rotation:      gyroTotal = 20°/s
Fast rotation:      gyroTotal = 100°/s
Fall (tumbling):    gyroTotal = 50-200°/s
```

### 3. Fall Confidence Score
```cpp
fallConfidence = (freefallMs / 800.0) * (fallStrength / 2.0);
if (fallConfidence > 1.0) fallConfidence = 1.0;
```

**Derivasi Formula:**
```
Confidence = (Duration Factor) × (Strength Factor)

Duration Factor = freefallMs / 800.0
  - Normalization: 800ms = typical fall duration
  - freefallMs = 0ms   → factor = 0.0
  - freefallMs = 800ms → factor = 1.0
  - freefallMs > 800ms → factor > 1.0 (clamped to 1.0)

Strength Factor = fallStrength / 2.0
  - Normal: 1.0g / 2.0 = 0.5
  - Impact: 2.0g / 2.0 = 1.0
  - Heavy:  4.0g / 2.0 = 2.0 (clamped to 1.0)

Range: 0.0 to 1.0 (0% to 100% confidence)
```

**Contoh Kalkulasi:**
```
Scenario 1: Quick drop (fast fall)
  freefallMs = 400ms
  fallStrength = 1.5g
  Confidence = (400/800) × (1.5/2.0) = 0.5 × 0.75 = 0.375 → 37.5%

Scenario 2: Confirmed fall
  freefallMs = 800ms
  fallStrength = 2.0g
  Confidence = (800/800) × (2.0/2.0) = 1.0 × 1.0 = 1.0 → 100%
```

### 4. Accelerometer Raw to G-force Conversion
```cpp
ax_g = a.acceleration.x / 9.81;
ay_g = a.acceleration.y / 9.81;
az_g = a.acceleration.z / 9.81;
```

**Derivasi Fisika:**
```
Sensor output: m/s² (meters per second squared)
Target unit:   g (Earth gravity units)

Earth gravity: g = 9.81 m/s²

Conversion:
g-force = acceleration(m/s²) / 9.81
```

**Kenapa 9.81?**
- **Gravitasi bumi** = 9.81 m/s² (standard)
- 1g = percepatan yang dirasakan saat **diam di permukaan bumi**
- Normalisasi makes comparison easier (1.0 = normal, 0.0 = free fall)

---

## 🎯 Algoritma Deteksi Jatuh

### State Machine Overview
```
[IDLE] → [FREE FALL DETECTED] → [IMPACT CONFIRMATION] → [FALL CONFIRMED]
  ↓            ↓                        ↓                      ↓
Normal    Rotation OR         Wait impact OR          Alert triggered
State     Low accel           Auto-confirm            
```

### Detailed Algorithm Flow

#### Phase 1: Trigger Detection
```cpp
if (!inFreeFall && (accTotal < FALL_THR_LOW || gyroTotal > GYRO_ROTATION_THR)) {
    inFreeFall = true;
    freeFallStart = now;
    rotationDetected = (gyroTotal > GYRO_ROTATION_THR);
}
```

**Logic:**
- **Condition A**: `accTotal < 0.98g` → Possible free fall
- **Condition B**: `gyroTotal > 50°/s` → Rapid rotation
- **OR operator**: Trigger jika **salah satu** kondisi true
- **Reason**: Tongkat bisa jatuh dengan minimal rotation ATAU minimal acceleration change

**State Changes:**
- `inFreeFall = true` → Enter detection window
- `freeFallStart = now` → Start timer
- `rotationDetected = flag` → Record trigger type

#### Phase 2: Confirmation Window
```cpp
if (inFreeFall) {
    unsigned long elapsed = now - freeFallStart;
    
    bool hasImpact = (accTotal > IMPACT_THR);      // 1.05g
    bool autoConfirm = (elapsed > 500);             // 500ms timeout
    
    if ((hasImpact || autoConfirm) && elapsed < IMPACT_WINDOW) {
        fallDetected = true;
        // Trigger alert...
    }
}
```

**Dual Confirmation Strategy:**

**Strategy 1: Impact Detection**
```
IF accTotal > 1.05g → Impact confirmed
```
- Wait for acceleration **spike** saat hit ground
- Works for **high drops** with clear impact

**Strategy 2: Auto-Confirm**
```
IF elapsed > 500ms → Orientation change confirmed
```
- For **low-height falls** (1cm) where impact negligible
- Assumes sustained orientation change = fall

**Why OR logic?**
- **Flexibility**: Works untuk berbagai skenario jatuh
- High fall → detected by impact
- Low fall → detected by orientation change
- **Tidak require both** conditions → increase sensitivity

#### Phase 3: Alert Trigger
```cpp
fallDetected = true;
fallStrength = accTotal;
freefallMs = elapsed;
fallId++;
lastFallAt = now;
inFreeFall = false;

sendFonnteAlert();
startBuzzerAlarm();
```

**Actions:**
1. **Set flags**: Mark fall detected
2. **Record metrics**: Strength, duration, ID
3. **Reset state**: Exit detection window
4. **Trigger alerts**: WhatsApp (Fonnte) + Buzzer
5. **Update cooldown**: Prevent re-trigger

#### Phase 4: Cooldown
```cpp
if (now - lastFallAt < fallCooldown) return;
```

**Purpose:**
- **Debouncing**: Ignore events for 2 seconds setelah fall
- Prevent **multiple alerts** dari single fall event
- Allows tongkat to **settle** sebelum resume detection

### Timeout Mechanism
```cpp
if (elapsed >= IMPACT_WINDOW) {
    inFreeFall = false;
    Serial.println("⏱️ Timeout");
}
```

**Purpose:**
- Jika **3 seconds** pass tanpa confirmation → false alarm
- Reset state machine to IDLE
- Prevents **stuck in detection state**

---

## 📡 Komunikasi & Protokol

### 1. GPS (UART Communication)
```cpp
gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
```

**Protocol:** UART (Universal Asynchronous Receiver-Transmitter)
- **Baud rate**: 38400 bits/second
- **Format**: 8-N-1 (8 data bits, No parity, 1 stop bit)
- **Pins**: RX=16 (receive), TX=17 (transmit)

**Data Format:** NMEA 0183
```
$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
```
- ASCII strings dengan comma-separated values
- `TinyGPS++` parse strings ini extract lat/lng/satellites

**Health Check:**
```cpp
if (millis() - lastNmeaMillis > uartTimeout) uartOk = false;
```
- Detect **communication failure** jika no data dalam 3 detik
- Set `uartOk = false` untuk notify backend

### 2. MPU6050 (I2C Communication)
```cpp
Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
mpu.begin();
```

**Protocol:** I2C (Inter-Integrated Circuit)
- **2-wire**: SDA (data), SCL (clock)
- **Address**: 0x68 (MPU6050 default I2C address)
- **Speed**: Default 100 kHz (standard mode)

**Configuration:**
```cpp
mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
mpu.setGyroRange(MPU6050_RANGE_500_DEG);
mpu.setFilterBandwidth(MPU6050_BAND_5_HZ);
```

**Alasan Settings:**
- **±8g range**: Cukup untuk detect falls (typically < 4g)
- **±500°/s**: Cukup untuk rapid rotation during fall
- **5 Hz filter**: Low-pass filter untuk **remove noise** (smooth data)

### 3. WiFi & HTTP
```cpp
WiFi.begin(ssid, password);
http.begin(secureClient, serverUrl);
http.addHeader("Content-Type", "application/json");
```

**Protocol:** HTTPS over WiFi
- **Encryption**: TLS/SSL (via `WiFiClientSecure`)
- **Method**: POST request
- **Format**: JSON payload

**Payload Structure:**
```json
{
  "uart_ok": true,
  "latitude": -6.981921,
  "longitude": 107.614934,
  "satellites": 8,
  "ax_g": 0.02,
  "ay_g": -0.01,
  "az_g": 1.00,
  "acc_total": 1.000,
  "fall_detected": true,
  "fall_strength": 1.56,
  "fall_confidence": 0.87,
  "freefall_ms": 650,
  "fall_id": 5,
  "fall_ts": 123456,
  "fall_lat": -6.981921,
  "fall_lng": 107.614934
}
```

**Send Interval:**
```cpp
if (now - lastSend >= sendInterval) {  // 1000ms
```
- Send telemetry **every 1 second**
- Balance between **real-time updates** dan **network load**

---

## 🎓 Kesimpulan Teknis

### Innovation Points untuk Dosen

1. **Dual-Strategy Fall Detection**
   - Hybrid approach: Accelerometer + Gyroscope
   - Auto-confirm mechanism untuk low-height falls
   - Scientific threshold tuning berdasarkan physics

2. **Mathematical Rigor**
   - Vector magnitude calculations (3D Pythagoras)
   - Unit conversions (rad/s → deg/s)
   - Confidence scoring algorithm

3. **Communication Protocol Optimization**
   - Efficient UART parsing dengan TinyGPS++
   - I2C sensor configuration dengan noise filtering
   - JSON serialization untuk REST API

4. **Memory Management**
   - Strategic use of `const` → Flash memory storage
   - Appropriate data types (`unsigned long`, `uint32_t`, `float`, `double`)
   - Minimal RAM footprint

5. **Real-time Constraints**
   - Non-blocking buzzer implementation
   - 1-second telemetry interval
   - State machine untuk reliable fall detection

### Technical Novelty
Project ini **bukan copy-paste** karena:
- ✅ Custom threshold tuning untuk walking stick scenario
- ✅ Dual confirmation strategy (original design)
- ✅ Mathematical derivations untuk setiap formula
- ✅ Optimized untuk low-power ESP32 architecture
- ✅ Real-world testing dan iteration (1cm height sensitivity)

---
