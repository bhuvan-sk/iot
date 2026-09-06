#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <WebSocketsServer.h>
#include <DHT.h>

// WiFi credentials (replace with yours)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ---------------------------------------------------------- DHT11 sensor ---
#define DHTPIN 5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ------------------------------------------------------------------ LEDs ---
#define RED_LED 26
#define GREEN_LED 17
#define YELLOW_LED 25
#define BLUE_LED 19

// ----------------------------------------------- HC-SR04 ultrasonic ------
#define TRIG_PIN 18
#define ECHO_PIN 16
const unsigned long ULTRASONIC_TIMEOUT_US = 25000UL;
const float ULTRASONIC_MAX_CM = 400.0f;
const float ULTRASONIC_MIN_CM = 2.0f;
const unsigned long ULTRASONIC_INTERVAL_MS = 50;

// -------------------------------------------------------- LDR / GPIO 34 ---
#define LDR_PIN 34
const int LDR_SAMPLES     = 16;
const int LDR_VALID_MIN   = 15;
const int LDR_VALID_MAX   = 4080;
const int LDR_MAX_SPREAD  = 500;
const unsigned long LDR_INTERVAL_MS = 500;

// -------------------------------------------------------- PIR / GPIO 27 ---
#define PIR_PIN 27
const uint8_t PIR_PIN_MODE = INPUT_PULLDOWN;
const unsigned long PIR_INTERVAL_MS = 50;
const unsigned long PIR_HOLD_MS = 2500;
const unsigned long PIR_LATCH_TTL_MS = 5000;
const unsigned long PIR_WARMUP_MS = 30000UL;

// Servers
AsyncWebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// Cached readings
float lastTemperature   = NAN;
float lastHumidity      = NAN;
float lastDistanceCm    = -1.0f;
int   lastLightValue    = -1;
bool  lightAvailable    = false;

bool  motionHeld        = false;
bool  motionSeen        = false;
bool  motionLatchHttp   = false;
bool  motionLatchWs     = false;
bool  pirWarm           = false;
unsigned long lastMotionHighMs = 0;

unsigned long lastDHTRead        = 0;
unsigned long lastUltrasonicRead = 0;
unsigned long lastLdrRead        = 0;
unsigned long lastPirRead        = 0;
unsigned long lastWsBroadcast    = 0;

const long dhtInterval = 2000;
const unsigned long WS_MOTION_MIN_GAP_MS = 500;

void sendCORS(AsyncWebServerRequest *request) {
  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "OK");
  response->addHeader("Access-Control-Allow-Origin", "*");
  request->send(response);
}

// ------------------------------------------------------------- Sampling ---

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) return -1.0f;

  float cm = duration / 58.0f;
  if (cm < ULTRASONIC_MIN_CM || cm > ULTRASONIC_MAX_CM) return -1.0f;
  return cm;
}

void readLdr() {
  int minV = 4095;
  int maxV = 0;
  long sum = 0;

  for (int i = 0; i < LDR_SAMPLES; i++) {
    int v = analogRead(LDR_PIN);
    sum += v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
    delay(1);
  }

  int mean   = (int)(sum / LDR_SAMPLES);
  int spread = maxV - minV;

  bool plausible = (mean > LDR_VALID_MIN) &&
                   (mean < LDR_VALID_MAX) &&
                   (spread < LDR_MAX_SPREAD);

  if (plausible != lightAvailable) {
    Serial.printf("[LDR] sensor %s (mean=%d spread=%d)\n",
                  plausible ? "DETECTED" : "not detected", mean, spread);
  }

  lightAvailable = plausible;
  lastLightValue = plausible ? mean : -1;
}

void readPir() {
  unsigned long now = millis();

  if (!pirWarm) {
    if (now < PIR_WARMUP_MS) return;
    pirWarm = true;
    Serial.println("[PIR] warm-up complete, GPIO 27 live");
  }

  if (digitalRead(PIR_PIN) == HIGH) {
    if (!motionSeen) {
      Serial.println("[PIR] first HIGH seen on GPIO 27 - sensor is wired");
      motionSeen = true;
    }
    motionLatchHttp = true;
    motionLatchWs = true;
    lastMotionHighMs = now;
  }

  motionHeld = motionSeen && (now - lastMotionHighMs < PIR_HOLD_MS);

  if (motionSeen && now - lastMotionHighMs >= PIR_LATCH_TTL_MS) {
    motionLatchHttp = false;
    motionLatchWs = false;
  }
}

// ---------------------------------------------------------- Broadcasting ---

void broadcastSensors() {
  String payload = (isnan(lastTemperature) ? String("nan") : String(lastTemperature, 1));
  payload += ",";
  payload += (isnan(lastHumidity) ? String("nan") : String(lastHumidity, 1));
  payload += ",";
  payload += (motionHeld || motionLatchWs) ? "1" : "0";

  motionLatchWs = false;
  lastWsBroadcast = millis();
  webSocket.broadcastTXT(payload);
}

// -------------------------------------------------------------- Routes ---

void handleSensors(AsyncWebServerRequest *request) {
  String json = "{";

  json += "\"temperature\":";
  json += isnan(lastTemperature) ? "null" : String(lastTemperature, 1);

  json += ",\"humidity\":";
  json += isnan(lastHumidity) ? "null" : String(lastHumidity, 1);

  json += ",\"distance\":";
  json += (lastDistanceCm < 0) ? "null" : String(lastDistanceCm, 1);
  json += ",\"distanceValid\":";
  json += (lastDistanceCm < 0) ? "false" : "true";

  json += ",\"ldr\":";
  json += lightAvailable ? String(lastLightValue) : "null";
  json += ",\"ldrAvailable\":";
  json += lightAvailable ? "true" : "false";

  json += ",\"ldrMax\":4095";

  json += ",\"motion\":";
  json += (motionHeld || motionLatchHttp) ? "true" : "false";
  json += ",\"motionSensorAvailable\":";
  json += pirWarm ? "true" : "false";
  motionLatchHttp = false;

  json += ",\"uptimeMs\":";
  json += String(millis());
  json += "}";

  AsyncWebServerResponse *response = request->beginResponse(200, "application/json", json);
  response->addHeader("Access-Control-Allow-Origin", "*");
  request->send(response);
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    IPAddress ip = webSocket.remoteIP(num);
    Serial.printf("[WS] client %u connected from %s\n", num, ip.toString().c_str());
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("[WS] client %u disconnected\n", num);
  }
}

void setup() {
  Serial.begin(115200);

  // Initialize Pins
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
  
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(BLUE_LED, LOW);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  pinMode(PIR_PIN, PIR_PIN_MODE);

  analogReadResolution(12);
  analogSetPinAttenuation(LDR_PIN, ADC_11db);

  dht.begin();

  // Initialize LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("An Error has occurred while mounting LittleFS");
    return;
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println(WiFi.localIP());

  // Serve static files from LittleFS
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  // API Endpoints for LEDs
  server.on("/red/on", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(RED_LED, HIGH);
    sendCORS(request);
  });
  server.on("/red/off", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(RED_LED, LOW);
    sendCORS(request);
  });

  server.on("/green/on", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(GREEN_LED, HIGH);
    sendCORS(request);
  });
  server.on("/green/off", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(GREEN_LED, LOW);
    sendCORS(request);
  });

  server.on("/yellow/on", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(YELLOW_LED, HIGH);
    sendCORS(request);
  });
  server.on("/yellow/off", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(YELLOW_LED, LOW);
    sendCORS(request);
  });

  server.on("/blue/on", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(BLUE_LED, HIGH);
    sendCORS(request);
  });
  server.on("/blue/off", HTTP_GET, [](AsyncWebServerRequest *request){
    digitalWrite(BLUE_LED, LOW);
    sendCORS(request);
  });

  server.on("/sensors", HTTP_GET, handleSensors);

  // Handle React Router fallback (if requested file not found, serve index.html)
  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) {
      sendCORS(request);
      return;
    }
    request->send(LittleFS, "/index.html", "text/html");
  });

  server.begin();
  
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  
  readLdr();
  lastDistanceCm = readDistanceCm();
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();

  // ---- PIR: polled first and fastest. ----
  bool motionBefore = motionHeld;
  if (now - lastPirRead >= PIR_INTERVAL_MS) {
    lastPirRead = now;
    readPir();
  }

  // ---- DHT11 ----
  if (now - lastDHTRead >= dhtInterval) {
    lastDHTRead = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      lastTemperature = t;
      lastHumidity = h;
    }
    broadcastSensors();
  }

  // ---- Motion edge ----
  if (motionHeld != motionBefore && now - lastWsBroadcast >= WS_MOTION_MIN_GAP_MS) {
    broadcastSensors();
  }

  // ---- Ultrasonic ----
  if (now - lastUltrasonicRead >= ULTRASONIC_INTERVAL_MS) {
    lastUltrasonicRead = now;
    lastDistanceCm = readDistanceCm();

    // High-frequency telemetry for gesture engine
    char wsBuf[32];
    if (lastDistanceCm < 0) {
      snprintf(wsBuf, sizeof(wsBuf), "U,0.0,0");
    } else {
      snprintf(wsBuf, sizeof(wsBuf), "U,%.1f,1", lastDistanceCm);
    }
    webSocket.broadcastTXT(wsBuf);
  }

  // ---- LDR ----
  if (now - lastLdrRead >= LDR_INTERVAL_MS) {
    lastLdrRead = now;
    readLdr();
  }
}
