#include <MFRC522.h>
#include <SPI.h>
#include <esp_task_wdt.h>

#define SS_PIN    5
#define RST_PIN   22 
#define Buzzer    4   
#define But1      12
#define But2      13
#define But3      14
#define But4      27  

#define SCK_PIN   18
#define MISO_PIN  19
#define MOSI_PIN  23  

#define WDT_TIMEOUT 10 
#define SLEEP_TIMEOUT 30000

MFRC522 rfid(SS_PIN, RST_PIN);

String registeredUIDs[] = {"87 E3 C5 01", "70 45 EC 58", "34 5E 25 D9", "C3 93 07 14"};
int currentExpectedPos = 0;
unsigned long lastActivityTime = 0;

void bunyiBuzzer(int durasi) {
  digitalWrite(Buzzer, HIGH);
  delay(durasi);
  digitalWrite(Buzzer, LOW);
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

void tampilkanPesan(int pos, int tombol)
{
  String statusPesan = "";
  switch (tombol)
  {
    case 1: statusPesan = "Aman"; break;
    case 2: statusPesan = "Ada yang rusak"; break;
    case 3: statusPesan = "Ada sesuatu keanehan"; break;
    case 4: statusPesan = "Ada bahaya"; break;
  }

  Serial.println("HASIL LAPORAN:");
  Serial.println("Lokasi: Pos " + String(pos));
  Serial.println("Status: " + statusPesan);
}

void masukDeepSleep() {
  Serial.println("\n[INFO] Sistem Masuk Mode Hemat Daya (Deep Sleep)...");
  delay(100);
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_12, 0); 
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200); 
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);

  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL); 

  pinMode(Buzzer, OUTPUT);
  pinMode(But1, INPUT_PULLUP);
  pinMode(But2, INPUT_PULLUP);
  pinMode(But3, INPUT_PULLUP);
  pinMode(But4, INPUT_PULLUP);

  rfid.PCD_Init();
  Serial.println("===================================");
  Serial.println("Sistem Siap. Silakan tempelkan Tag/Kartu.");
  Serial.println("===================================");
  lastActivityTime = millis();
}

void loop() {
  esp_task_wdt_reset(); 

  if (millis() - lastActivityTime > SLEEP_TIMEOUT) {
    masukDeepSleep();
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  lastActivityTime = millis();
  
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    content.concat(String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " "));
    content.concat(String(rfid.uid.uidByte[i], HEX));
  }
  content.toUpperCase();
  content.trim();

  Serial.print("\nTag Terdeteksi: ");
  Serial.println(content);
  
  int foundIndex = -1;
  for(int i = 0; i < 4; i++) {
    if(content == registeredUIDs[i]) {
      foundIndex = i;
      break;
    }
  }

  if(foundIndex != -1) {
    bunyiBuzzer(200);

    if (foundIndex <= currentExpectedPos) {
      Serial.println("[AKSES DITOLAK] Anda tidak boleh kembali ke Pos sebelumnya!");
      Serial.println("Harus ke Pos: " + String(currentExpectedPos + 1) + " atau setelahnya.");
      bunyiBuzzer(1000);
      delay(500);
      bunyiBuzzer(1000);
      delay(500);
      bunyiBuzzer(1000);
      delay(500);
      bunyiBuzzer(1000);
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    if(foundIndex != currentExpectedPos)
    {
      Serial.println("[PERINGATAN] Urutan tidak sesuai! Seharusnyaa Pos " + String(currentExpectedPos + 1));
    }

    Serial.println("Scan Berhasil di Pos " + String(foundIndex + 1));
    if(foundIndex == 0) {bunyiBuzzer(200);}
    if(foundIndex == 1) {bunyiBuzzer(200); delay(200); bunyiBuzzer(200);}
    if(foundIndex == 2) {bunyiBuzzer(200); delay(200); bunyiBuzzer(200); delay(200); bunyiBuzzer(200);}
    if(foundIndex == 3) {bunyiBuzzer(200); delay(200); bunyiBuzzer(200); delay(200); bunyiBuzzer(200); delay(200); bunyiBuzzer(200);}

    Serial.println("Pilih Laporan (Tombol 1-4)...");
    
    int statusTerpilih = tungguTombol();
    
    if (statusTerpilih == 0) {
      Serial.println("[BATAL] Waktu habis, silakan scan ulang.");
      bunyiBuzzer(500);
    } else {
      tampilkanPesan(foundIndex + 1, statusTerpilih);
      currentExpectedPos = (foundIndex + 1) % 4;
      bunyiBuzzer(100);
    }
  } else {
    Serial.println("[ERROR] Tag Tidak Terdaftar!");
    bunyiBuzzer(1000);
  }
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  Serial.println("------------------------------------");
}