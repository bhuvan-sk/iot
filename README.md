# ESP32 Smart Home Automation Dashboard

A real-time IoT home automation dashboard built with React and Vite that communicates directly with an ESP32 microcontroller over a local Wi-Fi network. The dashboard monitors environmental data and controls physical devices with extremely low latency using WebSockets and HTTP APIs.

## 🚀 Key Features
- **Real-Time Telemetry**: Live temperature and humidity monitoring via WebSockets.
- **Direct Device Control**: Zero-latency LED/relay toggling via HTTP endpoints.
- **Graceful Degradation**: Built-in mock backend for offline UI development and resilient error states when the ESP32 disconnects.
- **Responsive UI**: Polished interface with Recharts for live data graphing.

## 🏗️ Architecture / System Overview
- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4
- **Backend (Mock/Logic)**: Node.js, Express, TypeScript (for offline development)
- **Firmware**: ESP32 running headless IoT firmware (`esp32_lan_mode.ino`) with `ESPAsyncWebServer`, `LittleFS`, and `WebSocketsServer`.
- **Network**: Operates entirely over the Local Area Network (LAN) for improved privacy and speed.

## 🔌 Hardware & GPIO Mapping
- **DHT11 Sensor**: GPIO 5
- **Red LED**: GPIO 26
- **Green LED**: GPIO 17
- **Yellow LED**: GPIO 25
- **Blue LED**: GPIO 19

## 📡 Communication Protocols
1. **WebSockets (Port 81)**
   - Broadcasts live DHT11 readings (`temperature,humidity`) every 2 seconds.
   - Frontend maintains an in-memory history of the last 100 readings for real-time graphing.
2. **HTTP API (Port 80)**
   - Exposes device controls: `GET /<color>/on` and `GET /<color>/off`.

## 🛠️ Setup Instructions
1. **Hardware Configuration**: Flash the `esp32_lan_mode.ino` firmware onto your ESP32.
2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```
3. **Environment Configuration**: Edit `frontend/.env` to include your ESP32's IP address:
   ```env
   VITE_ESP32_IP=<CURRENT_ESP32_IP>
   VITE_USE_REAL_ESP32=true
   ```
4. **Run Dashboard**:
   ```bash
   npm run dev
   ```

## 🔒 Security Considerations
- **Local Network Only**: Devices and backend communicate purely over LAN. No external cloud dependencies reduce the attack surface.
- **Future Improvements**: Adding basic authentication for the HTTP API and WSS layer to prevent unauthorized access on the local network.

## 📜 License
MIT License
