import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const GROUND_POI_IDS = [
  'tokenplace-studio-cluster',
  'gabriel-studio-sentry',
  'flywheel-studio-flywheel',
  'jobbot-studio-terminal',
  'axel-studio-tracker',
  'futuroptimist-living-room-tv',
  'gitshelves-living-room-installation',
  'danielsmith-portfolio-table',
  'f2clipboard-kitchen-console',
  'sigma-kitchen-workbench',
  'wove-kitchen-loom',
  'dspace-backyard-rocket',
  'pr-reaper-backyard-console',
  'sugarkube-backyard-greenhouse',
] as const;

const SCREENSHOT_LANDING_NUDGE = 0.4;
const SCREENSHOT_LANDING_OFFSET = 3.0;
const INTENTIONAL_DESCENT_OFFSET = 0.7;

type FloorId = 'ground' | 'upper';

type DebugCoordinatesState = {
  enabled: boolean;
  x: number;
  y: number;
  z: number;
  activeFloorId: FloorId;
  predictedStairFloorId: FloorId;
  cameraZoom: number;
  insideStairWidth: boolean;
  insideLanding: boolean;
  insideStairNavArea: boolean;
  stairZone: string;
  currentRoomId: string | null;
};

type PoiTooltipState = {
  overlayVisiblePoiId: string | null;
  worldTooltipVisible: boolean;
  worldTooltipPoiId: string | null;
  worldTooltipTitle: string | null;
  markerLabelVisible: boolean;
  markerLabelPoiId: string | null;
  visibleMarkerLabelCount: number;
  visibleMarkerLabelPoiIds: string[];
  activePoiMarkerLabelVisible: boolean;
  activeInWorldTooltipCount: number;
  totalInWorldTooltipCount: number;
};

type StairMetrics = {
  stairCenterX: number;
  stairHalfWidth: number;
  stairBottomZ: number;
  stairTopZ: number;
  stairLandingMinZ: number;
  stairLandingMaxZ: number;
  stairLandingDepth: number;
  stairDirection: 1 | -1;
  upperFloorElevation: number;
};

type TestWorldApi = {
  movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
  getActiveFloor(): FloorId;
  getPlayerPosition(): { x: number; y: number; z: number };
  predictFloorAt(target: {
    x: number;
    z: number;
    currentFloor?: FloorId;
  }): FloorId;
  getStairTransitionZone(target: {
    x: number;
    z: number;
    currentFloor?: FloorId;
  }): string;
  getStairMetrics(): StairMetrics;
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

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await page.waitForFunction(
    () => (window as PortfolioWindow).portfolio?.world?.getStairMetrics
  );
  await page.waitForFunction(
    () => (window as PortfolioWindow).portfolio?.poi?.getTooltipState
  );
  await page.waitForFunction(
    () => (window as PortfolioWindow).portfolio?.debugCoordinates?.getState
  );
}

async function movePlayerTo(
  page: Page,
  target: { x: number; z: number; floorId?: FloorId }
) {
  await page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    world.movePlayerTo(next);
  }, target);
  await page.waitForTimeout(150);
}

async function getStairMetrics(page: Page): Promise<StairMetrics> {
  return page.evaluate(() => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairMetrics();
  });
}

async function getTooltipState(page: Page): Promise<PoiTooltipState> {
  return page.evaluate(() => {
    const getTooltipState = (window as PortfolioWindow).portfolio?.poi
      ?.getTooltipState;
    if (!getTooltipState) {
      throw new Error('Tooltip API unavailable');
    }
    return getTooltipState();
  });
}

async function getDebugCoordinatesState(
  page: Page
): Promise<DebugCoordinatesState> {
  return page.evaluate(() => {
    const getState = (window as PortfolioWindow).portfolio?.debugCoordinates
      ?.getState;
    if (!getState) {
      throw new Error('Debug coordinates API unavailable');
    }
    return getState();
  });
}

async function setDebugCoordinatesEnabled(page: Page, enabled: boolean) {
  await page.evaluate((nextEnabled) => {
    const setEnabled = (window as PortfolioWindow).portfolio?.debugCoordinates
      ?.setEnabled;
    if (!setEnabled) {
      throw new Error('Debug coordinates API unavailable');
    }
    setEnabled(nextEnabled);
  }, enabled);
}

function getLandingRegressionPoint(metrics: StairMetrics) {
  return {
    x: metrics.stairCenterX,
    z: metrics.stairTopZ - metrics.stairDirection * SCREENSHOT_LANDING_OFFSET,
  };
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

test('landing edge nudge stays upstairs but center descent still works', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const metrics = await getStairMetrics(page);
  const landingEdge = getLandingRegressionPoint(metrics);
  const nudgeTowardStairs = {
    x: landingEdge.x,
    z: landingEdge.z + metrics.stairDirection * SCREENSHOT_LANDING_NUDGE,
  };

  await movePlayerTo(page, { ...landingEdge, floorId: 'upper' });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');
  await expect
    .poll(() => getDebugCoordinatesState(page))
    .toMatchObject({
      activeFloorId: 'upper',
      predictedStairFloorId: 'upper',
      stairZone: 'safeUpperFloor',
    });

  await movePlayerTo(page, nudgeTowardStairs);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');
  await expect
    .poll(() => getDebugCoordinatesState(page))
    .toMatchObject({ activeFloorId: 'upper', predictedStairFloorId: 'upper' });

  await movePlayerTo(page, {
    x: metrics.stairCenterX,
    z: metrics.stairTopZ - metrics.stairDirection * INTENTIONAL_DESCENT_OFFSET,
  });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('debug coordinate overlay reports floor and XYZ upstairs', async ({
  page,
}) => {
  await waitForImmersiveReady(page);

  const metrics = await getStairMetrics(page);
  const upperLanding = getLandingRegressionPoint(metrics);
  const overlay = page.locator('.debug-coordinates');

  await setDebugCoordinatesEnabled(page, false);
  await expect(overlay).toBeHidden();
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');

  await movePlayerTo(page, { ...upperLanding, floorId: 'upper' });
  await setDebugCoordinatesEnabled(page, true);

  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(/XYZ/i);
  await expect(overlay).toContainText(/Active floor/i);
  await expect(overlay).toContainText(/upper/i);
  await expect
    .poll(() => getDebugCoordinatesState(page))
    .toMatchObject({ enabled: true, activeFloorId: 'upper' });

  const state = await getDebugCoordinatesState(page);
  expect(state.x).toBeCloseTo(upperLanding.x, 1);
  expect(state.z).toBeCloseTo(upperLanding.z, 1);
  expect(state.y).toBeGreaterThan(0);
});

test('upper floor suppresses ground POI marker labels and checkmarks', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const metrics = await getStairMetrics(page);

  // First activate a downstairs POI and mark it visited so label/checkmark state
  // exists before moving upstairs. The floor controller must suppress it there.
  await movePlayerTo(page, { x: 0, z: -4 });
  await page.keyboard.press('KeyE');
  await page.keyboard.press('Enter');
  await expect(page.locator('.poi-tooltip-overlay')).toHaveAttribute(
    'aria-hidden',
    'false'
  );

  await movePlayerTo(page, {
    x: metrics.stairCenterX,
    z: metrics.stairTopZ - 0.1,
    floorId: 'upper',
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-active-floor',
    'upper'
  );

  const state = await getTooltipState(page);
  expect(state.overlayVisiblePoiId).toBeNull();
  expect(state.worldTooltipVisible).toBe(false);
  expect(state.worldTooltipPoiId).toBeNull();
  expect(state.markerLabelPoiId).toBeNull();
  expect(state.visibleMarkerLabelCount).toBe(0);
  expect(state.visibleMarkerLabelPoiIds).toEqual([]);
  expect(state.activeInWorldTooltipCount).toBe(0);
  expect(state.totalInWorldTooltipCount).toBe(0);
  for (const poiId of GROUND_POI_IDS) {
    expect(state.visibleMarkerLabelPoiIds).not.toContain(poiId);
  }
});
