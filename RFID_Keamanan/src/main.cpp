#include <MFRC522.h>
#include <SPI.h>
#include <esp_task_wdt.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define SS_PIN     5
#define RST_PIN    22 // Disarankan pakai 22 agar pin 15 tidak ganggu booting
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

// Data kartu (Pos 1, Pos 2, Pos 3, Pos 4)
String registeredUIDs[] = {"87 E3 C5 01", "70 45 EC 58", "34 5E 25 D9", "C3 93 07 14"};

// PENTING: Menggunakan RTC_DATA_ATTR agar posisi tersimpan saat Deep Sleep
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

void selesaiPatroli() {
  display.clearDisplay();
  display.setCursor(0, 10);
  display.println("PATROLI SELESAI");
  display.println("");
  display.println("Terima kasih,");
  display.println("Sampai jumpa besok!");
  display.display();

  for(int i = 0; i < 3; i++) {
    bunyiBuzzer(100); delay(100);
    bunyiBuzzer(100); delay(100);
    bunyiBuzzer(500); delay(300);
  }

  Serial.println("\n[INFO] Semua Pos selesai. Reset ke Pos 1 untuk besok.");
  currentExpectedPos = 0; // Reset urutan untuk sesi berikutnya
  delay(5000);
  display.ssd1306_command(SSD1306_DISPLAYOFF);
  esp_deep_sleep_start(); // Mati total, bangun via tombol Reset
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

void tampilkanPesan(int pos, int tombol) {
  String statusPesan = "";
  switch (tombol) {
    case 1: statusPesan = "Aman"; break;
    case 2: statusPesan = "Rusak"; break;
    case 3: statusPesan = "Aneh"; break;
    case 4: statusPesan = "Bahaya"; break;
  }
  Serial.println("LAPORAN: Pos " + String(pos) + " -> " + statusPesan);
  displayMsg("LAPORAN TERKIRIM", "Pos:" + String(pos) + " " + statusPesan);
  delay(2000);
}

void masukDeepSleep() {
  displayMsg("SLEEP MODE", "Tekan But1-Wake");
  delay(1000);
  display.ssd1306_command(SSD1306_DISPLAYOFF);
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_12, 0); 
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200); 
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    for(;;);
  }
  display.clearDisplay();
  display.setTextColor(WHITE);
  
  // Jika baru mulai/reset, tampilkan pos yang ditunggu
  displayMsg("SISTEM READY", "Tunggu Pos: " + String(currentExpectedPos + 1));

  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL); 

  pinMode(Buzzer, OUTPUT);
  pinMode(But1, INPUT_PULLUP);
  pinMode(But2, INPUT_PULLUP);
  pinMode(But3, INPUT_PULLUP);
  pinMode(But4, INPUT_PULLUP);

  rfid.PCD_Init();
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
  content.toUpperCase(); content.trim();

  int foundIndex = -1;
  for(int i = 0; i < 4; i++) {
    if(content == registeredUIDs[i]) { foundIndex = i; break; }
  }

  if(foundIndex != -1) {
    // LOGIKA KRUSIAL: Harus sesuai urutan tepat (foundIndex harus sama dengan currentExpectedPos)
    if (foundIndex != currentExpectedPos) {
      displayMsg("URUTAN SALAH!", "Harus Pos " + String(currentExpectedPos + 1));
      Serial.println("[DITOLAK] Salah urutan. Menunggu Pos " + String(currentExpectedPos + 1));
      
      // Bunyi peringatan salah
      for(int j=0; j<3; j++){ bunyiBuzzer(500); delay(200); }
      
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return; 
    } 
    else {
      // Jika urutan benar
      displayMsg("POS " + String(foundIndex + 1) + " OK", "Pilih Tombol 1-4");
      
      // Feedback suara sesuai nomor pos
      for(int i = 0; i <= foundIndex; i++) {
        bunyiBuzzer(200); delay(100);
      }

      int statusTerpilih = tungguTombol();
      
      if (statusTerpilih == 0) {
        displayMsg("TIMEOUT", "Scan Ulang Pos " + String(foundIndex + 1));
        bunyiBuzzer(500);
      } else {
        tampilkanPesan(foundIndex + 1, statusTerpilih);

        // Update target ke pos berikutnya
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