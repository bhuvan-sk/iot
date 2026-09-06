# Project Handoff: ESP32 Smart Home Automation Dashboard

## 📌 Project Overview
A real-time IoT home automation dashboard built with React and Vite that communicates directly with an ESP32 microcontroller over a local Wi-Fi network. The dashboard monitors environmental data (DHT11) and controls physical devices (4 LEDs).

## 🛠️ Tech Stack & Architecture
- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4
- **UI Components**: Lucide React (Icons), Recharts (Graphs)
- **Backend (Mock/Logic)**: Node.js, Express, TypeScript
- **Firmware**: ESP32 with `ESPAsyncWebServer`, `LittleFS`, and `WebSocketsServer`
- **Network**: Frontend (laptop) and ESP32 run on the same LAN.

## 🔌 ESP32 Hardware & GPIO Mapping
- **DHT11 Sensor**: GPIO 5
- **Red LED**: GPIO 26
- **Green LED**: GPIO 17
- **Yellow LED**: GPIO 25
- **Blue LED**: GPIO 19

## 📡 Communication Protocols
1. **WebSockets (Port 81)**
   - **Data**: Live DHT11 readings broadcast every 2 seconds.
   - **Format**: CSV format `temperature,humidity` (e.g., `29.3,47.0`).
   - **Frontend Integration**: Handled by the `esp32WebSocket.ts` singleton service and `useESP32WebSocket.ts` hook. Maintains an in-memory history of the last 100 readings for live graphing.

2. **HTTP API (Port 80)**
   - **Data**: Device (LED) controls.
   - **Endpoints**: `GET /<color>/on` and `GET /<color>/off` (e.g., `/red/on`, `/green/off`).

## ⚙️ Core Modes
Controlled via `frontend/.env`:
- `VITE_ESP32_IP=<CURRENT_ESP32_IP>`: Defines the ESP32 LAN IP.
- `VITE_USE_REAL_ESP32=true`: 
  - **Single Source of Truth**: Replaces all mock sensor and graph data with live ESP32 WebSocket data.
  - **Direct Control**: Device toggles bypass the Express backend and send HTTP requests directly to the ESP32.
  - **Graceful Degradation**: Shows "--" while loading or "Offline" if the WebSocket disconnects, without crashing the UI.
- `VITE_USE_REAL_ESP32=false`: Falls back to the Express Node.js mock backend for offline UI development.

## 📂 Key Directory Structure
```text
iot/
├── frontend/
│   ├── src/
│   │   ├── components/ (DeviceToggle, EnvironmentGraph, SensorCard)
│   │   ├── pages/ (Dashboard, etc.)
│   │   ├── services/ (esp32WebSocket.ts - parses CSV and manages connection)
│   │   └── hooks/ (useESP32WebSocket.ts - exposes shared live state)
│   ├── .env (Configures ESP32 IP and Real/Mock mode)
│   └── package.json
├── backend/
│   └── src/ (Express API for mock development)
└── esp32_lan_mode/
    └── esp32_lan_mode.ino (Headless ESP32 IoT firmware)
```

## 🚀 Deployment

- Run `npm run dev` in the `frontend` folder.
- Access via `http://localhost:5173`.
- Communicates over LAN to the ESP32 (running `esp32_lan_mode.ino`).

## ✅ Current Status
- UI is highly polished and responsive.
- WebSocket live data parsing is completely functional.
- HTTP LED controls are successfully triggering.
- Typescript build passes with 0 errors.
- Project is ready for continued development or physical hardware deployment.
