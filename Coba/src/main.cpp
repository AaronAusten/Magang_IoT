#include <DHT.h>
#include <ArduinoJson.h>

#define DHT_PIN  27
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

float suhu_panas  = 35.0;
float suhu_dingin = 20.0;

unsigned long lastSend = 0;
const long INTERVAL = 3000;

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  // Terima parameter dari Python via Serial
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    JsonDocument doc;
    if (!deserializeJson(doc, input)) {
      if (doc["suhu_panas"].is<float>())  suhu_panas  = doc["suhu_panas"].as<float>();
      if (doc["suhu_dingin"].is<float>()) suhu_dingin = doc["suhu_dingin"].as<float>();
    }
  }

  // Kirim data sensor tiap 3 detik
  if (millis() - lastSend >= INTERVAL) {
    lastSend = millis();

    float suhu      = dht.readTemperature();
    float kelembaban = dht.readHumidity();

    if (isnan(suhu) || isnan(kelembaban)) return;

    String status = "normal";
    if (suhu >= suhu_panas)       status = "panas";
    else if (suhu <= suhu_dingin) status = "dingin";

    JsonDocument doc;
    doc["suhu"]             = suhu;
    doc["kelembaban"]       = kelembaban;
    doc["threshold_panas"]  = suhu_panas;
    doc["threshold_dingin"] = suhu_dingin;
    doc["status"]           = status;

    serializeJson(doc, Serial);
    Serial.println();
  }

  delay(10);
}