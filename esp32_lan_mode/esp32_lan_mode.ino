/*
 * LAN MODE  -  ESP32 as a headless IoT device.
 *
 * The React dashboard runs on your computer under Vite (http://localhost:5173)
 * and talks to this board across the Wi-Fi network. The ESP32 serves NO web
 * UI in this phase:
 *
 *   - no LittleFS
 *   - no ESPAsyncWebServer
 *   - no index.html / React assets
 *
 * It only does two jobs:
 *
 *   HTTP  :80   GET /<red|green|yellow|blue>/<on|off>   -> drives a GPIO
 *   WS    :81   broadcasts "temperature,humidity" every 2s  e.g. 29.3,47.0
 *
 * Libraries: WiFi.h and WebServer.h ship with the ESP32 core, so the only
 * external dependencies are the two you already have - WebSockets (Markus
 * Sattler) and DHT sensor library (Adafruit).
 *
 * WIRING
 *   DHT11   DATA = GPIO 5, VCC = 3.3V, GND = GND
 *   Red LED    = GPIO 26
 *   Green LED  = GPIO 17
 *   Yellow LED = GPIO 25
 *   Blue LED   = GPIO 19
 *
 * SETUP
 *   1. Put your Wi-Fi credentials below.
 *   2. Upload this sketch (Sketch > Upload). No filesystem upload needed.
 *   3. Open Serial Monitor at 115200 and copy the printed IP address.
 *   4. Put that IP in frontend/.env as VITE_ESP32_IP, then run npm run dev.
 *
 * The Access-Control-Allow-Origin header on the LED routes is what allows the
 * browser at http://localhost:5173 to call this board directly. Without it the
 * dashboard connects and shows live sensor data, but every LED request is
 * blocked by the browser before it can be read.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <DHT.h>

// ---------------------------------------------------------------- Wi-Fi ----
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ---------------------------------------------------------------- Sensor ---
#define DHTPIN  5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ------------------------------------------------------------------ LEDs ---
#define RED_LED    26
#define GREEN_LED  17
#define YELLOW_LED 25
#define BLUE_LED   19

// --------------------------------------------------------------- Servers ---
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

unsigned long lastDHTRead = 0;
const long dhtInterval = 2000;

// Allow the dashboard running on your computer to read these responses.
void sendCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleLed(int pin, bool on, const char* name) {
  digitalWrite(pin, on ? HIGH : LOW);
  sendCORS();
  server.send(200, "text/plain", "OK");
  Serial.printf("[LED] %-6s GPIO %2d -> %s\n", name, pin, on ? "HIGH" : "LOW");
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  (void)payload;
  (void)length;
  if (type == WStype_CONNECTED) {
    IPAddress ip = webSocket.remoteIP(num);
    Serial.printf("[WS] client %u connected from %s\n", num, ip.toString().c_str());
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("[WS] client %u disconnected\n", num);
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);

  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(BLUE_LED, LOW);

  dht.begin();

  // ------------------------------------------------------------ Wi-Fi ----
  Serial.printf("\nConnecting to %s", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n\n========================================");
  Serial.print("  Wi-Fi connected. ESP32 IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("");
  Serial.println("  Put this IP in frontend/.env:");
  Serial.print("    VITE_ESP32_IP=");
  Serial.println(WiFi.localIP());
  Serial.println("    VITE_USE_REAL_ESP32=true");
  Serial.println("========================================\n");

  // ------------------------------------------------------- LED routes ----
  server.on("/red/on",     HTTP_GET, [](){ handleLed(RED_LED,    true,  "red");    });
  server.on("/red/off",    HTTP_GET, [](){ handleLed(RED_LED,    false, "red");    });
  server.on("/green/on",   HTTP_GET, [](){ handleLed(GREEN_LED,  true,  "green");  });
  server.on("/green/off",  HTTP_GET, [](){ handleLed(GREEN_LED,  false, "green");  });
  server.on("/yellow/on",  HTTP_GET, [](){ handleLed(YELLOW_LED, true,  "yellow"); });
  server.on("/yellow/off", HTTP_GET, [](){ handleLed(YELLOW_LED, false, "yellow"); });
  server.on("/blue/on",    HTTP_GET, [](){ handleLed(BLUE_LED,   true,  "blue");   });
  server.on("/blue/off",   HTTP_GET, [](){ handleLed(BLUE_LED,   false, "blue");   });

  // Answer CORS preflight for any path, harmless for the simple GETs above.
  server.onNotFound([](){
    if (server.method() == HTTP_OPTIONS) {
      sendCORS();
      server.send(204);
      return;
    }
    sendCORS();
    server.send(404, "text/plain",
                "ESP32 LAN mode. No dashboard is served from this device.\n"
                "Run the React dashboard on your computer (npm run dev).\n"
                "LED API: /<red|green|yellow|blue>/<on|off>   Sensors: ws://<ip>:81/\n");
  });

  server.begin();
  Serial.println("HTTP  :80  LED API ready");

  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  Serial.println("WS    :81  DHT11 broadcast ready\n");
}

void loop() {
  server.handleClient();
  webSocket.loop();

  if (millis() - lastDHTRead >= dhtInterval) {
    lastDHTRead = millis();

    float t = dht.readTemperature();
    float h = dht.readHumidity();

    // Exact wire format the dashboard parses: "temperature,humidity"
    if (!isnan(t) && !isnan(h)) {
      String payload = String(t, 1) + "," + String(h, 1);
      webSocket.broadcastTXT(payload);
    } else {
      Serial.println("[DHT] read failed, skipping broadcast");
    }
  }
}
