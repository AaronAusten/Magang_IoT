#include<Arduino.h>

const int trig1 = 5, echo1 = 18;
const int trig2 = 19, echo2 = 21;
const int pump1 = 22, pump2 = 23;

const int JARAK_MAX = 30; 
const int JARAK_MIN = 5; 

unsigned long timerPompa2 = 0;
bool modeSiagaPompa2 = false;

void setup() {
  Serial.begin(115200);
  pinMode(trig1, OUTPUT); pinMode(echo1, INPUT);
  pinMode(trig2, OUTPUT); pinMode(echo2, INPUT);
  pinMode(pump1, OUTPUT); pinMode(pump2, OUTPUT);
  
  digitalWrite(pump1, HIGH); 
  digitalWrite(pump2, HIGH);
}

float getPercentage(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  
  long duration = pulseIn(echo, HIGH);
  float distance = duration * 0.034 / 2;
  
  float percent = map(distance, JARAK_MAX, JARAK_MIN, 0, 100);
  return constrain(percent, 0, 100);
}

void loop() {
  float level1 = getPercentage(trig1, echo1);
  float level2 = getPercentage(trig2, echo2);

  Serial.printf("Level 1: %.2f%% | Level 2: %.2f%%\n", level1, level2);

  if (level1 < 70) {
    digitalWrite(pump1, LOW);
    
    if (!modeSiagaPompa2) {
      timerPompa2 = millis();
      modeSiagaPompa2 = true;
    }

    if ((millis() - timerPompa2 >= 30000) || (level1 <= 40)) {
      digitalWrite(pump2, LOW);
    }
  } else {
    digitalWrite(pump1, HIGH);
    digitalWrite(pump2, HIGH);
    modeSiagaPompa2 = false;
  }

  delay(1000); 
}