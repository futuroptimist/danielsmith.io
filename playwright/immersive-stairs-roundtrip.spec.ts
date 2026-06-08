import { expect, test, type Page } from '@playwright/test';

import { UPPER_FLOOR_PLAN } from '../src/assets/floorPlan';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

const GROUND_POI_IDS = [
  'futuroptimist-living-room-tv',
  'flywheel-studio-flywheel',
  'danielsmith-portfolio-table',
  'sigma-kitchen-workbench',
  'dspace-backyard-rocket',
];

type FloorId = 'ground' | 'upper';

type StairTransitionZone =
  | 'lowerStairEntrance'
  | 'stairRampBody'
  | 'upperLanding'
  | 'safeUpperFloor'
  | 'explicitDescentCorridor'
  | 'outsideStairs';

type TestWorldApi = {
  movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
  getActiveFloor(): FloorId;
  canOccupyPosition(target: {
    x: number;
    z: number;
    floorId?: FloorId;
  }): boolean;
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
  }): StairTransitionZone;
  getStairMetrics(): {
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
};

type DebugColliderApi = {
  setEnabled(enabled: boolean): void;
  getColliders(): Array<{ name: string }>;
};

type DebugCoordinatesApi = {
  getState(): {
    enabled: boolean;
    x: number;
    y: number;
    z: number;
    activeFloorId: FloorId;
    predictedStairFloorId: FloorId;
    stairZone: StairTransitionZone;
    currentRoomId: string | null;
  };
  setEnabled(enabled: boolean): void;
};

type TooltipState = {
  worldTooltipVisible: boolean;
  worldTooltipPoiId: string | null;
  worldTooltipTitle: string | null;
  visibleMarkerLabelCount: number;
  visibleMarkerLabelPoiIds: string[];
  activeInWorldTooltipCount: number;
  totalInWorldTooltipCount: number;
};

type PortfolioWindow = Window & {
  portfolio?: {
    world?: TestWorldApi;
    debugColliders?: DebugColliderApi;
    debugCoordinates?: DebugCoordinatesApi;
    poi?: {
      getTooltipState(): TooltipState;
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
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function getStairMetrics(page: Page) {
  return page.evaluate(() => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getStairMetrics();
  });
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

function getUpperRoomCenter(roomId: string) {
  const room = UPPER_FLOOR_PLAN.rooms.find(
    (candidate) => candidate.id === roomId
  );
  if (!room) {
    throw new Error(`Missing upper-floor room: ${roomId}`);
  }

  return {
    x: (room.bounds.minX + room.bounds.maxX) / 2,
    z: (room.bounds.minZ + room.bounds.maxZ) / 2,
    floorId: 'upper' as const,
  };
}

async function canOccupyPosition(
  page: Page,
  target: { x: number; z: number; floorId?: FloorId }
) {
  return page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.canOccupyPosition(next);
  }, target);
}

async function getWorldState(page: Page) {
  return page.evaluate(() => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return {
      activeFloor: world.getActiveFloor(),
      position: world.getPlayerPosition(),
    };
  });
}

async function getTooltipState(page: Page): Promise<TooltipState> {
  return page.evaluate(() => {
    const poi = (window as PortfolioWindow).portfolio?.poi;
    if (!poi) {
      throw new Error('POI API unavailable');
    }
    return poi.getTooltipState();
  });
}

test('off-stair ground points near the upper stair top stay on ground', async ({
  page,
}) => {
  await waitForImmersiveReady(page);

  const predictions = await page.evaluate(() => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return {
      source: world.predictFloorAt({
        x: 7.4,
        z: -25.27,
        currentFloor: 'ground',
      }),
      lifted: world.predictFloorAt({
        x: 8.14,
        z: -25.36,
        currentFloor: 'ground',
      }),
      sourceZone: world.getStairTransitionZone({
        x: 7.4,
        z: -25.27,
        currentFloor: 'ground',
      }),
      liftedZone: world.getStairTransitionZone({
        x: 8.14,
        z: -25.36,
        currentFloor: 'ground',
      }),
    };
  });

  expect(predictions).toEqual({
    source: 'ground',
    lifted: 'ground',
    sourceZone: 'outsideStairs',
    liftedZone: 'outsideStairs',
  });
});

test('ground stair east boundary blocks squeeze corners but preserves the stair path', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const { stairCenterX, stairBottomZ, stairTopZ } = await getStairMetrics(page);
  const squeezeSamples = [
    { x: 17.38, z: -8.84, floorId: 'ground' as const },
    { x: 21.35, z: -14.66, floorId: 'ground' as const },
    { x: 22.1, z: -14.66, floorId: 'ground' as const },
  ];
  const lowerEntrance = {
    x: stairCenterX,
    z: stairBottomZ + 0.3,
    floorId: 'ground' as const,
  };

  for (const sample of squeezeSamples) {
    expect(await canOccupyPosition(page, sample)).toBe(false);
    await expect(async () => movePlayerTo(page, sample)).rejects.toThrow(
      /Cannot occupy/
    );
  }

  expect(await canOccupyPosition(page, lowerEntrance)).toBe(true);
  await movePlayerTo(page, lowerEntrance);
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ + 0.1 });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  const debugColliders = await page.evaluate(() => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!debugApi) {
      throw new Error('Debug colliders API unavailable');
    }
    debugApi.setEnabled(true);
    return debugApi.getColliders().map((collider) => collider.name);
  });
  expect(debugColliders).toContain('GroundStairEastBoundary');
  expect(debugColliders).toContain('GroundStairLowerCornerGuard');
});

test('ascend stairs from spawn, roam, return and descend', async ({ page }) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const {
    stairCenterX,
    stairBottomZ,
    stairTopZ,
    stairLandingMinZ,
    stairLandingDepth,
    stairDirection,
  } = await getStairMetrics(page);

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
  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.1,
  });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Roam deeper onto the upper landing and confirm we stay upstairs.
  const landingRoamZ =
    stairLandingMinZ + Math.min(stairLandingDepth * 0.5, 0.6);
  await movePlayerTo(page, { x: stairCenterX, z: landingRoamZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Return toward the stairs, enter the explicit descent handoff, then continue down the ramp.
  // The helper teleports between sampled positions, so include the narrow handoff band that real
  // movement crosses frame by frame.
  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.1,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ + 0.7 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.35 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('upper landing opens west into upstairs rooms and blocks the hidden stair run', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const { stairCenterX, stairBottomZ, stairTopZ, stairDirection } =
    await getStairMetrics(page);
  const creatorsStudioCenter = getUpperRoomCenter('creatorsStudio');
  const westLandingEgress = {
    x: stairCenterX - 1.6,
    z: stairTopZ + stairDirection * 1.8,
    floorId: 'upper' as const,
  };
  const normalLoftSpace = { x: 8.15, z: -11.82, floorId: 'upper' as const };
  const normalLoftEastNudge = {
    ...normalLoftSpace,
    x: normalLoftSpace.x + 0.45,
  };
  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  if (!upperLandingRoom) {
    throw new Error('Missing upper landing room');
  }
  const loftDoorway = {
    x: stairCenterX,
    z: upperLandingRoom.bounds.maxZ,
    floorId: 'upper' as const,
  };
  const hiddenStairRun = { x: 12.7, z: -23.72, floorId: 'upper' as const };
  const hiddenStairTopRun = {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.4,
    floorId: 'upper' as const,
  };
  const westHiddenStairVoidGap = {
    x: stairCenterX - 1.9,
    z: stairTopZ + stairDirection * 0.95,
    floorId: 'upper' as const,
  };
  const deeperWestHiddenStairVoidGap = {
    x: stairCenterX - 1.9,
    z: stairTopZ + stairDirection * 2,
    floorId: 'upper' as const,
  };
  const westHiddenStairVoidSliver = {
    x: stairCenterX - 1.55,
    z: stairTopZ + stairDirection * 2.1,
    floorId: 'upper' as const,
  };
  const westEdgeFloorClearance = {
    x: 7.5,
    z: -23,
    floorId: 'upper' as const,
  };
  const westVoidBypass = {
    x: stairCenterX - 4.4,
    z: stairTopZ + stairDirection * 0.95,
    floorId: 'upper' as const,
  };
  const hiddenStairVoidGap = [
    {
      x: stairCenterX,
      z: stairTopZ + stairDirection * 0.1,
      floorId: 'upper' as const,
    },
    {
      x: stairCenterX,
      z: stairTopZ + stairDirection * 0.6,
      floorId: 'upper' as const,
    },
  ];

  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.3 });
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.1,
  });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  expect(await canOccupyPosition(page, westLandingEgress)).toBe(true);
  await movePlayerTo(page, westLandingEgress);
  await movePlayerTo(page, creatorsStudioCenter);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  expect(await canOccupyPosition(page, normalLoftSpace)).toBe(true);
  expect(await canOccupyPosition(page, normalLoftEastNudge)).toBe(true);
  expect(await canOccupyPosition(page, loftDoorway)).toBe(true);
  expect(await canOccupyPosition(page, westVoidBypass)).toBe(true);
  expect(await canOccupyPosition(page, westHiddenStairVoidGap)).toBe(false);
  expect(await canOccupyPosition(page, deeperWestHiddenStairVoidGap)).toBe(
    false
  );
  expect(await canOccupyPosition(page, westHiddenStairVoidSliver)).toBe(false);
  expect(await canOccupyPosition(page, westEdgeFloorClearance)).toBe(true);
  expect(await canOccupyPosition(page, hiddenStairTopRun)).toBe(false);
  for (const hiddenStairVoidGapSample of hiddenStairVoidGap) {
    expect(await canOccupyPosition(page, hiddenStairVoidGapSample)).toBe(false);
  }
  expect(await canOccupyPosition(page, hiddenStairRun)).toBe(false);
  await expect(async () => movePlayerTo(page, hiddenStairRun)).rejects.toThrow(
    /Cannot occupy/
  );
});

test('upper landing edge nudges stay upstairs until the descent corridor is entered', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const { stairCenterX, stairTopZ } = await getStairMetrics(page);
  const screenshotLandingEdge = {
    x: stairCenterX + 5,
    z: stairTopZ + 0.7,
    floorId: 'upper' as const,
  };

  await movePlayerTo(page, screenshotLandingEdge);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  const edgeState = await page.evaluate((target) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return {
      predicted: world.predictFloorAt({ ...target, currentFloor: 'upper' }),
      zone: world.getStairTransitionZone({ ...target, currentFloor: 'upper' }),
    };
  }, screenshotLandingEdge);
  expect(edgeState).toEqual({ predicted: 'upper', zone: 'safeUpperFloor' });

  // Regression guard for the screenshot-4 failure: small downward nudges along the landing edge
  // should not be treated as an intentional descent through the stairwell portal.
  for (const z of [stairTopZ + 0.55, stairTopZ + 0.4, stairTopZ + 0.25]) {
    await movePlayerTo(page, { x: screenshotLandingEdge.x, z });
    await expect(html).toHaveAttribute('data-active-floor', 'upper');
  }

  const stillUpstairs = await getWorldState(page);
  expect(stillUpstairs.activeFloor).toBe('upper');

  // Moving back to the center of the stair opening remains an intentional descent.
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ + 0.7 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('debug coordinates and upstairs POI state stay floor-aware', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const {
    stairCenterX,
    stairTopZ,
    stairLandingMinZ,
    stairLandingDepth,
    stairDirection,
  } = await getStairMetrics(page);
  const landingInteriorZ =
    stairLandingMinZ + Math.min(stairLandingDepth * 0.5, 0.6);

  await page.evaluate(() => {
    const debugCoordinates = (window as PortfolioWindow).portfolio
      ?.debugCoordinates;
    if (!debugCoordinates) {
      throw new Error('Debug coordinates API unavailable');
    }
    debugCoordinates.setEnabled(true);
  });

  const debugToggle = page.locator('.debug-coordinates-toggle');
  const debugOverlay = page.locator('.debug-coordinates');
  await expect(debugToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(debugOverlay).toBeVisible();

  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.1,
  });
  await movePlayerTo(page, { x: stairCenterX, z: landingInteriorZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  await expect(debugOverlay).toContainText('upper');
  await expect(debugOverlay).toContainText(
    /-?\d+\.\d{2},\s*-?\d+\.\d{2},\s*-?\d+\.\d{2}/
  );

  const debugState = await page.evaluate(() => {
    const debugCoordinates = (window as PortfolioWindow).portfolio
      ?.debugCoordinates;
    if (!debugCoordinates) {
      throw new Error('Debug coordinates API unavailable');
    }
    return debugCoordinates.getState();
  });
  expect(debugState.enabled).toBe(true);
  expect(debugState.activeFloorId).toBe('upper');
  expect(debugState.predictedStairFloorId).toBe('upper');
  expect(debugState.currentRoomId).toBeTruthy();

  const tooltipState = await getTooltipState(page);
  expect(tooltipState.worldTooltipVisible).toBe(false);
  expect(tooltipState.worldTooltipPoiId).toBeNull();
  expect(tooltipState.worldTooltipTitle).toBeNull();
  expect(tooltipState.visibleMarkerLabelCount).toBe(0);
  expect(tooltipState.activeInWorldTooltipCount).toBe(0);
  expect(tooltipState.totalInWorldTooltipCount).toBe(0);
  for (const groundPoiId of GROUND_POI_IDS) {
    expect(tooltipState.visibleMarkerLabelPoiIds).not.toContain(groundPoiId);
  }
});
