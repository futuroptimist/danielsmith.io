import { expect, test } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

async function waitForImmersiveReady(page: import('@playwright/test').Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test('ascend stairs from spawn, roam, return and descend', async ({ page }) => {
  await waitForImmersiveReady(page);

  // Start on ground.
  await expect(page.locator('html')).toHaveAttribute('data-active-floor', 'ground');

  // Move toward the staircase using WASD inputs. We step in small bursts so the
  // physics/collision checks run between frames, similar to real gameplay.
  const press = async (key: string, ms = 220) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };

  // From spawn (living room center), head northeast toward the stair bottom.
  for (let i = 0; i < 10; i += 1) {
    await press('w', 120);
    await press('d', 120);
  }

  // Enter the staircase and walk up.
  for (let i = 0; i < 14; i += 1) {
    await press('w', 150);
  }

  // Verify we reached upper floor.
  await expect(page.locator('html')).toHaveAttribute('data-active-floor', 'upper');

  // Walk away from the landing to ensure we can leave the stair area.
  for (let i = 0; i < 8; i += 1) {
    await press('w', 120);
  }

  // Turn back toward stairs and descend.
  for (let i = 0; i < 8; i += 1) {
    await press('s', 120);
  }
  for (let i = 0; i < 14; i += 1) {
    await press('s', 150);
  }

  // Should be back on ground.
  await expect(page.locator('html')).toHaveAttribute('data-active-floor', 'ground');
});


