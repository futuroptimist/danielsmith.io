import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const GROUND_POI_IDS = [
  'futuroptimist-living-room-tv',
  'flywheel-studio-flywheel',
  'jobbot-studio-terminal',
  'f2clipboard-kitchen-console',
  'sigma-kitchen-workbench',
  'wove-kitchen-loom',
  'axel-studio-tracker',
  'tokenplace-studio-cluster',
  'gabriel-studio-sentry',
  'gitshelves-living-room-installation',
  'pr-reaper-backyard-console',
];

type FloorId = 'ground' | 'upper';

type StairTransitionZone =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor'
  | 'outsideStairs';

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
  stairZone: StairTransitionZone;
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

type TestWorldApi = {
  movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
  getActiveFloor(): FloorId;
  getPlayerPosition(): { x: number; y: number; z: number };
  getStairMetrics(): StairMetrics;
  predictFloorAt(target: {
    x: number;
    z: number;
    currentFloor?: FloorId;
  }): FloorId;
  getStairTransitionZone(target: {
    x: number;
    z: number;
    currentFloor?: FloorId;
  }): StairTransitionZone;
};

type PortfolioWindow = Window & {
  portfolio?: {
    world?: TestWorldApi;
    debugCoordinates?: {
      getState(): DebugCoordinatesState;
    };
    poi?: {
      getTooltipState(): PoiTooltipState;
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
    () =>
      Boolean(
        (window as PortfolioWindow).portfolio?.world?.getStairMetrics &&
          (window as PortfolioWindow).portfolio?.debugCoordinates?.getState &&
          (window as PortfolioWindow).portfolio?.poi?.getTooltipState
      ),
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
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

async function getPoiTooltipState(page: Page): Promise<PoiTooltipState> {
  return page.evaluate(() => {
    const getState = (window as PortfolioWindow).portfolio?.poi
      ?.getTooltipState;
    if (!getState) {
      throw new Error('POI tooltip API unavailable');
    }
    return getState();
  });
}

async function predictFloorAt(
  page: Page,
  target: { x: number; z: number; currentFloor?: FloorId }
): Promise<FloorId> {
  return page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.predictFloorAt(next);
  }, target);
}

async function getStairTransitionZone(
  page: Page,
  target: { x: number; z: number; currentFloor?: FloorId }
): Promise<StairTransitionZone> {
  return page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairTransitionZone(next);
  }, target);
}

async function openSettings(page: Page) {
  const settingsButton = page.locator('[data-role="settings-button"]');
  await settingsButton.click();
  await expect(page.locator('.help-modal-backdrop')).toBeVisible();
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

test('upper landing edge does not teleport while the stairwell still descends', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const metrics = await getStairMetrics(page);
  const landingEdgeX = metrics.stairCenterX + metrics.stairHalfWidth + 1.2;
  const landingEdgeZ = metrics.stairTopZ + 0.7;

  await movePlayerTo(page, {
    x: landingEdgeX,
    z: landingEdgeZ - 0.1,
    floorId: 'upper',
  });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  await expect
    .poll(() =>
      getStairTransitionZone(page, {
        x: landingEdgeX,
        z: landingEdgeZ,
        currentFloor: 'upper',
      })
    )
    .toBe('safeUpperFloor');
  await expect
    .poll(() =>
      predictFloorAt(page, {
        x: landingEdgeX,
        z: landingEdgeZ,
        currentFloor: 'upper',
      })
    )
    .toBe('upper');

  // This is the screenshot-4-style regression guard: nudging down at the
  // landing edge must not use the stairwell descent handoff.
  await movePlayerTo(page, { x: landingEdgeX, z: landingEdgeZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // The center of the stairwell remains the intentional descent corridor.
  await expect
    .poll(() =>
      getStairTransitionZone(page, {
        x: metrics.stairCenterX,
        z: landingEdgeZ,
        currentFloor: 'upper',
      })
    )
    .toBe('explicitDescentCorridor');
  await movePlayerTo(page, { x: metrics.stairCenterX, z: landingEdgeZ });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('debug overlay and POI state remain floor-aware upstairs', async ({
  page,
}) => {
  test.slow();
  await page.addInitScript(() => {
    window.localStorage.removeItem('danielsmith.io::debugCoordinates::v1');
  });
  await waitForImmersiveReady(page);

  const metrics = await getStairMetrics(page);
  await movePlayerTo(page, {
    x: metrics.stairCenterX,
    z: metrics.stairTopZ - 0.1,
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-active-floor',
    'upper'
  );

  await openSettings(page);
  const debugToggle = page.locator(
    '.help-modal-backdrop .debug-coordinates-toggle'
  );
  const overlay = page.locator('.debug-coordinates');
  await expect(overlay).toBeHidden();
  await debugToggle.click();
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText(/XYZ/i);
  await expect(overlay).toContainText(/Active floor/i);
  await expect(overlay).toContainText(/upper/i);

  await expect
    .poll(() => getDebugCoordinatesState(page))
    .toMatchObject({
      enabled: true,
      activeFloorId: 'upper',
      predictedStairFloorId: 'upper',
    });

  const debugState = await getDebugCoordinatesState(page);
  expect(Number.isFinite(debugState.x)).toBe(true);
  expect(Number.isFinite(debugState.y)).toBe(true);
  expect(Number.isFinite(debugState.z)).toBe(true);

  const poiState = await getPoiTooltipState(page);
  expect(poiState.visibleMarkerLabelPoiIds).toEqual(
    expect.not.arrayContaining(GROUND_POI_IDS)
  );
  expect(poiState.markerLabelPoiId).not.toEqual(expect.stringMatching(/./));
  expect(poiState.worldTooltipPoiId).toBeNull();
  expect(poiState.worldTooltipTitle).toBeNull();
  expect(poiState.activeInWorldTooltipCount).toBe(0);
  expect(poiState.totalInWorldTooltipCount).toBe(0);
});
