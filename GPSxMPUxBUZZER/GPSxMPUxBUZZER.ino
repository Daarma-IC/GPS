#include <Wire.h>
#include <TinyGPS++.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ================= WIFI =================
const char* ssid       = "Kosan Pa Nendi lt2";
const char* password   = "GBABlok05";
const char* serverUrl  = "http://192.168.1.88:3001/gps";

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

// ================= IMU =================
Adafruit_MPU6050 mpu;
bool imuOk = false;

// Threshold fall
const float FALL_THR_LOW = 0.75;           // free fall < 0.75g
const float IMPACT_THR   = 1.8;            // impact > 1.8g
const unsigned long IMPACT_WINDOW = 800;   // ms window setelah freefall

bool inFreeFall = false;
unsigned long freeFallStart = 0;

// event vars
bool fallDetected = false;
float fallStrength = 0.0;
float fallConfidence = 0.0;
unsigned long freefallMs = 0;
uint32_t fallId = 0;
unsigned long lastFallAt = 0;
const unsigned long fallCooldown = 5000;

// raw accel cache for debug/payload
float ax_g = 0, ay_g = 0, az_g = 0, accTotal = 0;

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

// ================= FALL CHECK =================
void checkFall() {
  if (!imuOk) return;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  ax_g = a.acceleration.x / 9.81;
  ay_g = a.acceleration.y / 9.81;
  az_g = a.acceleration.z / 9.81;
  accTotal = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  unsigned long now = millis();

  if (now - lastFallAt < fallCooldown) return;

  if (!inFreeFall && accTotal < FALL_THR_LOW) {
    inFreeFall = true;
    freeFallStart = now;
  }

  if (inFreeFall) {
    if (accTotal > IMPACT_THR && (now - freeFallStart) < IMPACT_WINDOW) {
      fallDetected = true;
      fallStrength = accTotal;
      freefallMs = now - freeFallStart;

      fallConfidence = (freefallMs / 800.0) * (fallStrength / 2.0);
      if (fallConfidence > 1.0) fallConfidence = 1.0;

      fallId++;
      lastFallAt = now;
      inFreeFall = false;

      Serial.print("🚨 FALL DETECTED strength=");
      Serial.print(fallStrength);
      Serial.print(" freefallMs=");
      Serial.print(freefallMs);
      Serial.print(" conf=");
      Serial.println(fallConfidence);

      sendFonnteAlert();
      startBuzzerAlarm();  // bunyi 18 detik
    }

    if ((now - freeFallStart) >= IMPACT_WINDOW) {
      inFreeFall = false;
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
  Wire.begin(21, 22);  // SDA, SCL ESP32 default
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
      http.begin(wifiClient, serverUrl);
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(payload);
      Serial.print("[HTTP ");
      Serial.print(httpCode);
      Serial.println("]");
      http.end();
    }
  }
}
