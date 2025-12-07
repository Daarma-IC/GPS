#include <Wire.h>
#include <TinyGPS++.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ================= WIFI =================
const char* ssid       = "Rendem";
const char* password   = "hackathon!212";
const char* serverUrl  = "https://nonaffinitive-cablelaid-kara.ngrok-free.dev/gps";

// ================= FONNTE =================
const char* FONNTE_TOKEN = "h2gbzah52g1PaioGUnDs";
String API_URL =
  "https://api.fonnte.com/send?token=" + String(FONNTE_TOKEN) +
  "&target=6289513829923&message=PERINGATAN!%20Jatuh%20dideteksi.";

// ================= GPS (UART2) =================
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
static const int GPS_RX_PIN = 16; // RX ESP32 <- TX GPS M10
static const int GPS_TX_PIN = 17; // TX ESP32 -> RX GPS (opsional)
static const int GPS_BAUD   = 38400;

// UART health
bool uartOk = false;
unsigned long lastNmeaMillis = 0;
const unsigned long uartTimeout = 3000;

// last valid fix cache (buat posisi event jatuh)
bool lastFixValid = false;
double lastLat = 0, lastLng = 0;
uint32_t lastSat = 0;
unsigned long lastFixAt = 0;

// ================= IMU (I2C) =================
static const int MPU_SDA_PIN = 21;  // I2C SDA pin (default ESP32)
static const int MPU_SCL_PIN = 22;  // I2C SCL pin (default ESP32)
// Alternative pins: SDA=23, SCL=19 or SDA=25, SCL=26 or any GPIO

// ================= IMU =================
Adafruit_MPU6050 mpu;
bool imuOk = false;

// Threshold SUPER SENSITIF untuk tongkat jatuh 1cm (hampir tidak ada impact)
// Strategi: Deteksi ORIENTASI BERUBAH (gyroscope) atau GERAKAN APAPUN
const float FALL_THR_LOW = 0.98;           // Gerakan kecil < 0.98g
const float IMPACT_THR   = 1.05;           // Impact sangat ringan > 1.05g  
const unsigned long IMPACT_WINDOW = 3000;  // 3 detik window (sangat lama)
const unsigned long fallCooldown = 2000;   // 2 detik cooldown
const float GYRO_ROTATION_THR = 50.0;      // Rotasi > 50°/s (SANGAT SENSITIF)

bool inFreeFall = false;
unsigned long freeFallStart = 0;

// event vars
bool fallDetected = false;
float fallStrength = 0.0;
float fallConfidence = 0.0;
unsigned long freefallMs = 0;
uint32_t fallId = 0;
unsigned long lastFallAt = 0;

// raw accel cache for debug/payload
float ax_g = 0, ay_g = 0, az_g = 0, accTotal = 0;

// Gyroscope data (untuk deteksi tongkat berputar saat jatuh)
float gx_dps = 0, gy_dps = 0, gz_dps = 0, gyroTotal = 0;
bool rotationDetected = false;

// ================= BUZZER =================
static const int BUZZER_PIN = 25;                 // pilih pin aman (bukan strapping)
static const int BUZZER_FREQ = 2000;              // Hz, cukup nyaring
static const unsigned long BUZZER_DURATION = 18000; // 18 detik
static const unsigned long BEEP_PERIOD = 300;     // 150ms ON, 150ms OFF

bool buzzerActive = false;
unsigned long buzzerStartMs = 0;

// ================= TIMING =================
unsigned long lastSend = 0;
const unsigned long sendInterval = 1000;

WiFiClient wifiClient;
WiFiClientSecure secureClient;  // For HTTPS/ngrok connection

// ================= SEND FONNTE =================
void sendFonnteAlert() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secure;
  secure.setInsecure(); // demo cepat

  HTTPClient http;
  http.begin(secure, API_URL);
  int code = http.GET();
  Serial.print("[FONNTE HTTP ");
  Serial.print(code);
  Serial.println("]");
  http.end();
}

// ================= BUZZER LOOP (non-blocking) =================
void startBuzzerAlarm() {
  buzzerActive = true;
  buzzerStartMs = millis();
}

void handleBuzzer() {
  if (!buzzerActive) return;

  unsigned long now = millis();
  unsigned long elapsed = now - buzzerStartMs;

  if (elapsed >= BUZZER_DURATION) {
    noTone(BUZZER_PIN);     // stop
    buzzerActive = false;
    return;
  }

  // beep ON/OFF
  unsigned long phase = elapsed % BEEP_PERIOD;
  if (phase < (BEEP_PERIOD / 2)) {
    tone(BUZZER_PIN, BUZZER_FREQ);   // ON
  } else {
    noTone(BUZZER_PIN);              // OFF
  }
}

// ================= FALL CHECK (OPTIMIZED FOR WALKING STICK) =================
void checkFall() {
  if (!imuOk) return;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Accelerometer data
  ax_g = a.acceleration.x / 9.81;
  ay_g = a.acceleration.y / 9.81;
  az_g = a.acceleration.z / 9.81;
  accTotal = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  // Gyroscope data (deteksi rotasi saat tongkat jatuh miring)
  gx_dps = abs(g.gyro.x * 180.0 / PI);  // Convert rad/s to deg/s
  gy_dps = abs(g.gyro.y * 180.0 / PI);
  gz_dps = abs(g.gyro.z * 180.0 / PI);
  gyroTotal = sqrt(gx_dps*gx_dps + gy_dps*gy_dps + gz_dps*gz_dps);

  unsigned long now = millis();

  // Debug output every second
  static unsigned long lastDebug = 0;
  if (now - lastDebug > 1000) {
    lastDebug = now;
    Serial.print("📊 ACC: ");
    Serial.print(accTotal, 2);
    Serial.print("g | GYRO: ");
    Serial.print(gyroTotal, 0);
    Serial.print("°/s | Thresholds: acc<");
    Serial.print(FALL_THR_LOW);
    Serial.print("g OR gyro>");
    Serial.print(GYRO_ROTATION_THR);
    Serial.print("°/s, impact>");
    Serial.print(IMPACT_THR);
    Serial.print("g");
    if (inFreeFall) {
      Serial.print(" | ⚠️ TONGKAT JATUH! Waiting for impact...");
    }
    Serial.println();
  }

  if (now - lastFallAt < fallCooldown) return;

  // Detect fall: Rotasi ATAU perubahan percepatan
  if (!inFreeFall && (accTotal < FALL_THR_LOW || gyroTotal > GYRO_ROTATION_THR)) {
    inFreeFall = true;
    freeFallStart = now;
    rotationDetected = (gyroTotal > GYRO_ROTATION_THR);
    
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
  }

  if (inFreeFall) {
    // OPSI A: Tunggu impact (jatuh dari tinggi)
    // OPSI B: Auto-confirm setelah 500ms (orientasi berubah = jatuh)
    
    unsigned long elapsed = now - freeFallStart;
    
    // Konfirmasi jatuh jika:
    // 1. Ada impact >1.05g, ATAU
    // 2. Sudah 500ms sejak rotasi/gerakan terdeteksi (auto-confirm)
    
    bool hasImpact = (accTotal > IMPACT_THR);
    bool autoConfirm = (elapsed > 500); // Auto-confirm setelah 500ms
    
    if ((hasImpact || autoConfirm) && elapsed < IMPACT_WINDOW) {
      fallDetected = true;
      fallStrength = accTotal;
      freefallMs = elapsed;

      fallConfidence = (freefallMs / 800.0) * (fallStrength / 2.0);
      if (fallConfidence > 1.0) fallConfidence = 1.0;

      fallId++;
      lastFallAt = now;
      inFreeFall = false;

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

      sendFonnteAlert();
      startBuzzerAlarm();
    }

    // Timeout
    if (elapsed >= IMPACT_WINDOW) {
      inFreeFall = false;
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

  // ---- buzzer pin ----
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

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
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi OK, IP=");
  Serial.println(WiFi.localIP());

  // Print fall detection configuration
  Serial.println();
  Serial.println("========== FALL DETECTION CONFIG ==========");
  Serial.println("MODE: SUPER SENSITIF (1cm, auto-confirm 500ms)");
  Serial.print("  Movement threshold: <");
  Serial.print(FALL_THR_LOW);
  Serial.println("g");
  Serial.print("  Gyro rotation threshold: >");
  Serial.print(GYRO_ROTATION_THR);
  Serial.println("°/s");
  Serial.print("  Impact threshold: >");
  Serial.print(IMPACT_THR);
  Serial.println("g (optional)");
  Serial.print("  Auto-confirm: 500ms");
  Serial.println();
  Serial.print("  Detection window: ");
  Serial.print(IMPACT_WINDOW);
  Serial.println("ms");
  Serial.print("  Cooldown: ");
  Serial.print(fallCooldown / 1000);
  Serial.println("s");
  Serial.println("===========================================");
  Serial.println();

  lastNmeaMillis = millis();
}

// ================= LOOP =================
void loop() {
  // ---- GPS read ----
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
    lastNmeaMillis = millis();
    uartOk = true;
  }
  if (millis() - lastNmeaMillis > uartTimeout) uartOk = false;

  // update last valid fix
  if (gps.location.isValid()) {
    lastFixValid = true;
    lastLat = gps.location.lat();
    lastLng = gps.location.lng();
    lastSat = gps.satellites.value();
    lastFixAt = millis();
  }

  // ---- IMU fall check ----
  checkFall();

  // ---- buzzer handle (non-blocking) ----
  handleBuzzer();

  // ---- send payload tiap 1 detik ----
  unsigned long now = millis();
  if (now - lastSend >= sendInterval) {
    lastSend = now;

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
    payload += String(accTotal, 3);
    payload += ",";

    payload += "\"fall_detected\":";
    payload += fallDetected ? "true" : "false";

    if (fallDetected) {
      payload += ",\"fall_strength\":";
      payload += String(fallStrength, 2);
      payload += ",\"fall_confidence\":";
      payload += String(fallConfidence, 2);
      payload += ",\"freefall_ms\":";
      payload += String(freefallMs);
      payload += ",\"fall_id\":";
      payload += String(fallId);
      payload += ",\"fall_ts\":";
      payload += String(now);

      if (lastFixValid) {
        payload += ",\"fall_lat\":";
        payload += String(lastLat, 6);
        payload += ",\"fall_lng\":";
        payload += String(lastLng, 6);
        payload += ",\"fall_sat\":";
        payload += String(lastSat);
        payload += ",\"fall_fix_age_ms\":";
        payload += String(now - lastFixAt);
      }

      fallDetected = false;
    }

    payload += "}";

    Serial.println(payload);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      
      // Use wifiClient for HTTP, secureClient for HTTPS
      if (String(serverUrl).startsWith("https://")) {
        secureClient.setInsecure();
        http.begin(secureClient, serverUrl);
      } else {
        http.begin(wifiClient, serverUrl);
      }
      
      http.addHeader("Content-Type", "application/json");
      http.addHeader("ngrok-skip-browser-warning", "true");
      
      int httpCode = http.POST(payload);
      Serial.print("[HTTP ");
      Serial.print(httpCode);
      Serial.println("]");
      
      if (httpCode > 0) {
        String response = http.getString();
        Serial.print("Response: ");
        Serial.println(response);
      } else {
        Serial.print("Error: ");
        Serial.println(http.errorToString(httpCode));
      }
      
      http.end();
    }
  }
}