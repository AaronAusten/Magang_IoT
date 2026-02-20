#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

#define DHTPIN 26
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const char* ssid = "SAIL-IoT";
const char* password = "S1L1wan9i";
const char* mqtt_server = "192.168.0.211";

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi Terhubung!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Mencoba koneksi MQTT ke ");
    Serial.print(mqtt_server);
    Serial.print("... ");

    if (client.connect("ESP32_SAIL_Project")) {
      Serial.println("✅ TERHUBUNG!");
    } else {
      Serial.print("❌ GAGAL, rc=");
      Serial.print(client.state());
      Serial.println(" (Coba lagi dalam 5 detik)");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  setup_wifi();
  
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    Serial.println("⚠️ Gagal baca DHT22! Cek kabel/tegangan.");
    return;
  }

  String payload = String(t, 2) + "," + String(h, 2);
  
  Serial.print("Kirim Data: ");
  Serial.println(payload);

  if (client.publish("pabrik/sensor/suhu", payload.c_str())) {
    Serial.println("📤 Data berhasil terkirim ke Ubuntu.");
  } else {
    Serial.println("📥 Data gagal terkirim.");
  }

  delay(10000);
}