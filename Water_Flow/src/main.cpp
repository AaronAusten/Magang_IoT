#include <Arduino.h>

const int SENSOR_PIN = 12;
volatile long pulseCount = 0;

float flowRate = 0.0;
float flowMilliLitres = 0;
unsigned int totalMilliLitres = 0;
unsigned long oldTime = 0;

float calibrationFactor = 7.5; 

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  
  attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), pulseCounter, FALLING);
}

void loop() {
  if ((millis() - oldTime) > 1000) {
    
    detachInterrupt(digitalPinToInterrupt(SENSOR_PIN));
    
    flowRate = ((1000.0 / (millis() - oldTime)) * pulseCount) / calibrationFactor;
    
    oldTime = millis();
    
    flowMilliLitres = (flowRate / 60) * 1000;
    totalMilliLitres += flowMilliLitres;
    
    Serial.print("Flow rate: ");
    Serial.print(flowRate);
    Serial.print(" L/min");
    Serial.print("\t Total: ");
    Serial.print(totalMilliLitres);
    Serial.println(" mL");

    pulseCount = 0;
    
    attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), pulseCounter, FALLING);
  }
}