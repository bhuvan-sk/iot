# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: walkthrough.spec.ts >> 3D Walkthrough E2E >> should navigate from Living Room to Kitchen via WASD
- Location: e2e\walkthrough.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('CURRENT ROOM: Kitchen')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('CURRENT ROOM: Kitchen') with timeout 5000ms
  - waiting for getByText('CURRENT ROOM: Kitchen')

```

```yaml
- button "Overview"
- button "Walkthrough"
- text: "CURRENT ROOM: Living Room MOUSE LOOK ACTIVE (ESC to release) SMART HOME DIGITAL TWIN 28.5°C | 59% RH"
- button "NORMAL MODE"
- button "NIGHT MODE"
- button "ENTERTAINMENT MODE"
- button "SECURITY MODE"
- button
- text: Select a room or click a light
- heading [level=2]
- button
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('3D Walkthrough E2E', () => {
  4  |   test('should navigate from Living Room to Kitchen via WASD', async ({ page }) => {
  5  |     await page.goto('/');
  6  | 
  7  |     // Switch to Walkthrough mode
  8  |     await page.getByRole('button', { name: 'Walkthrough' }).click();
  9  | 
  10 |     // Verify initial room is detected
  11 |     await expect(page.getByText('CURRENT ROOM: Living Room')).toBeVisible();
  12 | 
  13 |     // Click the canvas to activate Pointer Lock and focus
  14 |     const canvas = page.locator('canvas');
  15 |     await canvas.click({ force: true, position: { x: 400, y: 300 } });
  16 | 
  17 |     // We start at [3.5, 3.0]. 
  18 |     // The doorway to the Kitchen is at z: 1.0 - 2.2.
  19 |     // So we press 'W' to move forward (towards -Z) into the doorway corridor.
  20 |     // Speed is 2.5 units/sec. We need to move about 1.5 units -> ~600ms.
  21 |     await page.keyboard.down('W');
  22 |     await page.waitForTimeout(600);
  23 |     await page.keyboard.up('W');
  24 | 
  25 |     // Now we press 'D' to strafe right (towards +X) into the Kitchen.
  26 |     // The Kitchen boundary starts at x = 7.2. We need to move from 3.5 to ~7.5 -> 4 units -> ~1600ms.
  27 |     await page.keyboard.down('D');
  28 |     await page.waitForTimeout(2000);
  29 |     await page.keyboard.up('D');
  30 | 
  31 |     // Verify we successfully entered the Kitchen
  32 |     // This implicitly proves that WASD works, the camera updated, 
  33 |     // collision boundaries were respected, and the React HUD updated!
> 34 |     await expect(page.getByText('CURRENT ROOM: Kitchen')).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  35 |   });
  36 | });
  37 | 
```