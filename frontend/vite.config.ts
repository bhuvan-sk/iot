import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // LOCALHOST-ONLY: the dashboard is reachable only from this PC at
    // http://localhost:5173/. Other devices on the Wi-Fi cannot open it.
    //
    // TO RE-ENABLE LAN ACCESS: change the line below to
    //     host: '0.0.0.0',
    // and open http://<PC_LAN_IP>:5173/ from the other device.
    // This setting only affects which network interfaces Vite listens on. It
    // does not touch the ESP32 connection, which is resolved separately from
    // VITE_ESP32_IP in .env.
    host: 'localhost',
    port: 5173
  }
})
