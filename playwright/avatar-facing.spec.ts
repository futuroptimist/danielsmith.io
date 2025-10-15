import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((((angle + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
}

function angularDifference(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

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

    const expectYawNear = async (
      target: number,
      options: {
        tolerance?: number;
        settleMs?: number;
        maxWaitMs?: number;
        sampleIntervalMs?: number;
      } = {}
    ) => {
      const {
        tolerance = Math.PI / 6,
        settleMs = 120,
        maxWaitMs = 1200,
        sampleIntervalMs = 60,
      } = options;

      if (settleMs > 0) {
        await page.waitForTimeout(settleMs);
      }

      const deadline = Date.now() + Math.max(0, maxWaitMs);
      let yaw = await getYaw();
      let diff = angularDifference(yaw, target);

      while (diff >= tolerance && Date.now() < deadline) {
        await page.waitForTimeout(Math.max(0, sampleIntervalMs));
        yaw = await getYaw();
        diff = angularDifference(yaw, target);
      }

      expect(diff).toBeLessThan(tolerance);
      return yaw;
    };

    await expectYawNear(0, { settleMs: 0 });

    // Simulate pressing W (forward/north) for a few frames to induce movement.
    await page.keyboard.down('w');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');

    // Expect yaw to move toward facing north (z-), i.e., around 0 radians.
    await expectYawNear(0);

    // Now simulate moving right (east) and expect yaw to approach +PI/2.
    await page.keyboard.down('d');
    await page.waitForTimeout(400);
    await page.keyboard.up('d');

    await expectYawNear(Math.PI / 2);

    // Diagonal forward-right: hold W + D together, expect ~ PI/4.
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await page.waitForTimeout(450);
    await expectYawNear(Math.PI / 4);
    await page.keyboard.up('d');
    await page.keyboard.up('w');

    // Moving backward should point the mannequin south (~ +/- PI radians).
    await page.keyboard.down('s');
    await page.waitForTimeout(420);
    await page.keyboard.up('s');
    const yawAfterSouth = await expectYawNear(Math.PI, {
      tolerance: Math.PI / 5,
    });
    // Ensure it is not inverted (north) anymore.
    expect(angularDifference(yawAfterSouth, 0)).toBeGreaterThan(Math.PI / 2);

    // Left (A) should face west (~ -PI/2).
    await page.keyboard.down('a');
    await page.waitForTimeout(400);
    await page.keyboard.up('a');
    await expectYawNear(-Math.PI / 2);

    // Clean up any lingering velocity before finishing the test (diagonal back-left).
    await page.keyboard.down('s');
    await page.keyboard.down('a');
    await page.waitForTimeout(450);
    await expectYawNear((-3 * Math.PI) / 4, { tolerance: Math.PI / 5 });
    await page.keyboard.up('a');
    await page.keyboard.up('s');
  });
});
