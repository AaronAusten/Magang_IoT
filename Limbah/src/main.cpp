#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "DHT.h"

const char* ssid = "SAIL-IoT";
const char* password = "S1L1wan9i";
const char* mqtt_server = "192.168.0.211";

WiFiClient espClient;
PubSubClient client(espClient);

#define DHTPIN 27 
#define DHTTYPE DHT22
#define MICS_PIN 34
DHT dht(DHTPIN, DHTTYPE);

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void reconnect() {
  while (!client.connected()) {
    if (!client.connect("ESP32_Environment")) { delay(5000); }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  dht.begin();
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (isnan(h) || isnan(t)) return;

  int rawADC = 0;
  for(int i=0; i<10; i++) {
    rawADC += analogRead(MICS_PIN);
    delay(10);
  }
  rawADC /= 10;

  String kualitas;
  if (rawADC < 50)         kualitas = "SANGAT BERSIH";
  else if (rawADC < 500)   kualitas = "NORMAL / AMAN";
  else if (rawADC < 1500)  kualitas = "TERDETEKSI GAS";
  else                     kualitas = "BAHAYA";

  String payload = "{";
  payload += "\"h\":" + String(h, 1) + ",";
  payload += "\"t\":" + String(t, 1) + ",";
  payload += "\"raw\":" + String(rawADC) + ",";
  payload += "\"stat\":\"" + kualitas + "\"";
  payload += "}";

  client.publish("sensor/lingkungan", payload.c_str());

  Serial.println("Data Lingkungan Terkirim!");
  delay(5000);
}