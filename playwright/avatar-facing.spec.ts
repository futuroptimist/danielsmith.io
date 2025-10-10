import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

test.describe('avatar facing', () => {
  test('rotates smoothly toward movement direction', async ({ page }) => {
    await waitForImmersive(page);

    // Read initial yaw via world test hook we add on window.
    const getYaw = async () =>
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        return w.portfolio?.world?.getPlayerYaw?.() ?? 0;
      });

    await getYaw();

    // Simulate pressing W (forward/north) for a few frames to induce movement.
    await page.keyboard.down('w');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');

    const yawAfterNorth = await getYaw();

    // Expect yaw to move toward facing north (z-), i.e., around 0 radians.
    expect(Math.abs(yawAfterNorth)).toBeLessThan(Math.PI / 2);

    // Now simulate moving right (east) and expect yaw to approach +PI/2.
    await page.keyboard.down('d');
    await page.waitForTimeout(400);
    await page.keyboard.up('d');

    const yawAfterEast = await getYaw();
    const diffToEast = Math.abs(((yawAfterEast - Math.PI / 2 + Math.PI) % (2 * Math.PI)) - Math.PI);
    expect(diffToEast).toBeLessThan(1.0);
  });
});


