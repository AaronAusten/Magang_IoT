#include <WiFi.h>
#include <PubSubClient.h>
#include <MFRC522.h>
#include <SPI.h>
#include <esp_task_wdt.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const char* ssid = "SAIL-IoT";
const char* password = "S1L1wan9i";
const char* mqtt_server = "192.168.0.211";
const char* mqtt_topic = "patroli/laporan";

WiFiClient espClient;
PubSubClient client(espClient);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
  
#define SS_PIN     5
#define RST_PIN    22 
#define Buzzer     4   
#define But1       12
#define But2       13
#define But3       14
#define But4       27  

#define SCK_PIN    18
#define MISO_PIN   19
#define MOSI_PIN   23  

#define WDT_TIMEOUT 10 
#define SLEEP_TIMEOUT 30000

MFRC522 rfid(SS_PIN, RST_PIN);

String registeredUIDs[] = {"87 E3 C5 01", "70 45 EC 58", "34 5E 25 D9", "C3 93 07 14"};

RTC_DATA_ATTR int currentExpectedPos = 0; 
unsigned long lastActivityTime = 0;

void displayMsg(String line1, String line2 = "") {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println(line1);
  display.setCursor(0, 20);
  display.println(line2);
  display.display();
}

void bunyiBuzzer(int durasi) {
  digitalWrite(Buzzer, HIGH);
  delay(durasi);
  digitalWrite(Buzzer, LOW);
}

void setup_wifi() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("CONNECTING WIFI...");
  display.display();

  WiFi.begin(ssid, password);
  int attempt = 0;
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    display.print(".");
    display.display();
    attempt++;
    
    if(attempt > 20) {
      display.clearDisplay();
      display.setCursor(0,0);
      display.println("WIFI ERROR!");
      display.println("Check Router...");
      display.display();
      delay(2000);
      attempt = 0;
    }
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WIFI CONNECTED!");
  display.println("IP: " + WiFi.localIP().toString());
  display.display();
  delay(1500);
}

void reconnect() {
  while (!client.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
      setup_wifi();
    }

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("CONNECTING MQTT...");
    display.println("Server: 192.168.0.211");
    display.display();

    String clientId = "ESP32-Patroli-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      display.println("MQTT READY!");
      display.display();
      delay(1000);
    } else {
      display.println("FAILED :(");
      display.print("RC: "); display.println(client.state());
      display.println("Try in 5s...");
      display.display();
      delay(5000);
    }
  }
}

void masukDeepSleep() {
  displayMsg("SLEEP MODE", "Tekan But1-Wake");
  delay(2000);
  display.ssd1306_command(SSD1306_DISPLAYOFF);
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_12, 0); 
  esp_deep_sleep_start();
}

void selesaiPatroli() {
  displayMsg("PATROLI SELESAI", "Sampai Jumpa!");
  for(int i = 0; i < 3; i++) {
    bunyiBuzzer(100); delay(100);
    bunyiBuzzer(500); delay(200);
  }
  currentExpectedPos = 0; 
  delay(5000);
  masukDeepSleep();
}

int tungguTombol() {
  unsigned long startWait = millis();
  while (true) {
    esp_task_wdt_reset();
    if (millis() - startWait > 10000) return 0; 

    if (digitalRead(But1) == LOW) { delay(150); return 1; }
    if (digitalRead(But2) == LOW) { delay(150); return 2; }
    if (digitalRead(But3) == LOW) { delay(150); return 3; }
    if (digitalRead(But4) == LOW) { delay(150); return 4; }
  }
}

void kirimDataMQTT(int pos, int tombol) {
  String statusPesan = "";
  switch (tombol) {
    case 1: statusPesan = "Aman"; break;
    case 2: statusPesan = "Rusak"; break;
    case 3: statusPesan = "Aneh"; break;
    case 4: statusPesan = "Bahaya"; break;
  }

  if (!client.connected()) reconnect();
  
  String payload = "{\"pos\":" + String(pos) + ", \"status\":\"" + statusPesan + "\"}";
  client.publish(mqtt_topic, payload.c_str());

  Serial.println("SENT TO MQTT: " + payload);
  displayMsg("DATA TERKIRIM", "Pos:" + String(pos) + " " + statusPesan);
  delay(2000);
}

void setup() {
  Serial.begin(115200);

  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { for(;;); }
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  reconnect();

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { for(;;); }
  display.clearDisplay();
  display.setTextColor(WHITE);
  
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL); 

  pinMode(Buzzer, OUTPUT);
  pinMode(But1, INPUT_PULLUP);
  pinMode(But2, INPUT_PULLUP);
  pinMode(But3, INPUT_PULLUP);
  pinMode(But4, INPUT_PULLUP);

  displayMsg("SISTEM READY", "Tunggu Pos: " + String(currentExpectedPos + 1));

  rfid.PCD_Init();
  lastActivityTime = millis();
}

void loop() {
  rfid.PCD_Init();
  if (!client.connected()) reconnect();
  client.loop();
  esp_task_wdt_reset(); 

  if (millis() - lastActivityTime > SLEEP_TIMEOUT) {
    masukDeepSleep();
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  lastActivityTime = millis();
  
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    content.concat(String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " "));
    content.concat(String(rfid.uid.uidByte[i], HEX));
  }
  content.toUpperCase(); content.trim();

  int foundIndex = -1;
  for(int i = 0; i < 4; i++) {
    if(content == registeredUIDs[i]) { foundIndex = i; break; }
  }

  if(foundIndex != -1) {
    if (foundIndex != currentExpectedPos) {
      displayMsg("URUTAN SALAH!", "Harus Pos " + String(currentExpectedPos + 1));
      for(int j=0; j<3; j++){ bunyiBuzzer(500); delay(200); }
    } 
    else {
      displayMsg("POS " + String(foundIndex + 1) + " OK", "Pilih Tombol 1-4");
      for(int i = 0; i <= foundIndex; i++) { bunyiBuzzer(200); delay(100); }

      int tombol = tungguTombol();
      if (tombol == 0) {
        displayMsg("TIMEOUT", "Scan Ulang Pos " + String(foundIndex + 1));
        bunyiBuzzer(500);
      } else {
        kirimDataMQTT(foundIndex + 1, tombol);
        currentExpectedPos++; 
        if (currentExpectedPos >= 4) { 
          selesaiPatroli();
        } else {
          displayMsg("SISTEM READY", "Lanjut ke Pos: " + String(currentExpectedPos + 1));
          bunyiBuzzer(100);
        }
      }
    }
  } else {
    displayMsg("INVALID TAG", "Gunakan Kartu Pos");
    bunyiBuzzer(1000);
  }
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}