#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

// --- 1. KONFIGURASI SENSOR ---
#define DHTPIN 4       // Kabel data sensor ke GPIO 4
#define DHTTYPE DHT22  // Karena sensor kamu DHT22 (Putih)
DHT dht(DHTPIN, DHTTYPE);

// --- 2. KONFIGURASI JARINGAN ---
const char* ssid = "Aaron Austen";       // Nama Hotspot/WiFi
const char* password = "        "; // Password WiFi
const char* mqtt_server = "10.159.97.125"; // IP Ubuntu yang baru (hostname -I)

WiFiClient espClient;
PubSubClient client(espClient);

// --- 3. FUNGSI CONNECT WIFI ---
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

// --- 4. FUNGSI RECONNECT MQTT ---
void reconnect() {
  while (!client.connected()) {
    Serial.print("Mencoba koneksi MQTT ke ");
    Serial.print(mqtt_server);
    Serial.print("... ");

    // ESP32_SAIL_Project adalah ID perangkat di Broker
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
  
  // Set alamat Server Ubuntu dan Port MQTT standar (1883)
  client.setServer(mqtt_server, 1883);
}

void loop() {
  // Pastikan koneksi MQTT tetap terjaga
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Membaca Sensor DHT22
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // Validasi pembacaan
  if (isnan(h) || isnan(t)) {
    Serial.println("⚠️ Gagal baca DHT22! Cek kabel/tegangan.");
    return;
  }

  // Format Payload: "suhu,kelembapan" (Sesuai script Python bridge.py)
  // Gunakan 2 angka di belakang koma untuk akurasi DHT22
  String payload = String(t, 2) + "," + String(h, 2);
  
  Serial.print("Kirim Data: ");
  Serial.println(payload);

  // Publish ke topik pabrik/sensor/suhu
  if (client.publish("pabrik/sensor/suhu", payload.c_str())) {
    Serial.println("📤 Data berhasil terkirim ke Ubuntu.");
  } else {
    Serial.println("📥 Data gagal terkirim.");
  }

  delay(10000); // Kirim data setiap 10 detik
}