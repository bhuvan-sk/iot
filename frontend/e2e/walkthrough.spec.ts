import { test, expect } from '@playwright/test';

test.describe('3D Walkthrough E2E', () => {
  test('should navigate from Living Room to Kitchen via WASD', async ({ page }) => {
    await page.goto('/');

    // Switch to Walkthrough mode
    await page.getByRole('button', { name: 'Walkthrough' }).click();

    // Verify initial room is detected
    await expect(page.getByText('CURRENT ROOM: Living Room')).toBeVisible();

    // Click the canvas to activate Pointer Lock and focus
    const canvas = page.locator('canvas');
    await canvas.click({ force: true, position: { x: 400, y: 300 } });

    // We start at [3.5, 3.0]. 
    // The doorway to the Kitchen is at z: 1.0 - 2.2.
    // Sprint speed is 6.0 units/sec. dt is capped at 0.1s per frame.
    // We hold Shift to sprint to guarantee we cover the distance even if Playwright headless RAF stutters.
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.up('w');

    // Now we press 'd' to strafe right (towards +X) into the Kitchen.
    await page.keyboard.down('d');
    await page.waitForTimeout(2000);
    await page.keyboard.up('d');
    await page.keyboard.up('Shift');

    // Verify we successfully entered the Kitchen
    // This implicitly proves that WASD works, the camera updated, 
    // collision boundaries were respected, and the React HUD updated!
    await expect(page.getByText('CURRENT ROOM: Kitchen')).toBeVisible();
  });
});
