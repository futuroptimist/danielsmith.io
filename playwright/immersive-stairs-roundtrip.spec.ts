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
  const press = async (key: string, ms = 220) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };

  const moveUntilFloor = async (
    key: string,
    {
      maxSteps,
      duration,
      target,
    }: { maxSteps: number; duration: number; target: 'ground' | 'upper' }
  ) => {
    for (let i = 0; i < maxSteps; i += 1) {
      await press(key, duration);
      const active = await html.getAttribute('data-active-floor');
      if (active === target) {
        return;
      }
    }

    await expect(html).toHaveAttribute('data-active-floor', target);
  };

  // From spawn (living room center), head northeast toward the stair bottom.
  for (let i = 0; i < 10; i += 1) {
    await press('w', 120);
    await press('d', 120);
  }

  // Enter the staircase and walk up.
  await moveUntilFloor('w', { maxSteps: 24, duration: 150, target: 'upper' });

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
  await moveUntilFloor('s', { maxSteps: 24, duration: 150, target: 'ground' });

  // Should be back on ground.
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});
