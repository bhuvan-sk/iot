#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <WebSocketsServer.h>
#include <DHT.h>

// WiFi credentials (replace with yours)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Pin definitions
#define DHTPIN 5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define RED_LED 26
#define GREEN_LED 17
#define YELLOW_LED 25
#define BLUE_LED 19

// Servers
AsyncWebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// Timer for DHT
unsigned long lastDHTRead = 0;
const long dhtInterval = 2000;

void sendCORS(AsyncWebServerRequest *request) {
  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "OK");
  response->addHeader("Access-Control-Allow-Origin", "*");
  request->send(response);
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
    Serial.println("Connecting to WiFi...");
  }
  Serial.println(WiFi.localIP());

  // --- REMOVED OLD WiFiServer HTML LOGIC ---
  // Replaced with ESPAsyncWebServer serving the React build

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

  // Handle React Router fallback (if requested file not found, serve index.html)
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html");
  });

  server.begin();
  webSocket.begin();
}

void loop() {
  webSocket.loop();

  if (millis() - lastDHTRead >= dhtInterval) {
    lastDHTRead = millis();
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      String payload = String(t, 1) + "," + String(h, 1);
      webSocket.broadcastTXT(payload);
    }
  }
}
