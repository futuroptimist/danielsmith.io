import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type TestWorldApi = {
  getActiveFloor(): string;
  movePlayerTo(target: { x: number; z: number; floorId?: string }): void;
  getStairTransitionZone(target: {
    x: number;
    z: number;
    currentFloor?: string;
  }): string;
  getStairMetrics(): {
    stairCenterX: number;
    stairHalfWidth: number;
    stairBottomZ: number;
    stairTopZ: number;
    stairLandingMinZ: number;
    stairLandingMaxZ: number;
    stairLandingDepth: number;
    upperFloorElevation: number;
  };
};

type PoiTooltipState = {
  overlayVisiblePoiId: string | null;
  worldTooltipVisible: boolean;
  worldTooltipPoiId: string | null;
  markerLabelVisible: boolean;
  markerLabelPoiId: string | null;
  visibleMarkerLabelCount: number;
  visibleMarkerLabelPoiIds: string[];
  activeInWorldTooltipCount: number;
  totalInWorldTooltipCount: number;
};

type DebugCoordinatesState = {
  enabled: boolean;
  x: number;
  y: number;
  z: number;
  activeFloorId: string;
  predictedStairFloorId: string;
  currentRoomId: string | null;
};

type PortfolioWindow = Window & {
  portfolio?: {
    world?: TestWorldApi;
    poi?: {
      getTooltipState?: () => PoiTooltipState;
    };
    debugCoordinates?: {
      getState?: () => DebugCoordinatesState;
      setEnabled?: (enabled: boolean) => void;
    };
  };
};

test.setTimeout(150_000);

async function movePlayerTo(
  page: Page,
  target: { x: number; z: number; floorId?: string }
) {
  await page.evaluate((next) => {
    const { portfolio } = window as PortfolioWindow;
    const world = portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    world.movePlayerTo(next);
  }, target);
  await page.waitForTimeout(150);
}

async function getStairMetrics(page: Page) {
  return page.evaluate(() => {
    const { portfolio } = window as PortfolioWindow;
    const world = portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairMetrics();
  });
}

async function getStairTransitionZone(
  page: Page,
  target: { x: number; z: number; currentFloor?: string }
) {
  return page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairTransitionZone(next);
  }, target);
}

async function getTooltipState(page: Page) {
  return page.evaluate(() => {
    const getState = (window as PortfolioWindow).portfolio?.poi
      ?.getTooltipState;
    if (!getState) {
      throw new Error('window.portfolio.poi.getTooltipState() is unavailable');
    }
    return getState();
  });
}

async function setDebugCoordinatesEnabled(page: Page, enabled: boolean) {
  await page.evaluate((next) => {
    const setEnabled = (window as PortfolioWindow).portfolio?.debugCoordinates
      ?.setEnabled;
    if (!setEnabled) {
      throw new Error(
        'window.portfolio.debugCoordinates.setEnabled() is unavailable'
      );
    }
    setEnabled(next);
  }, enabled);
}

async function getDebugCoordinatesState(page: Page) {
  return page.evaluate(() => {
    const getState = (window as PortfolioWindow).portfolio?.debugCoordinates
      ?.getState;
    if (!getState) {
      throw new Error(
        'window.portfolio.debugCoordinates.getState() is unavailable'
      );
    }
    return getState();
  });
}

async function waitForImmersiveReady(page: Page) {
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

  const metrics = await getStairMetrics(page);

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
  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.3 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  // Enter the ramp and ascend to the upper floor.
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ - 0.1 });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Roam deeper onto the upper landing and confirm we stay upstairs.
  const landingRoamZ =
    stairLandingMinZ + Math.min(stairLandingDepth * 0.5, 0.6);
  await movePlayerTo(page, { x: stairCenterX, z: landingRoamZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Return toward the stairs, enter the explicit descent handoff, then
  // continue down the ramp. The helper teleports between sampled positions,
  // so include the narrow handoff band that real movement crosses frame by frame.
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ - 0.15 });
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ + 0.7 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.35 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('upper landing nudge keeps the player upstairs until intentional descent', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const metrics = await getStairMetrics(page);
  const { stairCenterX, stairTopZ } = metrics;
  const upperLandingEdgeX = stairCenterX + 1;
  const upperLandingNudgeZ = stairTopZ - 2.6;
  const explicitDescentZ = stairTopZ + 0.7;

  await expect(
    getStairTransitionZone(page, {
      x: upperLandingEdgeX,
      z: upperLandingNudgeZ,
      currentFloor: 'upper',
    })
  ).resolves.toBe('upperLanding');

  await movePlayerTo(page, {
    x: upperLandingEdgeX,
    z: upperLandingNudgeZ,
    floorId: 'upper',
  });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  await page.keyboard.press('ArrowDown');
  await expect(html).toHaveAttribute('data-active-floor', 'upper');
  await expect
    .poll(async () => getDebugCoordinatesState(page))
    .toMatchObject({ activeFloorId: 'upper' });

  await expect(
    getStairTransitionZone(page, {
      x: stairCenterX,
      z: explicitDescentZ,
      currentFloor: 'upper',
    })
  ).resolves.toBe('explicitDescentCorridor');

  await movePlayerTo(page, {
    x: stairCenterX,
    z: explicitDescentZ,
  });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('debug coordinates and POI tooltip state stay floor-aware upstairs', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const overlay = page.locator('.debug-coordinates');
  const metrics = await getStairMetrics(page);
  const { stairCenterX, stairLandingMinZ, stairLandingMaxZ } = metrics;
  const landingMidZ = (stairLandingMinZ + stairLandingMaxZ) / 2;

  await setDebugCoordinatesEnabled(page, true);
  await movePlayerTo(page, {
    x: stairCenterX,
    z: landingMidZ,
    floorId: 'upper',
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-active-floor',
    'upper'
  );

  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(/XYZ/i);
  await expect(overlay).toContainText(/Active floor/i);
  await expect(overlay).toContainText(/upper/i);
  const debugState = await getDebugCoordinatesState(page);
  expect(debugState).toMatchObject({
    enabled: true,
    activeFloorId: 'upper',
    predictedStairFloorId: 'upper',
  });
  expect(Number.isFinite(debugState.x)).toBe(true);
  expect(Number.isFinite(debugState.y)).toBe(true);
  expect(Number.isFinite(debugState.z)).toBe(true);

  await expect
    .poll(async () => getTooltipState(page))
    .toMatchObject({
      overlayVisiblePoiId: null,
      worldTooltipVisible: false,
      worldTooltipPoiId: null,
      markerLabelVisible: false,
      markerLabelPoiId: null,
      visibleMarkerLabelCount: 0,
      visibleMarkerLabelPoiIds: [],
      activeInWorldTooltipCount: 0,
      totalInWorldTooltipCount: 0,
    });
});
