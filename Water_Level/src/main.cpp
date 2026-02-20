#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "SAIL-IoT";
const char* password = "S1L1wan9i";
const char* mqtt_server = "192.168.0.211";
const char* mqtt_topic = "sensor/water_level";
const char* mqtt_topic_settings = "sensor/settings";

WiFiClient espClient;
PubSubClient client(espClient);

const int trig1 = 5;  const int echo1 = 18;
const int trig2 = 19; const int echo2 = 21;
const int pump1 = 22; const int pump2 = 23;

int JARAK_MIN = 30;   
int JARAK_MAX = 200;  

unsigned long waktuMulaiKondisiKhusus = 0;
bool sedangMenungguSatuMenit = false;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Setting baru diterima!");
  
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload, length);

  if (doc.containsKey("min")) JARAK_MIN = doc["min"];
  if (doc.containsKey("max")) JARAK_MAX = doc["max"];

  Serial.print(" Min:"); Serial.print(JARAK_MIN);
  Serial.print(" Max:"); Serial.println(JARAK_MAX);
}

void setup_wifi() {
  Serial.print("\nConnecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected");
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_WaterLevel")) {
      Serial.println("MQTT Connected");
      client.subscribe(mqtt_topic_settings);
    } else {
      delay(5000);
    }
  }
}

float ambilJarak(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000); 
  if (duration <= 0) return -1;
  return (duration / 2.0) * 0.0343;
}

int hitungPersen(float jarak) {
  if (jarak <= 20) return 100;
  if (jarak >= JARAK_MAX) return 0;
  return (int)(((float)(JARAK_MAX - jarak) / (JARAK_MAX - JARAK_MIN)) * 100);
}

void kirimMQTT(int s1, int s2, int p1, int p2) {
  if (!client.connected()) reconnect();
  String payload = "{\"s1\":" + String(s1) + ",\"s2\":" + String(s2) + ",\"p1\":" + String(p1) + ",\"p2\":" + String(p2) + "}";
  client.publish(mqtt_topic, payload.c_str());
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  pinMode(trig1, OUTPUT); pinMode(echo1, INPUT);
  pinMode(trig2, OUTPUT); pinMode(echo2, INPUT);
  pinMode(pump1, OUTPUT); pinMode(pump2, OUTPUT);
  
  digitalWrite(pump1, HIGH); digitalWrite(pump2, HIGH);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  float totalS1 = 0, totalS2 = 0;
  int countS1 = 0, countS2 = 0;
  unsigned long samplingStart = millis();

  while (millis() - samplingStart < 5000) {
    float d1 = ambilJarak(trig1, echo1);
    if (d1 > 0) { totalS1 += d1; countS1++; }
    delay(40);
    float d2 = ambilJarak(trig2, echo2);
    if (d2 > 0) { totalS2 += d2; countS2++; }
    delay(40);
  }

  int persenS1 = hitungPersen((countS1 > 0) ? (totalS1 / countS1) : 0);
  int persenS2 = hitungPersen((countS2 > 0) ? (totalS2 / countS2) : 0);

  if (persenS1 <= 50 && persenS2 >= 70) {
    digitalWrite(pump1, HIGH); digitalWrite(pump2, LOW);
    if (!sedangMenungguSatuMenit) { waktuMulaiKondisiKhusus = millis(); sedangMenungguSatuMenit = true; }
    if (millis() - waktuMulaiKondisiKhusus >= 10000) {
      do{
        digitalWrite(pump1, HIGH); digitalWrite(pump2, HIGH);
      } while(persenS1 >= 80 && persenS2 >= 80);
       sedangMenungguSatuMenit = false;
    }
  } else if(persenS1 < 50 && persenS2 < 50) {
    digitalWrite(pump1, LOW); digitalWrite(pump2, LOW);
    sedangMenungguSatuMenit = false;
  } else {
    digitalWrite(pump1, HIGH); digitalWrite(pump2, HIGH);
    sedangMenungguSatuMenit = false;
  }

  kirimMQTT(persenS1, persenS2, digitalRead(pump1), digitalRead(pump2));
}