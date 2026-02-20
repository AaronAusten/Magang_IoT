#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "SAIL-IoT";
const char* password = "S1L1wan9i";
const char* mqtt_server = "192.168.0.211";

WiFiClient espClient;
PubSubClient client(espClient);

const int SENSOR_PIN = 12;
volatile long pulseCount = 0;

float flowRate = 0.0;
unsigned int totalMilliLitres = 0;
unsigned long oldTime = 0;
float calibrationFactor = 7.5; 

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void reconnect() {
  while (!client.connected()) {
    if (!client.connect("ESP32_FlowMeter")) { delay(5000); }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), pulseCounter, FALLING);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if ((millis() - oldTime) > 1000) {
    detachInterrupt(digitalPinToInterrupt(SENSOR_PIN));
    
    flowRate = ((1000.0 / (millis() - oldTime)) * pulseCount) / calibrationFactor;
    oldTime = millis();
    
    float flowMilliLitres = (flowRate / 60) * 1000;
    totalMilliLitres += (unsigned int)flowMilliLitres;
    
    String payload = "{\"rate\":" + String(flowRate) + ",\"total\":" + String(totalMilliLitres) + "}";
    client.publish("sensor/water_flow", payload.c_str());

    pulseCount = 0;
    attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), pulseCounter, FALLING);
  }
  delay(10000);
}