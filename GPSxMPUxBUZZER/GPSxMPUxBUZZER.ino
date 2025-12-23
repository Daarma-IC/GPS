#include <Wire.h>
#include <TinyGPS++.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ================= WIFI =================
const char* namaSsid       = "Kosan Pa Nendi lt2";
const char* kataSandi      = "GBABlok05";
const char* urlServer      = "https://nonaffinitive-cablelaid-kara.ngrok-free.dev/gps";

// ================= FONNTE =================
const char* TOKEN_FONNTE = "h2gbzah52g1PaioGUnDs";
String URL_API =
  "https://api.fonnte.com/send?token=" + String(TOKEN_FONNTE) +
  "&target=6289513829923&message=PERINGATAN!%20Jatuh%20dideteksi.";

// ================= GPS (UART2) =================
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
static const int GPS_RX_PIN = 16; // RX ESP32 <- TX GPS M10
static const int GPS_TX_PIN = 17; // TX ESP32 -> RX GPS (opsional)
static const int GPS_BAUD   = 38400;

// Kesehatan UART
bool uartOk = false;
long milisTerakhirNmea = 0;
const long waktuHabisUart = 3000;

// Cache lokasi valid terakhir (buat posisi event jatuh)
bool lokasiTerakhirValid = false;
double lintangTerakhir = 0, bujurTerakhir = 0;
int satelitTerakhir = 0;
long waktuLokasiTerakhir = 0;

// ================= IMU (I2C) =================
static const int MPU_SDA_PIN = 19;  // I2C SDA pin (default ESP32)
static const int MPU_SCL_PIN = 22;  // I2C SCL pin (default ESP32)
// Alternative pins: SDA=23, SCL=19 or SDA=25, SCL=26 or any GPIO

// ================= IMU =================
Adafruit_MPU6050 mpu;
bool imuOk = false;

// Threshold BALANCED untuk deteksi jatuh yang lebih stabil
// Strategi: Deteksi jatuh signifikan dengan gerakan/rotasi yang jelas
const float AMBANG_JATUH_RENDAH = 0.85;           // Gerakan signifikan < 0.85g
const float AMBANG_BENTURAN     = 1.3;            // Impact sedang > 1.3g  
const long JENDELA_BENTURAN = 3500;      // 3.5 detik window
const long waktuJedaJatuh = 4000;        // 4 detik cooldown
const float AMBANG_ROTASI_GYRO = 120.0;           // Rotasi > 120°/s (lebih stabil)

bool sedangJatuhBebas = false;
long waktuMulaiJatuhBebas = 0;

// variabel event
bool jatuhTerdeteksi = false;
float kekuatanJatuh = 0.0;
float keyakinanJatuh = 0.0;
long milidetikJatuhBebas = 0;
int idJatuh = 0;
long waktuJatuhTerakhir = 0;

// Cache akselerasi mentah untuk debug/payload
float ax_g = 0, ay_g = 0, az_g = 0, totalAkselerasi = 0;

// Data Gyroscope (untuk deteksi tongkat berputar saat jatuh)
float gx_dps = 0, gy_dps = 0, gz_dps = 0, totalGyro = 0;
bool rotasiTerdeteksi = false;

// ================= BUZZER =================
static const int PIN_BUZZER = 32;                     // pilih pin aman (bukan strapping)
static const int FREKUENSI_BUZZER = 2000;             // Hz, cukup nyaring
static const long DURASI_BUZZER = 18000;     // 18 detik
static const long PERIODE_BIP = 300;         // 150ms ON, 150ms OFF

bool buzzerAktif = false;
long waktuMulaiBuzzer = 0;

// ================= WAKTU =================
long waktuKirimTerakhir = 0;
const long intervalKirim = 1000;

WiFiClient klienWifi;
WiFiClientSecure klienAman;  // Untuk koneksi HTTPS/ngrok

// ================= KIRIM FONNTE =================
void kirimPeringatanFonnte() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure amanSementara;
  amanSementara.setInsecure(); // demo cepat

  HTTPClient http;
  http.begin(amanSementara, URL_API);
  int kode = http.GET();
  Serial.print("[FONNTE HTTP ");
  Serial.print(kode);
  Serial.println("]");
  http.end();
}

// ================= LOOP BUZZER (non-blocking) =================
void mulaiAlarmBuzzer() {
  buzzerAktif = true;
  waktuMulaiBuzzer = millis();
}

void tanganiBuzzer() {
  if (!buzzerAktif) return;

  long sekarang = millis();
  long terlalui = sekarang - waktuMulaiBuzzer;

  if (terlalui >= DURASI_BUZZER) {
    noTone(PIN_BUZZER);     // stop
    buzzerAktif = false;
    return;
  }

  // beep ON/OFF
  long fase = terlalui % PERIODE_BIP;
  if (fase < (PERIODE_BIP / 2)) {
    tone(PIN_BUZZER, FREKUENSI_BUZZER);   // ON
  } else {
    noTone(PIN_BUZZER);                   // OFF
  }
}

// ================= CEK JATUH (DIOPTIMALKAN UNTUK TONGKAT JALAN) =================
void cekJatuh() {
  if (!imuOk) return;

  sensors_event_t a, g, suhu;
  mpu.getEvent(&a, &g, &suhu);

  // Data Accelerometer
  ax_g = a.acceleration.x / 9.81;
  ay_g = a.acceleration.y / 9.81;
  az_g = a.acceleration.z / 9.81;
  totalAkselerasi = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  // Data Gyroscope (deteksi rotasi saat tongkat jatuh miring)
  gx_dps = abs(g.gyro.x * 180.0 / PI);  // Konversi rad/s ke deg/s
  gy_dps = abs(g.gyro.y * 180.0 / PI);
  gz_dps = abs(g.gyro.z * 180.0 / PI);
  totalGyro = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);

  long sekarang = millis();

  // Output debug setiap detik
  static long debugTerakhir = 0;
  if (sekarang - debugTerakhir > 1000) {
    debugTerakhir = sekarang;
    Serial.print("📊 ACC: ");
    Serial.print(totalAkselerasi, 2);
    Serial.print("g | GYRO: ");
    Serial.print(totalGyro, 0);
    Serial.print("°/s | Thresholds: acc<");
    Serial.print(AMBANG_JATUH_RENDAH);
    Serial.print("g OR gyro>");
    Serial.print(AMBANG_ROTASI_GYRO);
    Serial.print("°/s, impact>");
    Serial.print(AMBANG_BENTURAN);
    Serial.print("g");
    if (sedangJatuhBebas) {
      Serial.print(" | ⚠️ TONGKAT JATUH! Waiting for impact...");
    }
    Serial.println();
  }

  if (sekarang - waktuJatuhTerakhir < waktuJedaJatuh) return;

  // Deteksi jatuh: Rotasi ATAU perubahan percepatan
  if (!sedangJatuhBebas && (totalAkselerasi < AMBANG_JATUH_RENDAH || totalGyro > AMBANG_ROTASI_GYRO)) {
    sedangJatuhBebas = true;
    waktuMulaiJatuhBebas = sekarang;
    rotasiTerdeteksi = (totalGyro > AMBANG_ROTASI_GYRO);
    
    Serial.println();
    if (rotasiTerdeteksi) {
      Serial.print("🔄 ROTASI! gyro=");
      Serial.print(totalGyro, 0);
      Serial.println("°/s");
    } else {
      Serial.print("⬇️ GERAKAN! acc=");
      Serial.print(totalAkselerasi, 2);
      Serial.println("g");
    }
  }

  if (sedangJatuhBebas) {
    // OPSI A: Tunggu impact (jatuh dari tinggi)
    // OPSI B: Auto-confirm setelah 500ms (orientasi berubah = jatuh)
    
    long terlalui = sekarang - waktuMulaiJatuhBebas;
    
    // Konfirmasi jatuh jika:
    // 1. Ada impact >1.3g, ATAU
    // 2. Sudah 500ms sejak rotasi/gerakan terdeteksi (auto-confirm)
    
    bool adaBenturan = (totalAkselerasi > AMBANG_BENTURAN);
    bool konfirmasiOtomatis = (terlalui > 500); // Auto-confirm setelah 500ms
    
    if ((adaBenturan || konfirmasiOtomatis) && terlalui < JENDELA_BENTURAN) {
      jatuhTerdeteksi = true;
      kekuatanJatuh = totalAkselerasi;
      milidetikJatuhBebas = terlalui;

      keyakinanJatuh = (milidetikJatuhBebas / 800.0) * (kekuatanJatuh / 2.0);
      if (keyakinanJatuh > 1.0) keyakinanJatuh = 1.0;

      idJatuh++;
      waktuJatuhTerakhir = sekarang;
      sedangJatuhBebas = false;

      Serial.println();
      Serial.println("🚨🚨🚨 TONGKAT JATUH! 🚨🚨🚨");
      Serial.print("  Trigger: ");
      Serial.println(adaBenturan ? "Impact" : "Auto (orientasi berubah)");
      Serial.print("  Strength: ");
      Serial.print(kekuatanJatuh, 2);
      Serial.println("g");
      Serial.print("  Duration: ");
      Serial.print(milidetikJatuhBebas);
      Serial.println("ms");
      Serial.print("  Rotasi: ");
      Serial.println(rotasiTerdeteksi ? "YES" : "NO");
      Serial.println("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
      Serial.println();

      kirimPeringatanFonnte();
      mulaiAlarmBuzzer();
    }

    // Timeout
    if (terlalui >= JENDELA_BENTURAN) {
      sedangJatuhBebas = false;
      Serial.println("⏱️ Timeout");
    }
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("=== ESP32 GPS M10 + MPU6050 FALL + WIFI START ===");

  // ---- pin buzzer ----
  pinMode(PIN_BUZZER, OUTPUT);
  noTone(PIN_BUZZER);

  // ---- I2C MPU6050 ----
  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);  // Initialize I2C with defined pins
  Serial.print("I2C initialized: SDA=");
  Serial.print(MPU_SDA_PIN);
  Serial.print(", SCL=");
  Serial.println(MPU_SCL_PIN);
  
  imuOk = mpu.begin();
  if (!imuOk) {
    Serial.println("❌ MPU6050 NOT FOUND. Cek SDA/SCL + GND common!");
  } else {
    Serial.println("✅ MPU6050 OK!");
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_5_HZ);
    delay(2000);
  }

  // ---- GPS UART2 ----
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.print("GPS LOCK @");
  Serial.println(GPS_BAUD);

  // ---- WiFi ----
  WiFi.mode(WIFI_STA);
  WiFi.begin(namaSsid, kataSandi);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi OK, IP=");
  Serial.println(WiFi.localIP());

  Serial.println();
  Serial.println("========== FALL DETECTION CONFIG ==========");
  Serial.println("MODE: BALANCED (lebih stabil, kurangi false alarm)");
  Serial.print("  Movement threshold: <");
  Serial.print(AMBANG_JATUH_RENDAH);
  Serial.println("g");
  Serial.print("  Gyro rotation threshold: >");
  Serial.print(AMBANG_ROTASI_GYRO);
  Serial.println("°/s");
  Serial.print("  Impact threshold: >");
  Serial.print(AMBANG_BENTURAN);
  Serial.println("g (optional)");
  Serial.print("  Auto-confirm: 500ms");
  Serial.println();
  Serial.print("  Detection window: ");
  Serial.print(JENDELA_BENTURAN);
  Serial.println("ms");
  Serial.print("  Cooldown: ");
  Serial.print(waktuJedaJatuh / 1000);
  Serial.println("s");
  Serial.println("===========================================");
  Serial.println();

  milisTerakhirNmea = millis();
}

// ================= LOOP =================
void loop() {
  // ---- baca GPS ----
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
    milisTerakhirNmea = millis();
    uartOk = true;
  }
  if (millis() - milisTerakhirNmea > waktuHabisUart) uartOk = false;

  // perbarui fix valid terakhir
  if (gps.location.isValid()) {
    lokasiTerakhirValid = true;
    lintangTerakhir = gps.location.lat();
    bujurTerakhir = gps.location.lng();
    satelitTerakhir = gps.satellites.value();
    waktuLokasiTerakhir = millis();
  }

  // ---- cek jatuh IMU ----
  cekJatuh();

  // ---- tangani buzzer (non-blocking) ----
  tanganiBuzzer();

  // ---- kirim payload tiap 1 detik ----
  long sekarang = millis();
  if (sekarang - waktuKirimTerakhir >= intervalKirim) {
    waktuKirimTerakhir = sekarang;

    String payload = "{";

    payload += "\"uart_ok\":";
    payload += uartOk ? "true" : "false";
    payload += ",";

    if (gps.location.isValid()) {
      payload += "\"latitude\":";
      payload += String(gps.location.lat(), 6);
      payload += ",";
      payload += "\"longitude\":";
      payload += String(gps.location.lng(), 6);
      payload += ",";
      payload += "\"satellites\":";
      payload += String(gps.satellites.value());
      payload += ",";
    } else {
      payload += "\"error\":\"no_fix\",";
      payload += "\"satellites\":";
      payload += String(gps.satellites.value());
      payload += ",";
    }

    payload += "\"ax_g\":";
    payload += String(ax_g, 3);
    payload += ",\"ay_g\":";
    payload += String(ay_g, 3);
    payload += ",\"az_g\":";
    payload += String(az_g, 3);
    payload += ",\"acc_total\":";
    payload += String(totalAkselerasi, 3);
    payload += ",";

    payload += "\"fall_detected\":";
    payload += jatuhTerdeteksi ? "true" : "false";

    if (jatuhTerdeteksi) {
      payload += ",\"fall_strength\":";
      payload += String(kekuatanJatuh, 2);
      payload += ",\"fall_confidence\":";
      payload += String(keyakinanJatuh, 2);
      payload += ",\"freefall_ms\":";
      payload += String(milidetikJatuhBebas);
      payload += ",\"fall_id\":";
      payload += String(idJatuh);
      payload += ",\"fall_ts\":";
      payload += String(sekarang);

      if (lokasiTerakhirValid) {
        payload += ",\"fall_lat\":";
        payload += String(lintangTerakhir, 6);
        payload += ",\"fall_lng\":";
        payload += String(bujurTerakhir, 6);
        payload += ",\"fall_sat\":";
        payload += String(satelitTerakhir);
        payload += ",\"fall_fix_age_ms\":";
        payload += String(sekarang - waktuLokasiTerakhir);
      }

      jatuhTerdeteksi = false;
    }

    payload += "}";

    Serial.println(payload);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      
      // Use wifiClient for HTTP, secureClient for HTTPS
      if (String(urlServer).startsWith("https://")) {
        klienAman.setInsecure();
        http.begin(klienAman, urlServer);
      } else {
        http.begin(klienWifi, urlServer);
      }
      
      http.addHeader("Content-Type", "application/json");
      http.addHeader("ngrok-skip-browser-warning", "true");
      
      int kodeHttp = http.POST(payload);
      Serial.print("[HTTP ");
      Serial.print(kodeHttp);
      Serial.println("]");
      
      if (kodeHttp > 0) {
        String respons = http.getString();
        Serial.print("Response: ");
        Serial.println(respons);
      } else {
        Serial.print("Error: ");
        Serial.println(http.errorToString(kodeHttp));
      }
      
      http.end();
    }
  }
}