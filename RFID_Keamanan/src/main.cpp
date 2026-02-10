#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <MFRC522.h>
#include <SPI.h>
#include <esp_task_wdt.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define WIFI_SSID "Aaron Austen"
#define WIFI_PASSWORD "        "
#define API_KEY "AIzaSyCzts9Ts2ZzjSFt-_1L0NWXxGfEdPo9zkM"
#define DATABASE_URL "https://sail-iot-default-rtdb.asia-southeast1.firebasedatabase.app"

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

#define WDT_TIMEOUT 15 
#define SLEEP_TIMEOUT 30000

MFRC522 rfid(SS_PIN, RST_PIN);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "id.pool.ntp.org", 7 * 3600);

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

void bunyiBuzzer(int kali, int durasi = 200) {
  for(int i = 0; i < kali; i++) {
    digitalWrite(Buzzer, HIGH);
    delay(durasi);
    digitalWrite(Buzzer, LOW);
    if(kali > 1) delay(100);
  }
}

void kirimKeFirebase(int pos, String status, String date, String time) {
  FirebaseJson json;
  json.add("pos", pos);
  json.add("status", status);
  json.add("tanggal", date);
  json.add("waktu", time);

  displayMsg("MENGIRIM DATA...", "Harap Tunggu");
  if (Firebase.RTDB.pushJSON(&fbdo, "/patroli_log", &json)) {
    Serial.println("Sent to Firebase!");
  } else {
    Serial.println(fbdo.errorReason());
  }
}

void selesaiPatroli() {
  displayMsg("TERIMA KASIH", "Sampai Jumpa Besok");
  bunyiBuzzer(3, 400);
  currentExpectedPos = 0;
  delay(5000);
  display.ssd1306_command(SSD1306_DISPLAYOFF);
  esp_deep_sleep_start();
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

void setup() {
  Serial.begin(115200);
  
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) for(;;);
  display.setTextColor(WHITE);
  displayMsg("CONNECTING WIFI", WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  timeClient.begin();

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  pinMode(Buzzer, OUTPUT);
  pinMode(But1, INPUT_PULLUP);
  pinMode(But2, INPUT_PULLUP);
  pinMode(But3, INPUT_PULLUP);
  pinMode(But4, INPUT_PULLUP);

  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL); 
  
  displayMsg("SISTEM READY", "Tunggu Pos: " + String(currentExpectedPos + 1));
  lastActivityTime = millis();
}

void loop() {
  esp_task_wdt_reset(); 
  timeClient.update();

  if (millis() - lastActivityTime > SLEEP_TIMEOUT) {
    displayMsg("SLEEP MODE", "Tekan Reset/But1");
    delay(1000);
    display.ssd1306_command(SSD1306_DISPLAYOFF);
    esp_sleep_enable_ext0_wakeup(GPIO_NUM_12, 0); 
    esp_deep_sleep_start();
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
      bunyiBuzzer(3, 500);
    } 
    else {
      displayMsg("POS " + String(foundIndex + 1) + " OK", "Pilih Laporan...");
      bunyiBuzzer(foundIndex + 1);
      
      int tombol = tungguTombol();
      if (tombol == 0) {
        displayMsg("TIMEOUT", "Scan Ulang");
      } else {
        time_t rawtime = timeClient.getEpochTime();
        struct tm * ti = localtime(&rawtime);
        char dateFormatted[15];
        sprintf(dateFormatted, "%02d%02d%04d", ti->tm_mday, ti->tm_mon + 1, ti->tm_year + 1900);
        
        String statusTxt[] = {"", "Aman", "Rusak", "Aneh", "Bahaya"};
        kirimKeFirebase(foundIndex + 1, statusTxt[tombol], String(dateFormatted), timeClient.getFormattedTime());
        
        currentExpectedPos++; 
        if (currentExpectedPos >= 4) selesaiPatroli();
        else displayMsg("LAPORAN OK!", "Lanjut ke Pos " + String(currentExpectedPos + 1));
      }
    }
  } else {
    displayMsg("INVALID TAG", content);
    bunyiBuzzer(1, 1000);
  }
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}