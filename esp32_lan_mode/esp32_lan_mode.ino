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
 * It does three jobs:
 *
 *   HTTP  :80   GET /<red|green|yellow|blue>/<on|off>   -> drives a GPIO
 *   HTTP  :80   GET /sensors                            -> JSON sensor snapshot
 *   WS    :81   broadcasts "temperature,humidity,motion" e.g. 29.3,47.0,1
 *
 * Libraries: WiFi.h and WebServer.h ship with the ESP32 core, so the only
 * external dependencies are the two you already have - WebSockets (Markus
 * Sattler) and DHT sensor library (Adafruit). No JSON library needed; the
 * /sensors payload is small enough to build by hand.
 *
 * WIRING
 *   DHT11    DATA = GPIO 5, VCC = 3.3V, GND = GND
 *   Red LED     = GPIO 26
 *   Green LED   = GPIO 17
 *   Yellow LED  = GPIO 25
 *   Blue LED    = GPIO 19
 *   HC-SR04  TRIG = GPIO 18, ECHO = GPIO 16
 *   LDR      analog output = GPIO 34
 *   PIR      OUT = GPIO 27, VCC = 5V (HC-SR501) or 3.3V, GND = GND
 *
 *   !! HC-SR04 ECHO WARNING !!
 *   A stock HC-SR04 runs at 5V and its ECHO pin swings to 5V. ESP32 GPIOs are
 *   3.3V and are NOT 5V tolerant. Put a divider on ECHO (e.g. 1k from ECHO to
 *   the GPIO, 2k from the GPIO to GND) or use a 3.3V-capable module.
 *
 *   !! LDR ON GPIO 34 !!
 *   GPIO34 is input-only and sits on ADC1, which is the correct choice: ADC2
 *   pins stop working while Wi-Fi is active. It is never configured as an
 *   output - it physically cannot drive one. Resolution is 12-bit, so
 *   readings run 0..4095, not 0..1023.
 *   GPIO34 also has no internal pull-up/pull-down, so an unwired pin floats;
 *   that is what the availability heuristic below exists to catch.
 *
 *   !! PIR ON GPIO 27 !!
 *   An HC-SR501 is happiest on 5V (its regulator needs the headroom) but its
 *   OUT pin swings to 3.3V, so it drives an ESP32 GPIO directly - no divider
 *   needed on this one. GPIO27 is a normal bidirectional pin; it is only ever
 *   configured as an input here.
 *
 * SENSOR-INDEPENDENCE GUARANTEE
 *   Every sensor is sampled on its own millis() timer in loop() and cached.
 *   A DHT read failure does not stop the ultrasonic, LDR or PIR from being
 *   sampled or reported, and no sensor blocks another: the PIR is a single
 *   digitalRead with no delay in its path.
 *
 * SETUP
 *   1. Put your Wi-Fi credentials below.
 *   2. Upload this sketch (Sketch > Upload). No filesystem upload needed.
 *   3. Open Serial Monitor at 115200 and copy the printed IP address.
 *   4. Put that IP in frontend/.env as VITE_ESP32_IP, then run npm run dev.
 *
 * The Access-Control-Allow-Origin header on every route is what allows the
 * browser at http://localhost:5173 to call this board directly.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <DHT.h>

// ---------------------------------------------------------------- Wi-Fi ----
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ---------------------------------------------------------- DHT11 sensor ---
#define DHTPIN  5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ------------------------------------------------------------------ LEDs ---
#define RED_LED    26
#define GREEN_LED  17
#define YELLOW_LED 25
#define BLUE_LED   19

// ----------------------------------------------- HC-SR04 ultrasonic ------
#define TRIG_PIN 18
#define ECHO_PIN 16

// Echo timeout in microseconds. 25000us ~ 4.3m, past the HC-SR04's useful
// range, so anything longer is treated as "no echo" rather than a huge value.
const unsigned long ULTRASONIC_TIMEOUT_US = 25000UL;
const float ULTRASONIC_MAX_CM = 400.0f;
const float ULTRASONIC_MIN_CM = 2.0f;
const unsigned long ULTRASONIC_INTERVAL_MS = 50;

// -------------------------------------------------------- LDR / GPIO 34 ---
// Input-only ADC1 pin. Never set to OUTPUT.
#define LDR_PIN 34

/*
 * Availability heuristic - NOT a guarantee.
 *
 * A single analog pin cannot truly report whether something is wired to it.
 * An unconnected ADC input floats: it drifts, picks up noise, or sits pinned
 * at a rail. A real LDR divider instead sits somewhere mid-scale and is
 * stable sample to sample.
 *
 * So we sample a burst and call the sensor "available" only when the mean is
 * away from both rails AND the spread across the burst is small. That
 * correctly rejects the common disconnected cases without pretending to be
 * a connection detector. Tune these if your divider sits near a rail.
 */
const int LDR_SAMPLES     = 16;
const int LDR_VALID_MIN   = 15;    // at/below this the pin reads as tied low
const int LDR_VALID_MAX   = 4080;  // at/above this the pin reads as tied high
const int LDR_MAX_SPREAD  = 500;   // floating pins wander far more than this
const unsigned long LDR_INTERVAL_MS = 500;

// -------------------------------------------------------- PIR / GPIO 27 ---
#define PIR_PIN 27

/*
 * INPUT vs INPUT_PULLDOWN - the one deliberate deviation, and why.
 *
 * A PIR module drives its OUT pin push-pull, so it overrides the ESP32's
 * ~45k internal pulldown without trouble. Selecting INPUT_PULLDOWN therefore
 * changes nothing while the sensor is wired, but it gives the pin a DEFINED
 * idle level when it is not: LOW. On a bare INPUT the pin floats and reports
 * random motion, and the availability heuristic below would latch true on
 * noise. If you specifically want a floating input, change this one constant
 * to INPUT - nothing else in the sketch depends on it.
 */
const uint8_t PIR_PIN_MODE = INPUT_PULLDOWN;

/** Polled this often. A digitalRead costs nothing, so this stays tight. */
const unsigned long PIR_INTERVAL_MS = 50;

/**
 * How long a HIGH keeps `motion` true after the pin drops again. An HC-SR501
 * already stretches its own pulse, but this makes the reported state
 * independent of when a client happens to poll.
 */
const unsigned long PIR_HOLD_MS = 2500;

/**
 * How long an unconsumed latch stays valid. The latches exist to bridge a
 * client whose poll was slow or dropped; they must NOT keep a pulse alive
 * indefinitely, or a client that went quiet for a minute would come back and
 * be told about motion that ended long ago. Anything past this is history,
 * not a current reading.
 */
const unsigned long PIR_LATCH_TTL_MS = 5000;

/**
 * HC-SR501 modules need to stabilise after power-up and emit spurious HIGHs
 * while they do. Readings are ignored entirely until this has elapsed, so
 * boot noise cannot be mistaken for motion or for proof the sensor exists.
 * Raise to 60000 if your module is still twitchy on a cold start.
 */
const unsigned long PIR_WARMUP_MS = 30000UL;

/*
 * WHAT motionSensorAvailable DOES AND DOES NOT MEAN
 *
 * THE LIMITATION, STATED FIRST
 *   A digital PIR CANNOT be checked for physical disconnection. Its OUT pin
 *   idles LOW, and an unwired pin held down by the internal pulldown also
 *   reads LOW. The two are electrically identical. There is no sampling
 *   trick, no burst, no spread test that separates "the room is empty" from
 *   "the connector fell off" - unlike the LDR above, where a floating analog
 *   pin at least wanders. So this firmware NEVER infers disconnection from a
 *   LOW reading, and no client should either.
 *
 * THEREFORE the two fields answer two different questions:
 *
 *   motion                 - the current (held) motion state of the input.
 *                            A live measurement.
 *
 *   motionSensorAvailable  - whether the firmware has the PIR feature
 *                            configured and usable: GPIO 27 claimed as an
 *                            input and past its warm-up. A statement about
 *                            THIS FIRMWARE, not about the wiring.
 *
 * So motionSensorAvailable is true from the end of warm-up onward, whether or
 * not the sensor has ever fired, and whether or not it is even plugged in.
 * It goes false only while the feature is genuinely not usable yet.
 *
 * Whether a PIR is actually attached is a question the hardware cannot
 * answer. It has to be established by a human waving at it.
 */

// --------------------------------------------------------------- Servers ---
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);

// ------------------------------------------------------- Cached readings ---
// pulseIn() blocks and the LDR burst takes ~16ms. Doing either inside an HTTP
// handler would stall the WebSocket broadcast, so both are sampled on their
// own timers in loop() and /sensors just serialises whatever is cached.
float lastTemperature   = NAN;
float lastHumidity      = NAN;
float lastDistanceCm    = -1.0f;   // -1 => no valid echo
int   lastLightValue    = -1;      // -1 => unavailable
bool  lightAvailable    = false;

// PIR. `motionHeld` is the smoothed state; the two latches guarantee that a
// pulse shorter than a client's poll interval is still delivered exactly once
// to each transport, since HTTP and the WebSocket consume at different rates.
bool  motionHeld        = false;
bool  motionSeen        = false;   // pin has gone HIGH at least once - LOGGING
                                   // ONLY. Never used to judge availability;
                                   // see the note above for why it cannot be.
bool  motionLatchHttp   = false;   // HIGH seen since the last /sensors reply
bool  motionLatchWs     = false;   // HIGH seen since the last WS broadcast
bool  pirWarm           = false;   // warm-up done => feature usable
unsigned long lastMotionHighMs = 0;

unsigned long lastDHTRead        = 0;
unsigned long lastUltrasonicRead = 0;
unsigned long lastLdrRead        = 0;
unsigned long lastPirRead        = 0;
unsigned long lastWsBroadcast    = 0;
const long dhtInterval = 2000;

// A motion edge triggers an out-of-band broadcast so the WebSocket does not
// sit on a state change for up to 2s. Rate limited so it can never flood.
const unsigned long WS_MOTION_MIN_GAP_MS = 500;

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

// ------------------------------------------------------------- Sampling ---

/** Returns distance in cm, or -1 when there is no usable echo. */
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) return -1.0f;            // timed out: nothing in range

  float cm = duration / 58.0f;                // speed of sound, round trip
  if (cm < ULTRASONIC_MIN_CM || cm > ULTRASONIC_MAX_CM) return -1.0f;
  return cm;
}

/** Samples GPIO34 and decides whether the reading looks like a real sensor. */
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

/**
 * Samples GPIO27. Non-blocking by construction: one digitalRead, no delay,
 * no pulseIn. Nothing else in loop() is held up by this.
 */
void readPir() {
  unsigned long now = millis();

  // Ignore the module entirely until it has settled.
  if (!pirWarm) {
    if (now < PIR_WARMUP_MS) return;
    pirWarm = true;
    Serial.println("[PIR] warm-up complete, GPIO 27 live");
  }

  if (digitalRead(PIR_PIN) == HIGH) {
    if (!motionSeen) {
      // Log only. This confirms the wiring FOR A HUMAN reading the serial
      // monitor; it deliberately does not feed motionSensorAvailable.
      Serial.println("[PIR] first HIGH seen on GPIO 27 - sensor is wired");
      motionSeen = true;
    }
    motionLatchHttp = true;
    motionLatchWs = true;
    lastMotionHighMs = now;
  }

  motionHeld = motionSeen && (now - lastMotionHighMs < PIR_HOLD_MS);

  // Expire a latch nobody collected. Without this a client that stopped
  // polling would be handed a stale trigger whenever it came back.
  if (motionSeen && now - lastMotionHighMs >= PIR_LATCH_TTL_MS) {
    motionLatchHttp = false;
    motionLatchWs = false;
  }
}

// ---------------------------------------------------------- Broadcasting ---

/**
 * The WebSocket wire format, v2:
 *
 *   "<temperature>,<humidity>,<motion>"      e.g.  29.3,47.0,1
 *
 *   temperature  degrees C, one decimal, or "nan" if the DHT has never
 *                produced a good reading since boot
 *   humidity     percent RH, one decimal, or "nan" under the same condition
 *   motion       "1" or "0" - the same value /sensors reports as `motion`
 *
 * Fields 0 and 1 are byte-for-byte what they always were and stay in the
 * same positions, so a client that splits on ',' and reads [0] and [1]
 * behaves exactly as before. Motion is purely additive.
 *
 * Sent every 2s on the DHT timer, plus once on a motion edge. The last known
 * good temperature/humidity are used, so a failed DHT read never suppresses
 * the motion channel.
 */
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

void handleSensors() {
  String json = "{";

  json += "\"temperature\":";
  json += isnan(lastTemperature) ? "null" : String(lastTemperature, 1);

  json += ",\"humidity\":";
  json += isnan(lastHumidity) ? "null" : String(lastHumidity, 1);

  // distance is null (not 0, not -1) when the sensor gave no usable echo, so
  // the dashboard can distinguish "nothing detected" from "0 cm away".
  json += ",\"distance\":";
  json += (lastDistanceCm < 0) ? "null" : String(lastDistanceCm, 1);
  json += ",\"distanceValid\":";
  json += (lastDistanceCm < 0) ? "false" : "true";

  json += ",\"ldr\":";
  json += lightAvailable ? String(lastLightValue) : "null";
  json += ",\"ldrAvailable\":";
  json += lightAvailable ? "true" : "false";

  json += ",\"ldrMax\":4095";

  // motion is the held state OR a pulse that arrived since the last reply, so
  // a 1Hz poller cannot miss a trigger shorter than its own interval.
  //
  // motionSensorAvailable reports whether THIS FIRMWARE has the PIR feature
  // configured and usable - GPIO 27 claimed and warm-up finished. It says
  // nothing about whether a sensor is physically attached, because a digital
  // PIR cannot be tested for that. A LOW pin is never treated as evidence of
  // a missing sensor.
  json += ",\"motion\":";
  json += (motionHeld || motionLatchHttp) ? "true" : "false";
  json += ",\"motionSensorAvailable\":";
  json += pirWarm ? "true" : "false";
  motionLatchHttp = false;

  json += ",\"uptimeMs\":";
  json += String(millis());
  json += "}";

  sendCORS();
  server.send(200, "application/json", json);
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

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  pinMode(PIR_PIN, PIR_PIN_MODE);

  analogReadResolution(12);   // 0..4095, matches ldrMax in /sensors
  analogSetPinAttenuation(LDR_PIN, ADC_11db);  // full ~0-3.3V swing on GPIO34

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

  // ---------------------------------------------------- Sensor route ----
  server.on("/sensors", HTTP_GET, handleSensors);

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
                "LED API: /<red|green|yellow|blue>/<on|off>\n"
                "Sensors: /sensors   Live DHT: ws://<ip>:81/\n");
  });

  server.begin();
  Serial.println("HTTP  :80  LED API + /sensors ready");

  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  Serial.println("WS    :81  broadcast ready: temperature,humidity,motion\n");
  Serial.printf("PIR   GPIO %d warming up for %lus, then reported as\n"
                "      available. A wired sensor cannot be distinguished\n"
                "      from an absent one until it actually fires.\n\n",
                PIR_PIN, PIR_WARMUP_MS / 1000);

  // Prime the cached readings so the first /sensors call is not all nulls.
  readLdr();
  lastDistanceCm = readDistanceCm();
}

void loop() {
  server.handleClient();
  webSocket.loop();

  unsigned long now = millis();

  // ---- PIR: polled first and fastest. One digitalRead, nothing blocking. ----
  bool motionBefore = motionHeld;
  if (now - lastPirRead >= PIR_INTERVAL_MS) {
    lastPirRead = now;
    readPir();
  }

  // ---- DHT11: cached on success, and a failure never suppresses the rest ----
  if (now - lastDHTRead >= dhtInterval) {
    lastDHTRead = now;

    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      lastTemperature = t;
      lastHumidity = h;
    } else {
      // Keep the last good values and carry on. The broadcast still goes out
      // below, so motion and the sensor channel survive a flaky DHT.
      Serial.println("[DHT] read failed, keeping last good values");
    }

    broadcastSensors();
  }

  // ---- Motion edge: push it out now rather than waiting for the next tick ---
  if (motionHeld != motionBefore && now - lastWsBroadcast >= WS_MOTION_MIN_GAP_MS) {
    broadcastSensors();
  }

  // ---- Ultrasonic: sampled on its own timer, cached for /sensors ----
  if (now - lastUltrasonicRead >= ULTRASONIC_INTERVAL_MS) {
    lastUltrasonicRead = now;
    lastDistanceCm = readDistanceCm();

    // High-frequency telemetry for gesture engine
    String uPayload = "U,";
    uPayload += (lastDistanceCm < 0) ? "0.0" : String(lastDistanceCm, 1);
    uPayload += ",";
    uPayload += (lastDistanceCm < 0) ? "0" : "1";
    webSocket.broadcastTXT(uPayload);
  }

  // ---- LDR: sampled less often, also re-checks availability ----
  if (now - lastLdrRead >= LDR_INTERVAL_MS) {
    lastLdrRead = now;
    readLdr();
  }
}
