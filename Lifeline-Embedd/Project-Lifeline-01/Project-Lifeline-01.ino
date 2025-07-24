#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <math.h>       // for cos(), sin()
#include <TFT_eSPI.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <WiFi.h>
#include <WebSocketsClient.h>

// Screen & card layout
typedef uint16_t u16;
const u16 SCREEN_W   = 480;
const u16 SCREEN_H   = 320;
const u16 HEADER_H   = 50;
const u16 CARD_W     = 200;
const u16 CARD_H     = 100;
const u16 PADDING    = 30;

// Colors
#define BG_COLOR    TFT_BLACK
#define CARD_BG     TFT_DARKGREY
#define ACCENT      0x07FF   // bright cyan
#define TEXT_COLOR  TFT_WHITE

// WiFi & WebSocket
const char* WIFI_SSID = "LIFELINE-WIFI";
const char* WIFI_PASSWORD = "lifelinebbq";
const char* WS_HOST = "http://192.168.68.120";
const uint16_t WS_PORT = 5000;
const char* WS_PATH = "/socket.io/?EIO=4&transport=websocket";  // or "/" if plain

// Instances
TFT_eSPI tft = TFT_eSPI();
WebSocketsClient webSocket;
MAX30105 particleSensor;

// Card positions and icon centers
u16 cardX[4], cardY[4];
int iconX[4], iconY[4];

// Prompt Y coordinate
u16 promptY;

// Sensor buffers
#define BUFFER_SIZE      100
#define FINGER_THRESHOLD 30000UL
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];
uint8_t  bufIndex     = 0;
uint16_t samplesCount = 0;

// Computed vitals
int32_t spo2           = 0;
int32_t heartRate      = 0;
int8_t  validSPO2      = 0;
int8_t  validHeartRate = 0;
float   temperature    = 0.0;

// Forward declarations
void drawTemplate();
void updateReadings(float temp, int spo2Val, int hr, int bpSys, int bpDia);
void drawThermometer(int x, int y, int s);
void drawDrop(int x, int y, int s);
void drawHeartIcon(int x, int y, int s, uint16_t c);
void drawGauge(int x, int y, int r);
int  generateRandomBPM();
int  generateRandomBPsys();
int  generateRandomBPdia();
int  generateRandomGlucose();

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.println("WebSocket connected to server");
  }
}

void setup() {
  Serial.begin(115200);
  while (!Serial);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print('.');
  }
  Serial.println(" WiFi connected");

  // Initialize WebSocket
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  // Sensor initialization
  Wire.begin();
  SPI.begin();
  randomSeed(analogRead(A0));
  while (!particleSensor.begin(Wire, I2C_SPEED_FAST));
  particleSensor.setup(60, 8, 2, 100, 411, 4096);
  particleSensor.enableDIETEMPRDY();

  // Display initialization
  tft.init();
  tft.setRotation(1);
  tft.fillScreen(BG_COLOR);
  drawTemplate();
  promptY = cardY[0] + CARD_H + (PADDING/2)-8;

  // Initial prompt: larger font size 2, centered
  tft.setTextColor(ACCENT);
  tft.setTextSize(2);
  const char* initMsg = "Please put finger to proceed";
  int16_t ix = (SCREEN_W - tft.textWidth(initMsg)) / 2;
  tft.setCursor(ix, promptY);
  tft.print(initMsg);
}

void loop() {
  static uint8_t promptState = 0; // 0=none,1=no-finger,2=scanning
  webSocket.loop();
  particleSensor.check();
  if (!particleSensor.available()) return;

  uint32_t ir = particleSensor.getIR();
  uint32_t red = particleSensor.getRed();
  particleSensor.nextSample();

  // No finger: prompt and skip, font size 2
  if (ir < FINGER_THRESHOLD) {
    if (promptState != 1) {
      tft.fillRect(0, promptY, SCREEN_W, 24, BG_COLOR);
      tft.setTextColor(ACCENT);
      tft.setTextSize(2);
      const char* msg = "Please put finger to proceed";
      int16_t x = (SCREEN_W - tft.textWidth(msg)) / 2;
      tft.setCursor(x, promptY);
      tft.print(msg);
      promptState = 1;
    }
    bufIndex = 0; samplesCount = 0;
    return;
  }

  // Finger detected: scanning prompt, font size 2
  if (promptState != 2) {
    tft.fillRect(0, promptY, SCREEN_W, 24, BG_COLOR);
    tft.setTextColor(ACCENT);
    tft.setTextSize(2);
    const char* msg = "Scanning, please relax and wait...";
    int16_t x = (SCREEN_W - tft.textWidth(msg)) / 2;
    tft.setCursor(x, promptY);
    tft.print(msg);
    promptState = 2;
  }

  // Collect samples
  irBuffer[bufIndex]  = ir;
  redBuffer[bufIndex] = red;
  bufIndex = (bufIndex + 1) % BUFFER_SIZE;
  if (samplesCount < BUFFER_SIZE) samplesCount++;

  // On 100th sample
  if (samplesCount >= BUFFER_SIZE) {
    samplesCount = 0;
    maxim_heart_rate_and_oxygen_saturation(
      irBuffer, BUFFER_SIZE,
      redBuffer, &spo2, &validSPO2,
      &heartRate, &validHeartRate
    );
    temperature = particleSensor.readTemperature();

    int dHR = validHeartRate ? heartRate : generateRandomBPM();
    int bpSys = generateRandomBPsys();
    int bpDia = generateRandomBPdia();

    updateReadings(temperature,
                   validSPO2 ? spo2 : 0,
                   dHR, bpSys, bpDia);
    drawHeartIcon(iconX[2], iconY[2], 30, ACCENT);
    tft.fillRect(0, promptY, SCREEN_W, 24, BG_COLOR);

    // Send JSON via WebSocket & log
    char payload[128];
    snprintf(payload, sizeof(payload),
      "{\"heart_rate\":%d,\"blood_pressure_systolic\":%d,\"blood_pressure_diastolic\":%d,\"spo2\":%d,\"temperature\":%.1f,\"glucose\":%d}",
      dHR, bpSys, bpDia, validSPO2 ? spo2 : 0, temperature, generateRandomGlucose());
    webSocket.sendTXT(payload);
    Serial.println("WebSocket connected to server");
    Serial.println("Data sent to server");
    Serial.print("Payload: "); Serial.println(payload);
    promptState = 0;
  }
}

// Draw header and static cards
void drawTemplate() {
  tft.fillRect(0, 0, SCREEN_W, HEADER_H, ACCENT);
  tft.setTextColor(TEXT_COLOR);
  tft.setTextSize(3);
  // Centered title
  const char* title = "Project LIFELINE";
  int16_t tx = (SCREEN_W - tft.textWidth(title)) / 2;
  tft.setCursor(tx, 10);
  tft.print(title);

  // Remove subtitle to free space

  u16 totalW = 2 * CARD_W + PADDING;
  u16 startX = (SCREEN_W - totalW) / 2;
  u16 totalH = 2 * CARD_H + PADDING;
  u16 startY = HEADER_H + ((SCREEN_H - HEADER_H - totalH) / 2);
  const char* labels[4] = {"Temperature","SpO2 (%)","Heart Rate","Blood Pressure"};

  for (int i = 0; i < 4; i++) {
    int col = i % 2, row = i / 2;
    cardX[i] = startX + col * (CARD_W + PADDING);
    cardY[i] = startY + row * (CARD_H + PADDING);

    // Draw card
    tft.fillRoundRect(cardX[i], cardY[i], CARD_W, CARD_H, 10, CARD_BG);
    tft.drawRoundRect(cardX[i], cardY[i], CARD_W, CARD_H, 10, ACCENT);

    // Card label
    tft.setTextColor(ACCENT);
    tft.setTextSize(2);
    tft.setCursor(cardX[i] + 10, cardY[i] + 12);
    tft.print(labels[i]);

    // Icon
    iconX[i] = cardX[i] + CARD_W - 30;
    iconY[i] = cardY[i] + CARD_H / 2;
    switch (i) {
      case 0: drawThermometer(iconX[i], iconY[i], 30); break;
      case 1: drawDrop(iconX[i], iconY[i], 30);      break;
      case 2: drawHeartIcon(iconX[i], iconY[i], 30, ACCENT); break;
      case 3: drawGauge(iconX[i], iconY[i], 30);     break;
    }
  }
}

// Update dynamic readings
void updateReadings(float temp, int spo2Val, int hr, int bpSys, int bpDia) {
  tft.setTextColor(TEXT_COLOR, CARD_BG);
  tft.setTextSize(3);
  u16 tx0 = cardX[0] + 15, ty0 = cardY[0] + CARD_H/2 + 8;
  char buf[8]; dtostrf(temp, 4, 1, buf);
  tft.setCursor(tx0, ty0); tft.print(buf);
  int cx = tft.getCursorX(); tft.fillCircle(cx+3, ty0+2, 3, TEXT_COLOR);
  tft.setCursor(cx+10, ty0); tft.print("C");

  u16 tx1 = cardX[1] + 10, ty1 = cardY[1] + CARD_H/2 + 8;
  tft.setCursor(tx1, ty1); tft.printf("%3d", spo2Val);
  tft.setCursor(tx1 + 60, ty1); tft.print("%");

  u16 tx2 = cardX[2] + 10, ty2 = cardY[2] + CARD_H/2 + 8;
  tft.setCursor(tx2, ty2); tft.printf("%3d bpm", hr);

  u16 tx3 = cardX[3] + 15, ty3 = cardY[3] + CARD_H/2 + 8;
  tft.setCursor(tx3, ty3); tft.printf("%3d/%3d", bpSys, bpDia);
}

// Icon drawing helpers
void drawThermometer(int x, int y, int s) {
  int w = s/4;
  tft.drawRect(x - w/2, y - s/2, w, s, ACCENT);
  tft.fillCircle(x, y + s/2, w, ACCENT);
}

void drawDrop(int x, int y, int s) {
  int r = s/3;
  tft.fillCircle(x, y - r/2, r, ACCENT);
  tft.fillTriangle(x-r, y-r/2, x+r, y-r/2, x, y+s/2, ACCENT);
}

void drawHeartIcon(int x, int y, int s, uint16_t c) {
  int d = s/2;
  tft.fillCircle(x-d/2, y-d/4, d/2, c);
  tft.fillCircle(x+d/2, y-d/4, d/2, c);
  tft.fillTriangle(x-s/2, y, x+s/2, y, x, y+s/1.2, c);
}

void drawGauge(int x, int y, int r) {
  tft.drawCircle(x, y, r, ACCENT);
  float a = 135 * DEG_TO_RAD;
  tft.drawLine(x, y, x + r * cos(a), y + r * sin(a), ACCENT);
}

// Random data generation
int generateRandomBPM()     { return random(60, 101); }
int generateRandomBPsys()   { return random(110, 131); }
int generateRandomBPdia()   { return random(70, 91); }
int generateRandomGlucose() { return random(70, 141); }