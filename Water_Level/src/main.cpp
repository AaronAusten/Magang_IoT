/*  ╔══════════════════════════════════════════════════════════════╗
    ║  SAIL IoT — ESP32 Water Level + Water Flow (Gabungan)        ║
    ║  Topic publish : sensor/water_level  & sensor/water_flow     ║
    ║  Topic subscribe: sensor/settings                            ║
    ╚══════════════════════════════════════════════════════════════╝

    PIN MAP:
    ┌─────────────────────────────────────────────────────────┐
    │ HC-SR04 Sensor 1  TRIG → GPIO 5   ECHO → GPIO 18       │
    │ HC-SR04 Sensor 2  TRIG → GPIO 19  ECHO → GPIO 21       │
    │ Relay Pompa 1     → GPIO 22  (ACTIVE LOW)               │
    │ Relay Pompa 2     → GPIO 23  (ACTIVE LOW)               │
    │ Flow Meter        SIGNAL → GPIO 12 (INTERRUPT)          │
    └─────────────────────────────────────────────────────────┘

    PAYLOAD yang dikirim:
    sensor/water_level → {"s1":int,"s2":int,"p1":int,"p2":int}
      s1, s2 = persen ketinggian tangki 1 & 2 (0–100)
      p1, p2 = status pompa: 0=NYALA, 1=MATI (relay aktif-LOW)

    sensor/water_flow  → {"rate":float,"total":int}
      rate  = flow rate L/menit
      total = akumulasi total miliLiter sejak boot

    SETTING yang diterima:
    sensor/settings    → {"min":30,"max":200}
      min = jarak sensor ke air saat tangki PENUH (cm, nilai kecil)
      max = jarak sensor ke air saat tangki KOSONG (cm, nilai besar)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ══ WiFi & MQTT ════════════════════════════════════════════════
const char* WIFI_SSID     = "SAIL-IoT";
const char* WIFI_PASS     = "S1L1wan9i";
const char* MQTT_SERVER   = "192.168.0.211";
const int   MQTT_PORT     = 1883;

// Topic
const char* TOPIC_WL      = "sensor/water_level";   // PUBLISH
const char* TOPIC_WF      = "sensor/water_flow";    // PUBLISH
const char* TOPIC_SETTING = "sensor/settings";      // SUBSCRIBE

// ══ PIN WATER LEVEL ════════════════════════════════════════════
const int TRIG1 = 5;  const int ECHO1 = 18;
const int TRIG2 = 19; const int ECHO2 = 21;
const int PUMP1 = 22; const int PUMP2 = 23;

// ══ PIN WATER FLOW ═════════════════════════════════════════════
const int FLOW_PIN   = 12;
const float CALIB    = 7.5;   // pulse/L → sesuaikan dengan flow meter kamu
                               // YF-S201 = 7.5, YF-B10 = 5.5, dll.

// ══ PARAMETER WATER LEVEL ══════════════════════════════════════
volatile int  JARAK_MIN  = 30;   // cm — jarak sensor ke air saat PENUH
volatile int  JARAK_MAX  = 200;  // cm — jarak sensor ke air saat KOSONG
                                  // (bisa diubah lewat MQTT sensor/settings)

// ══ VARIABEL FLOW METER ════════════════════════════════════════
volatile long pulseCount    = 0;
float         flowRate      = 0.0;
unsigned int  totalMilliL   = 0;
unsigned long lastFlowCheck = 0;

// ══ VARIABEL KONTROL POMPA ═════════════════════════════════════
unsigned long waktuKondisiKhusus  = 0;
bool          sedangTunggu        = false;

// ══ INTERVAL KIRIM DATA ════════════════════════════════════════
unsigned long lastSendWL = 0;
unsigned long lastSendWF = 0;
const unsigned long INTERVAL_WL = 10000;  // Water level kirim tiap 10 detik
const unsigned long INTERVAL_WF = 5000;   // Flow kirim tiap 5 detik

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// ══════════════════════════════════════════════════════════════
//  INTERRUPT — Flow Meter
// ══════════════════════════════════════════════════════════════
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ══════════════════════════════════════════════════════════════
//  CALLBACK — Terima setting dari server lewat MQTT
// ══════════════════════════════════════════════════════════════
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) == TOPIC_SETTING) {
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, payload, length);
    if (err) { Serial.println("JSON parse error"); return; }

    if (doc.containsKey("min")) JARAK_MIN = doc["min"].as<int>();
    if (doc.containsKey("max")) JARAK_MAX = doc["max"].as<int>();

    Serial.printf("⚙️  Setting diperbarui: min=%d cm, max=%d cm\n", JARAK_MIN, JARAK_MAX);
  }
}

// ══════════════════════════════════════════════════════════════
//  WiFi Connect
// ══════════════════════════════════════════════════════════════
void setupWifi() {
  Serial.print("📶 Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
    if (++tries > 30) { Serial.println("\n❌ WiFi gagal, restart..."); ESP.restart(); }
  }
  Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());
}

// ══════════════════════════════════════════════════════════════
//  MQTT Reconnect (non-blocking dengan timeout)
// ══════════════════════════════════════════════════════════════
void reconnectMQTT() {
  if (mqttClient.connected()) return;
  Serial.print("🔌 Connecting MQTT...");
  String clientId = "ESP32_WaterSystem_" + String(random(0xFFFF), HEX);
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println(" ✅ Connected!");
    mqttClient.subscribe(TOPIC_SETTING);
    Serial.println("📥 Subscribe: " + String(TOPIC_SETTING));
  } else {
    Serial.printf(" ❌ Gagal, rc=%d. Coba lagi 5 detik...\n", mqttClient.state());
    delay(5000);
  }
}

// ══════════════════════════════════════════════════════════════
//  Baca Sensor Ultrasonik HC-SR04
// ══════════════════════════════════════════════════════════════
float bacaJarak(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  long dur = pulseIn(echo, HIGH, 30000);  // timeout 30ms (~5 meter)
  if (dur <= 0) return -1.0;             // -1 = tidak valid
  return (dur / 2.0) * 0.0343;          // cm
}

// ══════════════════════════════════════════════════════════════
//  Hitung Persen Tangki dari Jarak Sensor
// ══════════════════════════════════════════════════════════════
int hitungPersen(float jarak) {
  if (jarak <= 0)         return -1;   // invalid
  if (jarak <= JARAK_MIN) return 100;  // overflow / penuh banget
  if (jarak >= JARAK_MAX) return 0;    // kosong
  return (int)(((float)(JARAK_MAX - jarak) / (JARAK_MAX - JARAK_MIN)) * 100.0);
}

// ══════════════════════════════════════════════════════════════
//  Kontrol Logika Pompa
//  Aturan:
//    - s1 <= 50% DAN s2 >= 70% → pompa1 OFF, pompa2 ON (transfer s2→s1)
//    - s1 < 50% DAN s2 < 50%   → kedua pompa ON (isi dari sumber)
//    - kondisi lain              → kedua pompa OFF (aman, standby)
// ══════════════════════════════════════════════════════════════
void kontrolPompa(int s1, int s2) {
  // Kondisi: tangki 1 rendah, tangki 2 cukup → pindahkan air
  if (s1 <= 50 && s2 >= 70) {
    digitalWrite(PUMP1, HIGH);  // Pompa 1 MATI
    digitalWrite(PUMP2, LOW);   // Pompa 2 NYALA (transfer)

    if (!sedangTunggu) {
      waktuKondisiKhusus = millis();
      sedangTunggu = true;
    }
    // Setelah 10 detik kondisi stabil, matikan jika kedua sudah tinggi
    if (millis() - waktuKondisiKhusus >= 10000 && s1 >= 80 && s2 >= 80) {
      digitalWrite(PUMP1, HIGH);
      digitalWrite(PUMP2, HIGH);
      sedangTunggu = false;
    }
  }
  // Kondisi: keduanya rendah → nyalakan kedua pompa
  else if (s1 < 50 && s2 < 50) {
    digitalWrite(PUMP1, LOW);   // Pompa 1 NYALA
    digitalWrite(PUMP2, LOW);   // Pompa 2 NYALA
    sedangTunggu = false;
  }
  // Kondisi normal → matikan semua
  else {
    digitalWrite(PUMP1, HIGH);  // Pompa 1 MATI
    digitalWrite(PUMP2, HIGH);  // Pompa 2 MATI
    sedangTunggu = false;
  }
}

// ══════════════════════════════════════════════════════════════
//  Kirim Data Water Level ke MQTT
//  Format: {"s1":int,"s2":int,"p1":int,"p2":int}
// ══════════════════════════════════════════════════════════════
void kirimWaterLevel(int s1, int s2) {
  if (!mqttClient.connected()) return;

  // Ambil 5 sampel per sensor dan rata-ratakan
  int p1 = digitalRead(PUMP1);
  int p2 = digitalRead(PUMP2);

  StaticJsonDocument<128> doc;
  doc["s1"] = s1;  // persen tangki 1
  doc["s2"] = s2;  // persen tangki 2
  doc["p1"] = p1;  // 0=NYALA (relay LOW), 1=MATI
  doc["p2"] = p2;

  char buf[128];
  serializeJson(doc, buf);
  bool ok = mqttClient.publish(TOPIC_WL, buf, true);  // retained=true

  if (ok) Serial.printf("💧 WL sent: %s\n", buf);
  else    Serial.println("❌ WL publish gagal");
}

// ══════════════════════════════════════════════════════════════
//  Hitung & Kirim Data Water Flow ke MQTT
//  Format: {"rate":float,"total":int}
// ══════════════════════════════════════════════════════════════
void kirimWaterFlow() {
  if (!mqttClient.connected()) return;

  // Hitung flow rate dari pulse count sejak terakhir check
  detachInterrupt(digitalPinToInterrupt(FLOW_PIN));

  unsigned long now     = millis();
  unsigned long elapsed = now - lastFlowCheck;

  if (elapsed > 0) {
    flowRate = ((1000.0 / elapsed) * pulseCount) / CALIB;
  }
  lastFlowCheck = now;

  // Akumulasi total volume
  float flowML    = (flowRate / 60.0) * 1000.0 * (elapsed / 1000.0);
  totalMilliL    += (unsigned int)flowML;

  // Reset counter
  pulseCount = 0;
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);

  StaticJsonDocument<128> doc;
  doc["rate"]  = serialized(String(flowRate, 2));  // L/menit, 2 desimal
  doc["total"] = totalMilliL;                       // total mL sejak boot

  char buf[128];
  serializeJson(doc, buf);
  bool ok = mqttClient.publish(TOPIC_WF, buf, true);

  if (ok) Serial.printf("🌊 WF sent: %s\n", buf);
  else    Serial.println("❌ WF publish gagal");
}

// ══════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n═══════ SAIL IoT — Water System ═══════");

  // Pin Ultrasonik
  pinMode(TRIG1, OUTPUT); pinMode(ECHO1, INPUT);
  pinMode(TRIG2, OUTPUT); pinMode(ECHO2, INPUT);

  // Pin Pompa (relay aktif LOW → HIGH = MATI saat inisialisasi)
  pinMode(PUMP1, OUTPUT); digitalWrite(PUMP1, HIGH);
  pinMode(PUMP2, OUTPUT); digitalWrite(PUMP2, HIGH);

  // Flow meter interrupt
  pinMode(FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), pulseCounter, FALLING);
  lastFlowCheck = millis();

  // Network
  setupWifi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512);

  Serial.println("═══════════════════════════════════════\n");
}

// ══════════════════════════════════════════════════════════════
//  LOOP
// ══════════════════════════════════════════════════════════════
void loop() {
  // Pastikan koneksi tetap ada
  if (WiFi.status() != WL_CONNECTED) setupWifi();
  if (!mqttClient.connected())       reconnectMQTT();
  mqttClient.loop();

  unsigned long now = millis();

  // ─── WATER LEVEL (tiap INTERVAL_WL) ────────────────────────
  if (now - lastSendWL >= INTERVAL_WL) {
    lastSendWL = now;

    // Ambil rata-rata beberapa sampel (kurangi noise)
    float totalS1 = 0, totalS2 = 0;
    int   cntS1   = 0, cntS2   = 0;

    for (int i = 0; i < 5; i++) {
      float d1 = bacaJarak(TRIG1, ECHO1);
      if (d1 > 0) { totalS1 += d1; cntS1++; }
      delay(50);
      float d2 = bacaJarak(TRIG2, ECHO2);
      if (d2 > 0) { totalS2 += d2; cntS2++; }
      delay(50);
    }

    int s1 = (cntS1 > 0) ? hitungPersen(totalS1 / cntS1) : -1;
    int s2 = (cntS2 > 0) ? hitungPersen(totalS2 / cntS2) : -1;

    // Hanya proses pompa jika kedua sensor valid
    if (s1 >= 0 && s2 >= 0) {
      kontrolPompa(s1, s2);
      kirimWaterLevel(s1, s2);
    } else {
      Serial.println("⚠️  Sensor ultrasonik tidak terbaca, pompa tidak diubah");
    }
  }

  // ─── WATER FLOW (tiap INTERVAL_WF) ─────────────────────────
  if (now - lastSendWF >= INTERVAL_WF) {
    lastSendWF = now;
    kirimWaterFlow();
  }

  delay(10);  // yield agar MQTT loop tetap responsif
}