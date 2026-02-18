#include "DHT.h"

#define DHTPIN 27  // Pastikan pakai Pin I/O (bukan 35)
#define DHTTYPE DHT22
#define MICS_PIN 34

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println("--- System Ready ---");
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  // Membaca Sensor Gas (Smoothing sederhana)
  int rawADC = 0;
  for(int i=0; i<10; i++) { // Ambil 10 sampel agar lebih stabil
    rawADC += analogRead(MICS_PIN);
    delay(10);
  }
  rawADC /= 10;

  String kualitas;
  
  // Logika Kategori (Bisa kamu sesuaikan)
  if (rawADC < 50)         kualitas = "SANGAT BERSIH";
  else if (rawADC < 500)   kualitas = "NORMAL / AMAN";
  else if (rawADC < 1500)  kualitas = "TERDETEKSI GAS";
  else                     kualitas = "BAHAYA / POLUSI TINGGI";

  // --- Tampilan Header ---
  Serial.println("\n===== MONITORING LINGKUNGAN =====");
  
  // Tampilan Suhu & Kelembapan
  Serial.print("  [THERMO]  Suhu: "); Serial.print(t, 1); Serial.print("C | ");
  Serial.print("Lembap: "); Serial.print(h, 1); Serial.println("%");

  // Tampilan Sensor Gas
  Serial.print("  [GAS]     Status: "); Serial.println(kualitas);
  Serial.print("            Level : [");
  
  // Membuat Progress Bar Sederhana
  int barWidth = map(rawADC, 0, 4095, 0, 20);
  for (int i=0; i<20; i++) {
    if (i < barWidth) Serial.print("=");
    else Serial.print(".");
  }
  Serial.print("] "); Serial.print(rawADC); Serial.println(" pts");
  
  Serial.println("=================================");

  delay(2000);
}