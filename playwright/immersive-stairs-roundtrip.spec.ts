import { expect, test } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type TestWorldApi = {
  movePlayerTo(target: { x: number; z: number }): void;
  getStairMetrics(): {
    stairCenterX: number;
    stairHalfWidth: number;
    stairBottomZ: number;
    stairTopZ: number;
    stairLandingMinZ: number;
    stairLandingDepth: number;
    upperFloorElevation: number;
  };
};

type PortfolioWindow = Window & {
  portfolio?: {
    world?: TestWorldApi;
  };
};

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

  const movePlayerTo = async (target: { x: number; z: number }) => {
    await page.evaluate((next) => {
      const { portfolio } = window as PortfolioWindow;
      const world = portfolio?.world;
      if (!world) {
        throw new Error('World API unavailable');
      }
      world.movePlayerTo(next);
    }, target);
    await page.waitForTimeout(150);
  };

  const metrics = await page.evaluate(() => {
    const { portfolio } = window as PortfolioWindow;
    const world = portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairMetrics();
  });

  const {
    stairCenterX,
    stairBottomZ,
    stairTopZ,
    stairLandingMinZ,
    stairLandingDepth,
  } = metrics;

  // Start on ground.
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  // Move to the base of the staircase on the ground floor.
  await movePlayerTo({ x: stairCenterX, z: stairBottomZ + 0.3 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  // Enter the ramp and ascend to the upper floor.
  await movePlayerTo({ x: stairCenterX, z: (stairBottomZ + stairTopZ) / 2 });
  await movePlayerTo({ x: stairCenterX, z: stairTopZ - 0.1 });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Roam deeper onto the upper landing and confirm we stay upstairs.
  const landingRoamZ =
    stairLandingMinZ + Math.min(stairLandingDepth * 0.5, 0.6);
  await movePlayerTo({ x: stairCenterX, z: landingRoamZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Step onto the floor beside the stairwell cutout; stay on the upper level.
  const stairSideOffset = Math.min(stairHalfWidth * 0.5, 1.0);
  const stairSideX = stairCenterX + stairHalfWidth + stairSideOffset;
  const stairSideZ = (stairBottomZ + stairTopZ) / 2;
  await movePlayerTo({ x: stairSideX, z: stairSideZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Return toward the stairs and descend back to ground.
  await movePlayerTo({ x: stairCenterX, z: stairTopZ - 0.15 });
  await movePlayerTo({ x: stairCenterX, z: (stairBottomZ + stairTopZ) / 2 });
  await movePlayerTo({ x: stairCenterX, z: stairBottomZ + 0.35 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});
