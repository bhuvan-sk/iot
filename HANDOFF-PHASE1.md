# Handoff — Phase 1 (Sensor Contract) + Phase 1.5 (Room Geometry)

**Date:** 2026-09-06
**Branch:** `main` · **Last commit:** `e2614e0` · **Nothing committed this phase — all changes are uncommitted in the working tree.**

> The older `HANDOFF.md` at the repo root is **stale**. It describes the original LittleFS / `ESPAsyncWebServer` design that was abandoned when the project moved to LAN mode. Use this document instead.

---

## 1. What this project is

A LAN-mode ESP32 smart-home digital twin.

- The **ESP32 is headless** — no LittleFS, no `ESPAsyncWebServer`, serves no UI.
- The **React dashboard runs on the PC** under Vite at `http://localhost:5173/`.
- They talk over the Wi-Fi LAN: HTTP :80 for control + sensor snapshot, WebSocket :81 for live DHT.

---

## 2. Current state — verified live against real hardware, 2026-09-06

The board was reachable at **`192.168.1.241`** (MAC `e0-8c-fe-16-d7-34`) and the dashboard was driven in a real browser.

| Check | Result |
|---|---|
| 3D house loads | ✅ Renders; orbit and zoom work |
| Room selection | ✅ Canvas raycast selects; panel follows |
| Bath / Garage not selectable | ✅ Correctly inert (no hardware) |
| DHT11 over WebSocket | ✅ Handshake 101, frames `28.9,57.0` every 2 s |
| Ultrasonic distance | ✅ ~95 cm live, updating |
| Garage state | ✅ "Object in range" (95 cm, between the 60 / 120 cm thresholds) |
| LED control | ✅ `GET /green/on` → 200, twin shows 1/4 lit; `/green/off` → 200 |
| All 8 LED routes + CORS | ✅ 200 with `Access-Control-Allow-Origin: *` |
| Console / runtime errors | ✅ **Zero** errors, zero warnings |
| LDR | ⚠️ Reports `0` — honestly surfaced as **"Sensor not connected / UNAVAILABLE"** |
| PIR motion | ❌ **Not visible — the board is running OLD firmware** |

### The one blocking fact

**The ESP32 has NOT been flashed with the new firmware.** Its live `/sensors` returns the old shape:

```json
{"temperature":28.9,"humidity":58.0,"distance":94.8,"light":0}
```

No `distanceValid`, no `ldrAvailable`, no `ldrMax`, no `motion`, no `motionSensorAvailable`, no `uptimeMs`. The frontend's dual-contract shim handles this correctly and degrades honestly — which is why everything else still works — but **PIR cannot appear until the sketch is uploaded.**

---

## 3. Hardware

### GPIO map — audited, ZERO conflicts (9 pins, 9 distinct)

| Device | GPIO | Direction |
|---|---|---|
| DHT11 DATA | **5** | — |
| LDR (analog) | **34** | input-only, ADC1 |
| HC-SR04 TRIG | **18** | OUTPUT |
| HC-SR04 ECHO | **16** | INPUT |
| PIR OUT | **27** | INPUT_PULLDOWN |
| Red LED | **26** | OUTPUT |
| Green LED | **17** | OUTPUT |
| Yellow LED | **25** | OUTPUT |
| Blue LED | **19** | OUTPUT |

GPIO 34 is never driven as an output (it physically cannot be). GPIO 27 is never driven as an output.

### Open hardware questions

1. **Module type — WROOM or WROVER?** On a **WROVER**, GPIO 16 (ECHO) and GPIO 17 (GREEN LED) are wired to PSRAM and will not work reliably. This is still the leading suspect for the instability seen in earlier sessions (HTTP 1/20, ping 2/10, distance pinned at 4.0 cm). **Unanswered.**
2. **ECHO divider.** 2 × 1 kΩ gives **2.50 V** against an ESP32 `V_IH` of **2.475 V** — a 25 mV (~1 %) margin. Recommend 1 kΩ + 2 kΩ → 3.33 V. **Unanswered.**
3. **LDR on GPIO 34 reads a constant 0** in every session. Suspect wiring/divider, not software.

---

## 4. Firmware — `esp32_lan_mode/esp32_lan_mode.ino`

### Sensor scheduling

Every sensor runs on its own `millis()` timer and is cached; `/sensors` only serialises the cache.

| Sensor | Cadence | Blocking | Failure representation |
|---|---|---|---|
| DHT11 | 2000 ms | library-internal | keeps last good values, **never suppresses other sensors** |
| HC-SR04 | 300 ms | `pulseIn`, 25 ms cap | `distance: null` + `distanceValid: false` |
| LDR | 500 ms | ~16 ms burst | `ldr: null` + `ldrAvailable: false` |
| PIR | 50 ms | none (one `digitalRead`) | see §4.3 |

### 4.1 `/sensors` — exact response

Existing field names and order untouched; `motion` / `motionSensorAvailable` inserted before `uptimeMs`.

```json
{"temperature":28.0,"humidity":56.0,"distance":74.2,"distanceValid":true,"ldr":620,"ldrAvailable":true,"ldrMax":4095,"motion":true,"motionSensorAvailable":true,"uptimeMs":128400}
```

Note the ambient-light fields are **`ldr` / `ldrAvailable` / `ldrMax`** — not `light` / `lightSensorAvailable`. Bare `light` is the *legacy* field the shim still accepts.

### 4.2 WebSocket — exact format

- **v1 (old):** `temperature,humidity` → `28.0,56.0`
- **v2 (new):** `temperature,humidity,motion` → `28.0,56.0,1`

Fields 0 and 1 are byte-for-byte unchanged and in the same positions, so v1 clients are unaffected. `nan` appears only if the DHT has never produced a good reading since boot. Broadcast every 2 s on the DHT timer, plus once on a motion edge (rate-limited to 1 per 500 ms).

### 4.3 PIR semantics — read this before touching it

| Field | Means |
|---|---|
| `motion` | Current/held PIR state. A live measurement. |
| `motionSensorAvailable` | Whether **this firmware** has the PIR feature configured and usable (GPIO 27 claimed, past warm-up). A statement about the firmware, **not** about the wiring. |

**Documented limitation:** a digital PIR **cannot** be checked for physical disconnection. Its OUT pin idles LOW, and an unwired pin held by the internal pulldown also reads LOW — electrically identical. The firmware **never** infers disconnection from LOW, and no client should either.

`motionSeen` ("has ever gone HIGH") still exists but is **logging only** — it prints to serial for a human and never feeds `motionSensorAvailable`.

Timing: 50 ms poll · 2500 ms hold · 30 s warm-up (suppresses HC-SR501 boot noise) · independent HTTP/WS latches so a sub-poll-length pulse reaches both transports · 5000 ms latch TTL so a stale pulse is never replayed.

**One deviation from spec:** `pinMode(PIR_PIN, INPUT_PULLDOWN)` rather than `INPUT`, because a floating bare input reports random motion. Single constant `PIR_PIN_MODE` (~line 136) — change it to `INPUT` to revert.

### 4.4 ⚠️ Before flashing

**Wi-Fi credentials at lines 61–62 are still `YOUR_WIFI_SSID` / `YOUR_WIFI_PASSWORD` placeholders.** Fill them in or the board will retry a network that doesn't exist.

---

## 5. Room geometry — one source of truth

`frontend/src/config/rooms.ts` → **`HOUSE_ROOMS`** is now the only table of room coordinates (all 6 rooms, one axis convention: X east, Z south, metres). Everything else is derived:

```
HOUSE_ROOMS ──► ROOMS · BATHROOM · GARAGE · GARAGE_BAYS · HOUSE_FOOTPRINT
            ──► ROOM_VOLUMES · FOOTPRINT   (components/house3d/model.ts)
                     ↓
        3D twin → room selection → room controls → automation
```

`RoomDef` keeps its exact previous shape (including `plan: {x, y, w, d}`, derived with `y = z`), so all 9 consumers compile untouched. Verified numerically: all 6 room volumes, footprint, 4 plan rects, GPIOs, colours, `BATHROOM`, `GARAGE` and both garage bays are **identical to pre-refactor values**. Zero visual change.

### Residual duplication, not papered over

1. `frontend/src/components/house/houseModel.ts` still defines its own coordinates. It's the **dead** isometric renderer (zero live importers) — deletion not yet authorised.
2. Wall centrelines in `house3d/model.ts` (`x1: 6.6`, `12.3`, `18.9`) share numbers with room edges by hand. Move a room today and the walls won't follow.
3. Garage bay floor markings in `Interior.tsx` are hardcoded and sit ~0.25 m off `GARAGE_BAYS` (decorative only).

---

## 6. Files changed this phase (5, all uncommitted)

| File | Change |
|---|---|
| `esp32_lan_mode/esp32_lan_mode.ino` | PIR on GPIO 27; warm-up, hold, dual latch + TTL; `broadcastSensors()`; DHT-failure isolation; 2 added JSON fields |
| `frontend/src/config/rooms.ts` | Now the single authoritative room table |
| `frontend/src/components/house3d/model.ts` | `ROOM_VOLUMES` / `FOOTPRINT` derived, no longer authored |
| `frontend/src/services/sensorService.ts` | Parses `motion` / `motionSensorAvailable` |
| `frontend/src/services/esp32WebSocket.ts` | Parses CSV field 2; drops non-finite readings instead of emitting `NaN` |

**No automation logic, no new UI components, no dashboard redesign** — all explicitly deferred.

---

## 7. Build / test status

| Check | Result |
|---|---|
| `npx tsc -b --force` | ✅ 0 errors |
| `npm run build` | ✅ Pass (3025 modules) |
| `npm run lint` (oxlint) | ✅ 12 warnings, 0 errors — identical to pre-change baseline |
| Geometry equivalence | ✅ All derived values identical to pre-refactor |
| WebSocket parser v1 + v2 | ✅ 12/12 |
| PIR state machine logic | ✅ 19/19 |
| Live hardware smoke test | ✅ See §2 |

**There is no test runner in `package.json`** — scripts are `dev`, `build`, `build:esp32`, `lint`. The verification scripts above were written ad-hoc into a session scratchpad and are **not in the repo**; they read their constants out of the source so they cannot drift from it.

**The firmware was never compiled** — no `arduino-cli`, `g++` or `gcc` on this machine. The PIR suite verifies *logic*, not that the sketch builds.

---

## 8. Known architectural issues (from the audit, still open)

1. **`desired = dark && presence` is a hard-coded AND** in `services/roomAutomation.ts`. Both sensors are mandatory, so **with the LDR dead, ultrasonic-only automation is impossible.** This is the blocking flaw for the automation phase.
2. **No manual-override provenance.** Nothing records whether automation or a human set a light. "Manual doesn't fight automation" is achieved by *disabling the switch in AUTO mode* (`RoomControl.tsx:156`), i.e. by removing the ability to intervene rather than prioritising the human.
3. **UI is structurally generic** — the twin is a card among cards; ~1,173 lines of console panels sit in a right rail; sensor data is divorced from sensor location. Proposed target: twin full-bleed as the control surface, inspector anchored to the selected room, sensor data rendered in-scene.
4. **Dead code:** `frontend/src/components/house/` (`HouseScene.tsx`, `houseModel.ts`, `isometric.ts`) — zero importers.

---

## 9. Decisions still needed

1. `INPUT_PULLDOWN` vs `INPUT` for the PIR pin.
2. Rename `ldr`/`ldrAvailable` → `light`/`lightSensorAvailable`, or keep?
3. Keep the motion-edge WebSocket broadcast? (Adds frames; `EnvironmentGraph` plots slightly denser.)
4. ESP32 module type — WROOM or WROVER?
5. Change the ECHO divider to 1 kΩ + 2 kΩ?
6. Default automation mode per room.
7. Manual-override lifetime — indefinite, or timed expiry?
8. Confirm the chart and right rail are removed in the redesign.
9. Delete `components/house/`?
10. Unify wall centrelines with the room table?

---

## 10. Phases remaining

| Phase | Scope |
|---|---|
| 2 | Sensor service — motion through hooks + selectors |
| 3 | Automation engine — 7 modes, ON/OFF threshold pairs, motion hold, OFF delay, **override provenance**, unify remaining geometry |
| 4 | 3D twin overlays — range cone, PIR pulse, unavailable glyphs, full-bleed |
| 5 | Room interaction — anchored inspector, "why is it on" |
| 6 | UI polish — remove rail + chart, thin status bar |
| 7 | Real hardware testing |

---

## 11. How to run

```bash
cd frontend
npm run dev          # http://localhost:5173/  (localhost-only by design)
```

`frontend/.env` holds `VITE_ESP32_IP` and `VITE_USE_REAL_ESP32=true`. To find the board if its lease changes, sweep for **port 81 open** or match MAC `e0-8c-fe-16-d7-34` — those are the reliable ESP32 signatures.

To re-enable LAN access for other devices, change `host: 'localhost'` to `host: '0.0.0.0'` in `frontend/vite.config.ts`.
