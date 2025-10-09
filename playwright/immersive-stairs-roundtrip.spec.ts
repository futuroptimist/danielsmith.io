import { expect, test } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

test.setTimeout(150_000);

async function waitForImmersiveReady(page: import('@playwright/test').Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test('ascend stairs from spawn, roam, return and descend', async ({ page }) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');

  // Start on ground.
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  // Move toward the staircase using WASD inputs. We step in small bursts so the
  // physics/collision checks run between frames, similar to real gameplay.
  const press = async (keys: string | string[], ms = 220) => {
    const activeKeys = Array.isArray(keys) ? keys : [keys];

    for (const key of activeKeys) {
      await page.keyboard.down(key);
    }
    await page.waitForTimeout(ms);
    for (const key of activeKeys.slice().reverse()) {
      await page.keyboard.up(key);
    }
  };

  const holdKeysUntilFloor = async (
    keys: string | string[],
    target: 'ground' | 'upper',
    timeout = 15_000,
    stabilityMs = 1_200
  ) => {
    const activeKeys = Array.isArray(keys) ? keys : [keys];

    for (const key of activeKeys) {
      await page.keyboard.down(key);
    }

    try {
      await page.waitForFunction(
        (expected) => document.documentElement.dataset.activeFloor === expected,
        target,
        { timeout }
      );
      await page.waitForTimeout(stabilityMs);
    } finally {
      for (const key of activeKeys.slice().reverse()) {
        await page.keyboard.up(key);
      }
    }

    await page.waitForTimeout(300);
    await expect(html).toHaveAttribute('data-active-floor', target, {
      timeout: stabilityMs,
    });
  };

  // From spawn (living room center), head northeast toward the stair bottom.
  for (let i = 0; i < 18; i += 1) {
    await press(['w', 'd'], 120);
  }

  // Enter the staircase and walk up.
  await holdKeysUntilFloor(['w', 'd'], 'upper');

  // Verify we reached upper floor.
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Walk away from the landing to ensure we can leave the stair area.
  for (let i = 0; i < 8; i += 1) {
    await press('w', 120);
  }

  // Turn back toward stairs and descend.
  for (let i = 0; i < 8; i += 1) {
    await press('s', 120);
  }
  await holdKeysUntilFloor(['s', 'a'], 'ground');

  // Should be back on ground.
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});
