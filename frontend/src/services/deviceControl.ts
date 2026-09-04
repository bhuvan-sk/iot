import { esp32WS } from './esp32WebSocket';
import type { LedColor } from '../config/rooms';

/**
 * The ONE place the ESP32 LED HTTP protocol is implemented.
 *
 * GET http://<esp32-ip>/<color>/<on|off> - the same endpoints the firmware has
 * always served. It was previously inlined in DeviceToggle; it now lives here
 * so the 3D house and the toggle component share a single implementation
 * instead of duplicating it.
 *
 * This uses a plain CORS fetch rather than mode: 'no-cors'. The firmware
 * answers these routes with Access-Control-Allow-Origin: *, so the response is
 * readable, which means a non-2xx status or a network/CORS failure actually
 * surfaces instead of resolving as an unreadable opaque response. Callers can
 * therefore tell a real success from a silent failure and avoid reporting a
 * light as switched when the command never landed.
 *
 * In production the dashboard is served by the ESP32 itself, so this is a
 * same-origin request and CORS is not involved at all.
 *
 * The base URL comes from esp32WS.getEspIp(), which already resolves to
 * window.location.hostname in production (dashboard served from LittleFS) and
 * to VITE_ESP32_IP during development. That keeps production free of any
 * localhost dependency.
 */

export const esp32BaseUrl = (): string => `http://${esp32WS.getEspIp()}`;

export async function setLed(color: LedColor, on: boolean): Promise<void> {
  const action = on ? 'on' : 'off';
  const path = `/${color}/${action}`;

  const response = await fetch(`${esp32BaseUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`ESP32 returned HTTP ${response.status} for ${path}`);
  }

  console.log(`[ESP32] Sent HTTP command: ${path}`);
}
