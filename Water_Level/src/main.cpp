#include <Arduino.h>

const int trig1 = 5;  const int echo1 = 18;
const int trig2 = 19; const int echo2 = 21;
const int pump1 = 22; const int pump2 = 23;

const int JARAK_MIN = 30;   // 100%
const int JARAK_MAX = 200;  // 0%

unsigned long waktuMulaiKondisiKhusus = 0;
bool sedangMenungguSatuMenit = false;

void setup() {
  Serial.begin(115200);
  pinMode(trig1, OUTPUT); pinMode(echo1, INPUT);
  pinMode(trig2, OUTPUT); pinMode(echo2, INPUT);
  pinMode(pump1, OUTPUT); pinMode(pump2, OUTPUT);
  
  digitalWrite(pump1, HIGH); 
  digitalWrite(pump2, HIGH);
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
  if (jarak <= 20) return 100; // Proteksi jika terlalu dekat
  if (jarak >= JARAK_MAX) return 0;
  return (int)(((float)(JARAK_MAX - jarak) / (JARAK_MAX - JARAK_MIN)) * 100);
}

void loop() {
  float totalS1 = 0, totalS2 = 0;
  int countS1 = 0, countS2 = 0;
  unsigned long samplingStart = millis();

  // Sampling 5 detik agar stabil
  while (millis() - samplingStart < 5000) {
    float d1 = ambilJarak(trig1, echo1);
    if (d1 > 0) { totalS1 += d1; countS1++; }
    delay(40);
    float d2 = ambilJarak(trig2, echo2);
    if (d2 > 0) { totalS2 += d2; countS2++; }
    delay(40);
  }

  float avgS1 = (countS1 > 0) ? (totalS1 / countS1) : 0;
  float avgS2 = (countS2 > 0) ? (totalS2 / countS2) : 0;
  int persenS1 = hitungPersen(avgS1);
  int persenS2 = hitungPersen(avgS2);

  // Tampilan Serial yang Informatif
  Serial.print("Jarak 1: "); Serial.print(avgS1); Serial.print("cm ("); Serial.print(persenS1); Serial.print("%) | ");
  Serial.print("Jarak 2: "); Serial.print(avgS2); Serial.print("cm ("); Serial.print(persenS2); Serial.println("%)");

  // --- LOGIKA POMPA ---
  if (persenS1 <= 50 && persenS2 >= 70) {
    digitalWrite(pump1, HIGH); digitalWrite(pump2, LOW);
    Serial.println("Sensor 1 rendah, Sensor 2 tinggi: Pompa 1 ON, Pompa 2 OFF");
    if (!sedangMenungguSatuMenit) {
      waktuMulaiKondisiKhusus = millis();
      sedangMenungguSatuMenit = true;
    }
    if (millis() - waktuMulaiKondisiKhusus >= 10000) {
      Serial.println("Kondisi khusus terpenuhi selama 10 detik, kedua pompa menyala.");
      do {
      digitalWrite(pump1, HIGH);
      digitalWrite(pump2, HIGH);
      Serial.println("Sensor 1 sudah cukup penuh, mematikan pompa 1.");
      } while (persenS1 >= 70);
      sedangMenungguSatuMenit = false;
    }
  }
  else if(persenS1 < 50 && persenS2 < 50) {
    digitalWrite(pump1, LOW); digitalWrite(pump2, LOW);
    sedangMenungguSatuMenit = false;
    Serial.println("Kedua sensor rendah: Pompa 1 ON, Pompa 2 ON");
  }
  else {
    digitalWrite(pump1, HIGH); digitalWrite(pump2, HIGH);
    sedangMenungguSatuMenit = false;
    Serial.println("Kondisi normal: Pompa 1 OFF, Pompa 2 OFF");
  }
}