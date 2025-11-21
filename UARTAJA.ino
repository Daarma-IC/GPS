#include <Wire.h>
#include <SoftwareSerial.h>
#include <TinyGPS++.h>

TinyGPSPlus gps;
SoftwareSerial gpsSerial(4, 3); // RX=4 (dari TX GPS), TX=3 (ke RX GPS)

unsigned long lastPrint = 0;
const unsigned long interval = 500; // 0.5 detik

void setup() {
  Serial.begin(115200);       // ke PC / Node.js
  gpsSerial.begin(115200);    // ke GPS
  Wire.begin();               // start I2C

  Serial.println("GPS + I2C JSON START");
}

void loop() {
  // --- Baca GPS lewat UART (D4/D3) ---
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // --- Baca kompas (I2C) contoh: alamat 0x1E (HMC5883L / sejenis) ---
  int16_t mx = 0, my = 0, mz = 0;

  Wire.beginTransmission(0x1E); // ganti kalau alamat berbeda
  Wire.write(0x03);             // register start (contoh)
  Wire.endTransmission();
  Wire.requestFrom(0x1E, 6);

  if (Wire.available() == 6) {
    mx = (Wire.read() << 8) | Wire.read();
    mz = (Wire.read() << 8) | Wire.read();
    my = (Wire.read() << 8) | Wire.read();
  }

  // --- Kirim JSON tiap 0.5 detik ---
  unsigned long now = millis();

  if (now - lastPrint >= interval) {
    lastPrint = now;

    if (gps.location.isValid()) {
      double lat = gps.location.lat();
      double lng = gps.location.lng();
      uint32_t sats = gps.satellites.value();

      Serial.print("{\"latitude\":");
      Serial.print(lat, 6);
      Serial.print(",\"longitude\":");
      Serial.print(lng, 6);
      Serial.print(",\"satellites\":");
      Serial.print(sats);
      Serial.print(",\"mx\":");
      Serial.print(mx);
      Serial.print(",\"my\":");
      Serial.print(my);
      Serial.print(",\"mz\":");
      Serial.print(mz);
      Serial.println("}");
    } else {
      Serial.print("{\"error\":\"no_fix\",\"satellites\":");
      Serial.print(gps.satellites.value());
      Serial.print(",\"mx\":");
      Serial.print(mx);
      Serial.print(",\"my\":");
      Serial.print(my);
      Serial.print(",\"mz\":");
      Serial.print(mz);
      Serial.println("}");
    }
  }
}
