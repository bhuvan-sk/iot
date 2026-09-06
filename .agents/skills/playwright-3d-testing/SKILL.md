---
name: playwright-3d-testing
description: End-to-end testing strategies for WebGL/Three.js/R3F 3D canvases using Playwright. Instructs agents on how to simulate keyboard navigation, verify spatial logic via DOM HUDs, and bypass the black-box nature of headless WebGL testing.
---

# Playwright 3D Canvas Testing

When testing 3D WebGL applications (like React Three Fiber) using Playwright, you cannot easily inspect the internal scene graph (camera position, object coordinates) directly from the test runner. 

To effectively test 3D interactions, you must use **DOM Proxies**.

## Core Strategies

### 1. The DOM Proxy Pattern
Do not attempt to read `window.scene` or intercept WebGL buffers. Instead, ensure your 3D application projects contextual state to standard HTML DOM elements (like a HUD).
- Example: If testing movement, rely on a `<div id="room-detector">CURRENT ROOM: Kitchen</div>`.
- Playwright can then easily assert: `await expect(page.getByText('CURRENT ROOM: Kitchen')).toBeVisible();`

### 2. Simulating Continuous Input (WASD)
3D applications use `requestAnimationFrame` loops that calculate movement using Delta Time while a key is held down. You cannot use simple `page.keyboard.press('W')`. You must physically hold the key over time.

```typescript
// Correct way to simulate holding a key for 1.5 seconds in Playwright
await page.keyboard.down('W');
await page.waitForTimeout(1500);
await page.keyboard.up('W');
```

### 3. Pointer Lock Considerations
If the application uses `PointerLockControls`, clicking the canvas is required before WASD or mouse movement will register correctly.

```typescript
const canvas = page.locator('canvas');
await canvas.click(); // Requests Pointer Lock
```

### 4. Bypassing Crosshair/Raycast Drifts
If testing hover interactions in a First-Person view, R3F's raycaster might default to the screen edge if the mouse was never physically moved. 
If the application forces the pointer to `[0,0]` during lock, simply ensure the camera is aimed at the object using WASD, and the center-screen crosshair will trigger the hover state. 

### Example E2E Walkthrough Test
```typescript
test('should navigate rooms via WASD', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Walkthrough' }).click();
  
  await page.locator('canvas').click();

  // Move forward for 1 second
  await page.keyboard.down('W');
  await page.waitForTimeout(1000);
  await page.keyboard.up('W');

  // Verify the DOM proxy updated based on the new spatial location
  await expect(page.getByText('CURRENT ROOM: Hallway')).toBeVisible();
});
```
