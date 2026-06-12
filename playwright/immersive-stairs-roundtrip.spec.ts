import { expect, test, type Page } from '@playwright/test';

import { UPPER_FLOOR_PLAN } from '../src/assets/floorPlan';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PLAYER_RADIUS = 0.75;

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

type FloorVisibilitySnapshot = {
  activeFloorId: FloorId;
  groundFloorVisible: boolean;
  groundPoiVisible: boolean;
  upperPoiVisible: boolean;
  groundEnvironmentVisible: boolean;
  groundStructureVisible: boolean;
  upperFloorVisible: boolean;
  backyardEnvironmentVisible: boolean | null;
};

type TestWorldApi = {
  movePlayerTo(target: { x: number; z: number; floorId?: FloorId }): void;
  stepPlayerForTest(step: { dx: number; dz: number }): {
    movedX: boolean;
    movedZ: boolean;
    activeFloor: FloorId;
    position: { x: number; y: number; z: number };
    blockedBy?: string[];
  };
  getActiveFloor(): FloorId;
  setActiveFloor(next: FloorId): void;
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
  getFloorVisibilitySnapshot(): FloorVisibilitySnapshot;
};

type DebugColliderBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type DebugColliderMetadata = {
  id: string;
  floor: FloorId | 'all';
  category: string;
  name: string;
  bounds: DebugColliderBounds;
};

type DebugColliderApi = {
  setEnabled(enabled: boolean): void;
  getColliders(): DebugColliderMetadata[];
  getBlockingCollidersAt(target: {
    x: number;
    z: number;
    floorId?: FloorId;
  }): DebugColliderMetadata[];
  getColliderById(id: string): DebugColliderMetadata | undefined;
};

function expectCloseTo(
  actual: number,
  expected: number,
  tolerance: number,
  label: string
) {
  expect(
    Math.abs(actual - expected),
    `${label}: expected ${actual} to be within ${tolerance} of ${expected}`
  ).toBeLessThanOrEqual(tolerance);
}

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

type NamedPosition = {
  name: string;
  target: { x: number; z: number; floorId?: FloorId };
};

function expectSampleOnPhysicalStaircaseLanding(
  sample: NamedPosition,
  metrics: Awaited<ReturnType<typeof getStairMetrics>>
) {
  const landingMinX = metrics.stairCenterX - metrics.stairHalfWidth;
  const landingMaxX = metrics.stairCenterX + metrics.stairHalfWidth;
  const landingMinZ = Math.min(
    metrics.stairLandingMinZ,
    metrics.stairLandingMaxZ
  );
  const landingMaxZ = Math.max(
    metrics.stairLandingMinZ,
    metrics.stairLandingMaxZ
  );

  expect(
    sample.target.x,
    `${sample.name} x should sit on the visible StaircaseLanding slab`
  ).toBeGreaterThanOrEqual(landingMinX);
  expect(
    sample.target.x,
    `${sample.name} x should sit on the visible StaircaseLanding slab`
  ).toBeLessThanOrEqual(landingMaxX);
  expect(
    sample.target.z,
    `${sample.name} z should sit on the visible StaircaseLanding slab`
  ).toBeGreaterThanOrEqual(landingMinZ);
  expect(
    sample.target.z,
    `${sample.name} z should sit on the visible StaircaseLanding slab`
  ).toBeLessThanOrEqual(landingMaxZ);
}

function expectSampleOutsidePhysicalStaircaseLanding(
  sample: NamedPosition,
  metrics: Awaited<ReturnType<typeof getStairMetrics>>
) {
  const landingMinX = metrics.stairCenterX - metrics.stairHalfWidth;
  const landingMaxX = metrics.stairCenterX + metrics.stairHalfWidth;
  const landingMinZ = Math.min(
    metrics.stairLandingMinZ,
    metrics.stairLandingMaxZ
  );
  const landingMaxZ = Math.max(
    metrics.stairLandingMinZ,
    metrics.stairLandingMaxZ
  );
  const isOnLandingSlab =
    sample.target.x >= landingMinX &&
    sample.target.x <= landingMaxX &&
    sample.target.z >= landingMinZ &&
    sample.target.z <= landingMaxZ;

  expect(
    isOnLandingSlab,
    `${sample.name} should sit in the no-floor stairwell cutout, not on the visible StaircaseLanding slab`
  ).toBe(false);
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

async function getBlockingColliderNames(
  page: Page,
  target: { x: number; z: number; floorId?: FloorId }
) {
  return page.evaluate((next) => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!debugApi) {
      throw new Error('Debug colliders API unavailable');
    }
    return debugApi
      .getBlockingCollidersAt(next)
      .map((collider) => collider.name);
  }, target);
}

async function getDebugColliders(page: Page) {
  return page.evaluate(() => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!debugApi) {
      throw new Error('Debug colliders API unavailable');
    }
    debugApi.setEnabled(true);
    return debugApi.getColliders();
  });
}

async function walkStairCenterlineToUpperLanding(page: Page) {
  const {
    stairCenterX,
    stairBottomZ,
    stairTopZ,
    stairDirection,
    upperFloorElevation,
  } = await getStairMetrics(page);
  const entranceZ = stairBottomZ - stairDirection * 0.3;
  await movePlayerTo(page, {
    x: stairCenterX,
    z: entranceZ,
    floorId: 'ground',
  });

  const targetZ = stairTopZ + stairDirection * 0.9;
  const stepZ = stairDirection * 0.12;
  const walkResults = await page.evaluate(
    ({
      targetZ: nextTargetZ,
      stepZ: nextStepZ,
      stairDirection: nextDirection,
    }) => {
      const world = (window as PortfolioWindow).portfolio?.world;
      if (!world) {
        throw new Error('World API unavailable');
      }

      const results: Array<{
        before: {
          activeFloor: FloorId;
          position: { x: number; y: number; z: number };
        };
        result: ReturnType<TestWorldApi['stepPlayerForTest']>;
      }> = [];

      for (let index = 0; index < 260; index += 1) {
        const before = {
          activeFloor: world.getActiveFloor(),
          position: world.getPlayerPosition(),
        };
        if (
          nextDirection === -1
            ? before.position.z <= nextTargetZ
            : before.position.z >= nextTargetZ
        ) {
          break;
        }

        results.push({
          before,
          result: world.stepPlayerForTest({ dx: 0, dz: nextStepZ }),
        });
      }

      return {
        results,
        finalState: {
          activeFloor: world.getActiveFloor(),
          position: world.getPlayerPosition(),
        },
      };
    },
    { targetZ, stepZ, stairDirection }
  );

  let sawUpper = false;
  let firstUpperZ: number | null = null;
  for (const { before, result } of walkResults.results) {
    expect(
      result.movedZ,
      `blocked at z=${before.position.z}: ${result.blockedBy}`
    ).toBe(true);
    expect(Math.abs(result.position.x - stairCenterX)).toBeLessThan(0.001);
    if (!sawUpper && result.activeFloor === 'upper') {
      sawUpper = true;
      firstUpperZ = result.position.z;
      if (stairDirection === -1) {
        expect(result.position.z).toBeLessThanOrEqual(stairTopZ + 0.02);
      } else {
        expect(result.position.z).toBeGreaterThanOrEqual(stairTopZ - 0.02);
      }
    }

    if (!sawUpper) {
      expect(result.activeFloor).toBe('ground');
    }
  }

  expect(sawUpper, 'expected floor handoff during continuous stair walk').toBe(
    true
  );
  expect(firstUpperZ).not.toBeNull();
  expect(walkResults.finalState.activeFloor).toBe('upper');
  expect(walkResults.finalState.position.y).toBeGreaterThanOrEqual(
    PLAYER_RADIUS + upperFloorElevation - 0.01
  );

  return walkResults.finalState;
}

async function walkUpperLandingWestExitToCreatorsStudio(page: Page) {
  const { stairCenterX, stairHalfWidth, stairTopZ, stairDirection } =
    await getStairMetrics(page);
  const upperLandingRoom = UPPER_FLOOR_PLAN.rooms.find(
    (room) => room.id === 'upperLanding'
  );
  const westDoorway = upperLandingRoom?.doorways?.find(
    (doorway) => doorway.wall === 'west'
  );
  if (!upperLandingRoom || !westDoorway) {
    throw new Error('Missing upper landing west doorway');
  }

  const creatorsStudioCenter = getUpperRoomCenter('creatorsStudio');
  const doorwayZ = Math.max(westDoorway.start + PLAYER_RADIUS, -29);
  const egressLaneX = stairCenterX - stairHalfWidth + PLAYER_RADIUS * 0.75;
  const westLandingExitX = upperLandingRoom.bounds.minX + PLAYER_RADIUS;
  const creatorsDoorwayEntryX = upperLandingRoom.bounds.minX - PLAYER_RADIUS;

  return page.evaluate(
    ({ waypoints }) => {
      const world = (window as PortfolioWindow).portfolio?.world;
      const debugCoordinates = (window as PortfolioWindow).portfolio
        ?.debugCoordinates;
      if (!world || !debugCoordinates) {
        throw new Error('World/debug coordinates API unavailable');
      }

      const maxStep = 0.18;
      const steps: Array<ReturnType<TestWorldApi['stepPlayerForTest']>> = [];

      for (const waypoint of waypoints) {
        for (let index = 0; index < 320; index += 1) {
          const position = world.getPlayerPosition();
          const remainingX = waypoint.x - position.x;
          const remainingZ = waypoint.z - position.z;
          if (Math.abs(remainingX) < 0.001 && Math.abs(remainingZ) < 0.001) {
            break;
          }

          const dx = Math.max(-maxStep, Math.min(maxStep, remainingX));
          const dz = Math.max(-maxStep, Math.min(maxStep, remainingZ));
          if (Math.abs(dx) > maxStep || Math.abs(dz) > maxStep) {
            throw new Error(`Step exceeded ${maxStep}: dx=${dx}, dz=${dz}`);
          }

          const result = world.stepPlayerForTest({ dx, dz });
          steps.push(result);
          const blockedAxis =
            (dx !== 0 && !result.movedX) || (dz !== 0 && !result.movedZ);
          if (blockedAxis) {
            throw new Error(
              `Blocked walking to (${waypoint.x.toFixed(2)}, ${waypoint.z.toFixed(
                2
              )}) from (${position.x.toFixed(2)}, ${position.z.toFixed(
                2
              )}): ${(result.blockedBy ?? []).join(', ')}`
            );
          }
          if (result.activeFloor !== 'upper') {
            throw new Error(
              `Expected upper floor during landing egress, got ${result.activeFloor}`
            );
          }
        }
      }

      return {
        steps,
        finalState: world.getPlayerPosition(),
        debugState: debugCoordinates.getState(),
      };
    },
    {
      waypoints: [
        { x: stairCenterX, z: stairTopZ + stairDirection * 0.05 },
        { x: egressLaneX, z: stairTopZ + stairDirection * 0.05 },
        { x: egressLaneX, z: doorwayZ },
        { x: westLandingExitX, z: doorwayZ },
        { x: creatorsDoorwayEntryX, z: doorwayZ },
        { x: creatorsStudioCenter.x, z: doorwayZ },
        { x: creatorsStudioCenter.x, z: creatorsStudioCenter.z },
      ],
    }
  );
}

async function walkUpperDescentLipBand(page: Page) {
  const { stairCenterX, stairTopZ, stairDirection } =
    await getStairMetrics(page);
  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ + stairDirection * 0.05,
    floorId: 'upper',
  });

  return page.evaluate(
    ({
      stairCenterX: nextStairCenterX,
      stairTopZ: nextStairTopZ,
      stairDirection: nextDirection,
    }) => {
      const world = (window as PortfolioWindow).portfolio?.world;
      if (!world) {
        throw new Error('World API unavailable');
      }

      let startZ: number | null = null;
      for (let index = 1; index <= 40; index += 1) {
        const candidateZ = nextStairTopZ - nextDirection * index * 0.05;
        const zone = world.getStairTransitionZone({
          x: nextStairCenterX,
          z: candidateZ,
          currentFloor: 'upper',
        });
        if (zone === 'explicitDescentCorridor') {
          startZ = candidateZ;
          break;
        }
      }
      if (startZ === null) {
        throw new Error('Unable to find explicit descent corridor start');
      }

      world.movePlayerTo({ x: nextStairCenterX, z: startZ });
      world.setActiveFloor('upper');

      const stepZ = -nextDirection * 0.06;
      const targetZ = nextStairTopZ - nextDirection * 0.8;
      const samples: Array<{
        activeFloor: FloorId;
        position: { x: number; y: number; z: number };
        upperZone: StairTransitionZone;
      }> = [];

      for (let index = 0; index < 80; index += 1) {
        const before = world.getPlayerPosition();
        if (nextDirection === 1 ? before.z <= targetZ : before.z >= targetZ) {
          break;
        }

        const result = world.stepPlayerForTest({ dx: 0, dz: stepZ });
        if (!result.movedZ) {
          throw new Error(
            `Blocked descending at z=${before.z.toFixed(2)}: ${(result.blockedBy ?? []).join(', ')}`
          );
        }
        if (Math.abs(result.position.x - nextStairCenterX) > 0.001) {
          throw new Error(
            `Descent drifted off centerline to x=${result.position.x}`
          );
        }

        samples.push({
          activeFloor: result.activeFloor,
          position: result.position,
          upperZone: world.getStairTransitionZone({
            x: result.position.x,
            z: result.position.z,
            currentFloor: 'upper',
          }),
        });
      }

      return samples;
    },
    { stairCenterX, stairTopZ, stairDirection }
  );
}

async function walkRuntimeUpperLandingMouthDescent(page: Page) {
  const { stairCenterX, stairTopZ, stairDirection } =
    await getStairMetrics(page);

  return page.evaluate(
    ({
      stairCenterX: nextStairCenterX,
      stairTopZ: nextStairTopZ,
      stairDirection: nextDirection,
    }) => {
      const world = (window as PortfolioWindow).portfolio?.world;
      if (!world) {
        throw new Error('World API unavailable');
      }

      const forbiddenBlockers = [
        'UpperStairHiddenRunBlocker',
        'UpperStairWestBannisterGuard',
        'UpperStairNorthBannisterGuard',
      ];
      const stepZ = -nextDirection * 0.06;
      const samples: Array<ReturnType<TestWorldApi['stepPlayerForTest']>> = [];

      for (let index = 0; index < 180; index += 1) {
        const before = world.getPlayerPosition();
        if (world.getActiveFloor() === 'ground') {
          break;
        }
        if (Math.abs(before.x - nextStairCenterX) > 0.001) {
          throw new Error(`Descent did not start on centerline: x=${before.x}`);
        }
        if (
          nextDirection === 1
            ? before.z < nextStairTopZ - 1
            : before.z > nextStairTopZ + 1
        ) {
          throw new Error(
            `Still upstairs after leaving handoff band at z=${before.z}`
          );
        }

        const result = world.stepPlayerForTest({ dx: 0, dz: stepZ });
        samples.push(result);
        const blockedBy = result.blockedBy ?? [];
        const forbiddenHit = blockedBy.find((name) =>
          forbiddenBlockers.includes(name)
        );
        if (forbiddenHit) {
          throw new Error(`Runtime descent blocked by ${blockedBy.join(', ')}`);
        }
        if (!result.movedZ) {
          throw new Error(
            `Runtime descent step rejected at z=${before.z.toFixed(2)} by ${blockedBy.join(', ')}`
          );
        }
        if (Math.abs(result.position.x - nextStairCenterX) > 0.001) {
          throw new Error(
            `Runtime descent drifted off centerline to x=${result.position.x}`
          );
        }
      }

      return {
        samples,
        finalState: {
          activeFloor: world.getActiveFloor(),
          position: world.getPlayerPosition(),
        },
      };
    },
    { stairCenterX, stairTopZ, stairDirection }
  );
}

async function stepRuntimeIntoUpperStairGuard(
  page: Page,
  start: { x: number; z: number },
  step: { dx: number; dz: number }
) {
  await movePlayerTo(page, { ...start, floorId: 'upper' });
  return page.evaluate((nextStep) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }

    let lastResult: ReturnType<TestWorldApi['stepPlayerForTest']> | null = null;
    for (let index = 0; index < 24; index += 1) {
      const result = world.stepPlayerForTest(nextStep);
      lastResult = result;
      const blockedAxis =
        (nextStep.dx !== 0 && !result.movedX) ||
        (nextStep.dz !== 0 && !result.movedZ);
      if (blockedAxis) {
        return result;
      }
    }

    throw new Error(
      `Runtime stairwell entry was not blocked; last result=${JSON.stringify(lastResult)}`
    );
  }, step);
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

async function getFloorVisibilitySnapshot(
  page: Page
): Promise<FloorVisibilitySnapshot> {
  return page.evaluate(() => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.getFloorVisibilitySnapshot();
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

test('upper landing debug colliders exclude middle landing artifact', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const removedBroadStairBlockers = [
    'UpperStairDeepVoidBlocker',
    'UpperStairHiddenRunBlocker',
  ];
  // These names were removed by earlier stair-artifact fixes. Keep them in a
  // separate regression assertion so this PR's removed blockers stay clear.
  const previouslyRemovedArtifactColliders = [
    'UpperStairTopGapBlockerWest',
    'UpperStairEastLandingMouthVoidGuard',
  ];

  await walkStairCenterlineToUpperLanding(page);
  const debugColliders = await getDebugColliders(page);
  const debugColliderNames = debugColliders.map((collider) => collider.name);
  for (const removedBroadBlocker of removedBroadStairBlockers) {
    expect(debugColliderNames).not.toContain(removedBroadBlocker);
  }
  for (const previouslyRemovedCollider of previouslyRemovedArtifactColliders) {
    expect(debugColliderNames).not.toContain(previouslyRemovedCollider);
  }
  expect(debugColliderNames).toContain('UpperStairWestBannisterGuard');
  expect(debugColliderNames).toContain('UpperStairNorthBannisterGuard');
  expect(debugColliderNames).toContain('UpperStairHiddenRunVoidGuard');

  const debugColliderIds = debugColliders.map((collider) => collider.id);
  expect(debugColliderIds.length).toBeGreaterThan(0);
  expect(new Set(debugColliderIds).size).toBe(debugColliderIds.length);
  expect(
    debugColliderIds.every((id) => /^[0-9A-F]{4,}(?:-[0-9A-Z]+)?$/.test(id))
  ).toBe(true);
  const firstDebugCollider = debugColliders[0];
  const foundById = await page.evaluate((id) => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!debugApi) {
      throw new Error('Debug colliders API unavailable');
    }
    return debugApi.getColliderById(id);
  }, firstDebugCollider.id);
  expect(foundById).toEqual(firstDebugCollider);

  const westBannister = debugColliders.find(
    (collider) => collider.name === 'UpperStairWestBannisterGuard'
  );
  const northBannister = debugColliders.find(
    (collider) => collider.name === 'UpperStairNorthBannisterGuard'
  );
  const hiddenRunGuard = debugColliders.find(
    (collider) => collider.name === 'UpperStairHiddenRunVoidGuard'
  );
  expect(westBannister).toBeDefined();
  expect(northBannister).toBeDefined();
  expect(hiddenRunGuard).toBeDefined();
  if (!westBannister || !northBannister || !hiddenRunGuard) {
    throw new Error('Missing upper stair guard debug collider');
  }

  const northBannisterCenterZ =
    (northBannister.bounds.minZ + northBannister.bounds.maxZ) / 2;
  expectCloseTo(westBannister.bounds.minX, 8.9, 0.05, 'west bannister min x');
  expectCloseTo(westBannister.bounds.maxX, 9.3, 0.05, 'west bannister max x');
  expectCloseTo(
    westBannister.bounds.minZ,
    -24.68,
    0.08,
    'west bannister min z'
  );
  expectCloseTo(
    westBannister.bounds.maxZ,
    -18.25,
    0.08,
    'west bannister max z'
  );
  expectCloseTo(
    northBannisterCenterZ,
    -18.25,
    0.05,
    'north bannister center z'
  );
  expectCloseTo(
    northBannister.bounds.minX,
    10.4,
    0.08,
    'north bannister min x'
  );
  expectCloseTo(
    northBannister.bounds.maxX,
    15.58,
    0.08,
    'north bannister max x'
  );
  expect(hiddenRunGuard.bounds.minZ).toBeGreaterThan(-24);
  expect(hiddenRunGuard.bounds.minZ).toBeLessThan(-23.2);
  expect(hiddenRunGuard.bounds.maxZ).toBeGreaterThan(-19.3);
  expect(hiddenRunGuard.bounds.maxZ).toBeLessThan(-19.0);

  const stairMetrics = await getStairMetrics(page);
  const visibleMiddleLandingArtifactSamples: NamedPosition[] = [
    {
      name: 'visible middle-landing artifact center',
      target: { x: 12.99, z: -26.84, floorId: 'upper' as const },
    },
    {
      name: 'visible middle-landing artifact west edge',
      target: { x: 12.84, z: -26.84, floorId: 'upper' as const },
    },
    {
      name: 'visible middle-landing artifact east edge',
      target: { x: 13.14, z: -26.84, floorId: 'upper' as const },
    },
    {
      name: 'visible middle-landing artifact north edge',
      target: { x: 12.99, z: -26.72, floorId: 'upper' as const },
    },
    {
      name: 'visible middle-landing artifact south edge',
      target: { x: 12.99, z: -26.96, floorId: 'upper' as const },
    },
  ];
  const physicalLandingSamplesAtFormerZ29: NamedPosition[] = [
    {
      name: 'former UpperStairDeepVoidBlocker z=-29 landing center',
      target: { x: 12.99, z: -29, floorId: 'upper' as const },
    },
    {
      name: 'former UpperStairDeepVoidBlocker z=-29 landing west sample',
      target: { x: 12.84, z: -29, floorId: 'upper' as const },
    },
    {
      name: 'former UpperStairDeepVoidBlocker z=-29 landing east sample',
      target: { x: 13.14, z: -29, floorId: 'upper' as const },
    },
  ];
  const noFloorHiddenCutoutSamples: Array<
    NamedPosition & { expectedBlocker: string }
  > = [
    {
      name: 'east no-floor cutout beside z=-29 landing sample',
      target: { x: 15.75, z: -29, floorId: 'upper' as const },
      expectedBlocker: 'UpperStairEastLowerVoidGuard',
    },
    {
      name: 'south no-floor cutout beyond StaircaseLanding slab',
      target: { x: 12.99, z: -31.35, floorId: 'upper' as const },
      expectedBlocker: 'UpperStairwellLandingGuard-2',
    },
    {
      name: 'west side-entry hidden-run guard beside stair cutout',
      target: { x: 10.59, z: -23.72, floorId: 'upper' as const },
      expectedBlocker: 'UpperStairHiddenRunVoidGuard',
    },
    {
      name: 'north back-entry bannister guard behind stair opening',
      target: { x: 12.7, z: -18.25, floorId: 'upper' as const },
      expectedBlocker: 'UpperStairNorthBannisterGuard',
    },
  ];

  for (const sample of [
    ...visibleMiddleLandingArtifactSamples,
    ...physicalLandingSamplesAtFormerZ29,
  ]) {
    expectSampleOnPhysicalStaircaseLanding(sample, stairMetrics);
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      true
    );
    const blockingColliderNames = await getBlockingColliderNames(
      page,
      sample.target
    );
    for (const removedBroadBlocker of removedBroadStairBlockers) {
      expect(blockingColliderNames, sample.name).not.toContain(
        removedBroadBlocker
      );
    }
    expect(blockingColliderNames, sample.name).toEqual([]);
  }

  for (const sample of noFloorHiddenCutoutSamples) {
    expectSampleOutsidePhysicalStaircaseLanding(sample, stairMetrics);
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      false
    );
    const blockingColliderNames = await getBlockingColliderNames(
      page,
      sample.target
    );
    expect(blockingColliderNames, sample.name).toContain(
      sample.expectedBlocker
    );
    const blockingColliderIds = await page.evaluate((target) => {
      const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
      if (!debugApi) {
        throw new Error('Debug colliders API unavailable');
      }
      return debugApi
        .getBlockingCollidersAt(target)
        .map((collider) => collider.id);
    }, sample.target);
    expect(
      blockingColliderIds.every((id) =>
        /^[0-9A-F]{4,}(?:-[0-9A-Z]+)?$/.test(id)
      )
    ).toBe(true);
    expect(blockingColliderNames.length, sample.name).toBeGreaterThan(0);
  }
});

test('runtime descent from upper landing mouth stays clear of bannister guards', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  await walkStairCenterlineToUpperLanding(page);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  const descent = await walkRuntimeUpperLandingMouthDescent(page);
  expect(descent.samples.length).toBeGreaterThan(0);
  expect(descent.finalState.activeFloor).toBe('ground');
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
});

test('ground stair east boundary blocks squeeze corners but preserves the stair path', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const { stairCenterX, stairBottomZ, stairTopZ } = await getStairMetrics(page);
  const blockedSamples = [
    { x: 17.38, z: -8.84, floorId: 'ground' as const },
    { x: 21.35, z: -14.66, floorId: 'ground' as const },
    { x: 22.1, z: -14.66, floorId: 'ground' as const },
  ];
  const livingRoomSamples = [
    { x: 23, z: -18, floorId: 'ground' as const },
    { x: 24, z: -18, floorId: 'ground' as const },
  ];
  const lowerEntrance = {
    x: stairCenterX,
    z: stairBottomZ + 0.3,
    floorId: 'ground' as const,
  };

  for (const sample of blockedSamples) {
    expect(await canOccupyPosition(page, sample)).toBe(false);
    await expect(async () => movePlayerTo(page, sample)).rejects.toThrow(
      /Cannot occupy/
    );
  }

  for (const sample of livingRoomSamples) {
    expect(await canOccupyPosition(page, sample)).toBe(true);
  }
  expect(await canOccupyPosition(page, lowerEntrance)).toBe(true);
  await movePlayerTo(page, lowerEntrance);
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairTopZ - 0.1 });
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
  expect(debugColliders).not.toContain('GroundStairEastRunSeal');
  expect(debugColliders).not.toContain('GroundStairEastRunSealLowerCap');
  expect(debugColliders).not.toContain('GroundStairEastRunSealUpperCap');
});

test('ascend stairs from spawn, roam, return and descend', async ({ page }) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const stairMetrics = await getStairMetrics(page);
  const {
    stairCenterX,
    stairHalfWidth,
    stairBottomZ,
    stairTopZ,
    stairLandingMinZ,
    stairLandingDepth,
    stairDirection,
  } = stairMetrics;

  // Start on ground.
  await expect(html).toHaveAttribute('data-active-floor', 'ground');

  // Walk the real axis-by-axis movement path from the lower entrance onto the landing.
  await walkStairCenterlineToUpperLanding(page);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  for (const landingOffset of [0.05, 0.4, 0.8]) {
    const landingHandoffSample = {
      x: stairCenterX,
      z: stairTopZ + stairDirection * landingOffset,
      floorId: 'upper' as const,
    };
    expect(await canOccupyPosition(page, landingHandoffSample)).toBe(true);
    expect(await getBlockingColliderNames(page, landingHandoffSample)).toEqual(
      []
    );
  }

  const leftDescentLaneX = stairCenterX - stairHalfWidth + PLAYER_RADIUS + 0.05;
  for (const descentOffset of [0.1, 0.45, 0.85]) {
    for (const x of [stairCenterX, leftDescentLaneX]) {
      const descentCorridorSample = {
        x,
        z: stairTopZ - stairDirection * descentOffset,
        floorId: 'upper' as const,
      };
      expect(await canOccupyPosition(page, descentCorridorSample)).toBe(true);
      expect(
        await getBlockingColliderNames(page, descentCorridorSample)
      ).toEqual([]);
    }
  }

  const landingWestEgressLaneX =
    stairCenterX - stairHalfWidth + PLAYER_RADIUS * 0.75;
  for (const z of [-26.14, -27.5, -29, -30.5, -31.24]) {
    const egressSample = {
      x: landingWestEgressLaneX,
      z,
      floorId: 'upper' as const,
    };
    expect(await canOccupyPosition(page, egressSample)).toBe(true);
    expect(await getBlockingColliderNames(page, egressSample)).toEqual([]);
  }

  const formerMiddleLandingArtifactZ = -29;
  const formerLandingArtifactSamples: NamedPosition[] = [
    {
      name: 'former UpperStairDeepVoidBlocker west landing sample',
      target: {
        x: stairCenterX - stairHalfWidth + PLAYER_RADIUS,
        z: formerMiddleLandingArtifactZ,
        floorId: 'upper' as const,
      },
    },
    {
      name: 'former UpperStairDeepVoidBlocker center landing sample',
      target: {
        x: stairCenterX,
        z: formerMiddleLandingArtifactZ,
        floorId: 'upper' as const,
      },
    },
  ];
  for (const sample of formerLandingArtifactSamples) {
    expectSampleOnPhysicalStaircaseLanding(sample, stairMetrics);
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      true
    );
    expect(
      await getBlockingColliderNames(page, sample.target),
      sample.name
    ).toEqual([]);
  }

  const eastVoidGuardSample = {
    x: stairCenterX + stairHalfWidth - PLAYER_RADIUS,
    z: formerMiddleLandingArtifactZ,
    floorId: 'upper' as const,
  };
  expect(await canOccupyPosition(page, eastVoidGuardSample)).toBe(false);
  expect(await getBlockingColliderNames(page, eastVoidGuardSample)).toContain(
    'UpperStairEastLowerVoidGuard'
  );

  // Continue through the intended west upper-landing exit into an upstairs room
  // with the same step helper used by runtime movement instead of teleporting.
  const egressWalk = await walkUpperLandingWestExitToCreatorsStudio(page);
  expect(egressWalk.steps.length).toBeGreaterThan(0);
  expect(egressWalk.debugState.currentRoomId).toBe('creatorsStudio');
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  // Roam deeper onto the upper landing and confirm we stay upstairs.
  const landingRoamZ =
    stairLandingMinZ + Math.min(stairLandingDepth * 0.5, 0.6);
  await movePlayerTo(page, { x: stairCenterX, z: landingRoamZ });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  const upperTooltipState = await getTooltipState(page);
  expect(upperTooltipState.visibleMarkerLabelPoiIds).not.toEqual(
    expect.arrayContaining(GROUND_POI_IDS)
  );
  expect(await getFloorVisibilitySnapshot(page)).toMatchObject({
    activeFloorId: 'upper',
    groundFloorVisible: false,
    groundPoiVisible: false,
    upperPoiVisible: true,
    groundEnvironmentVisible: false,
    groundStructureVisible: false,
    upperFloorVisible: true,
    backyardEnvironmentVisible: false,
  });

  // Return toward the stairs with continuous upper→ground steps. The first ground
  // samples should keep the upper-origin lip blend instead of snapping to raw ramp height.
  const descentSamples = await walkUpperDescentLipBand(page);
  const descentGroundSamples = descentSamples.filter(
    (sample) =>
      sample.activeFloor === 'ground' &&
      sample.upperZone === 'explicitDescentCorridor'
  );
  expect(descentGroundSamples.length).toBeGreaterThan(3);
  for (let index = 1; index < descentGroundSamples.length; index += 1) {
    const previousY = descentGroundSamples[index - 1].position.y;
    const currentY = descentGroundSamples[index].position.y;
    expect(currentY).toBeLessThanOrEqual(previousY + 0.01);
    expect(previousY - currentY).toBeLessThan(0.2);
  }
  expect(descentGroundSamples[0].position.y).toBeGreaterThan(
    descentGroundSamples[descentGroundSamples.length - 1].position.y
  );
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.35 });
  await expect(html).toHaveAttribute('data-active-floor', 'ground');
  expect(await getFloorVisibilitySnapshot(page)).toMatchObject({
    activeFloorId: 'ground',
    groundFloorVisible: true,
    groundPoiVisible: true,
    upperPoiVisible: false,
    groundEnvironmentVisible: true,
    groundStructureVisible: true,
    upperFloorVisible: false,
    backyardEnvironmentVisible: true,
  });
});

test('upper landing opens west into upstairs rooms and blocks side/back stair entry', async ({
  page,
}) => {
  test.slow();
  await waitForImmersiveReady(page);

  const html = page.locator('html');
  const stairMetrics = await getStairMetrics(page);
  const {
    stairCenterX,
    stairHalfWidth,
    stairBottomZ,
    stairTopZ,
    stairDirection,
  } = stairMetrics;
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
  const westSideStairEntry = { x: 9.3, z: -23.72, floorId: 'upper' as const };
  const northBackStairEntry = {
    x: 12.7,
    z: -18.25,
    floorId: 'upper' as const,
  };
  const hiddenStairTopRun = {
    x: stairCenterX,
    z: stairTopZ - stairDirection * 0.4,
    floorId: 'upper' as const,
  };
  const westLandingMouthClearance = {
    x: stairCenterX - PLAYER_RADIUS * 0.5,
    z: stairTopZ + stairDirection * 0.95,
    floorId: 'upper' as const,
  };
  const physicalLandingSamples: NamedPosition[] = [
    {
      name: 'former UpperStairDeepVoidBlocker west landing sample',
      target: {
        x: stairCenterX - 1.9,
        z: stairTopZ + stairDirection * 2,
        floorId: 'upper' as const,
      },
    },
    {
      name: 'former UpperStairDeepVoidBlocker west egress landing sample',
      target: {
        x: stairCenterX - 1.55,
        z: stairTopZ + stairDirection * 2.1,
        floorId: 'upper' as const,
      },
    },
  ];
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
  const firstUpperLandingStep = {
    x: stairCenterX,
    z: stairTopZ + stairDirection * 0.4,
    floorId: 'upper' as const,
  };
  const explicitDescentCorridorMaxX =
    stairCenterX + stairHalfWidth - PLAYER_RADIUS;
  const eastUpperLandingMouth = {
    x: explicitDescentCorridorMaxX,
    z: stairTopZ + stairDirection * 0.95,
    floorId: 'upper' as const,
  };
  const formerLandingArtifactSamples: NamedPosition[] = [
    {
      name: 'former UpperStairDeepVoidBlocker center landing sample',
      target: { x: stairCenterX, z: -28.8, floorId: 'upper' as const },
    },
    {
      name: 'former UpperStairDeepVoidBlocker east landing sample',
      target: {
        x: stairCenterX + PLAYER_RADIUS * 0.5,
        z: -29,
        floorId: 'upper' as const,
      },
    },
  ];

  await movePlayerTo(page, { x: stairCenterX, z: stairBottomZ + 0.3 });
  await movePlayerTo(page, {
    x: stairCenterX,
    z: (stairBottomZ + stairTopZ) / 2,
  });
  await movePlayerTo(page, {
    x: stairCenterX,
    z: stairTopZ + stairDirection * 0.1,
  });
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  expect(await canOccupyPosition(page, firstUpperLandingStep)).toBe(true);
  await movePlayerTo(page, firstUpperLandingStep);
  expect(await canOccupyPosition(page, eastUpperLandingMouth)).toBe(true);

  expect(await canOccupyPosition(page, westLandingEgress)).toBe(true);
  await movePlayerTo(page, westLandingEgress);
  await movePlayerTo(page, creatorsStudioCenter);
  await expect(html).toHaveAttribute('data-active-floor', 'upper');

  expect(await canOccupyPosition(page, normalLoftSpace)).toBe(true);
  expect(await canOccupyPosition(page, normalLoftEastNudge)).toBe(true);
  expect(await canOccupyPosition(page, loftDoorway)).toBe(true);
  expect(await canOccupyPosition(page, westVoidBypass)).toBe(true);
  expect(await canOccupyPosition(page, westLandingMouthClearance)).toBe(true);
  expect(
    await getBlockingColliderNames(page, westLandingMouthClearance)
  ).toEqual([]);
  for (const sample of physicalLandingSamples) {
    expectSampleOnPhysicalStaircaseLanding(sample, stairMetrics);
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      true
    );
    expect(
      await getBlockingColliderNames(page, sample.target),
      sample.name
    ).toEqual([]);
  }
  expect(await canOccupyPosition(page, westEdgeFloorClearance)).toBe(true);
  expect(await canOccupyPosition(page, hiddenStairTopRun)).toBe(true);
  expect(await getBlockingColliderNames(page, hiddenStairTopRun)).toEqual([]);
  expect(
    await canOccupyPosition(page, { x: 12.7, z: -23.72, floorId: 'upper' })
  ).toBe(false);
  expect(
    await getBlockingColliderNames(page, {
      x: 12.7,
      z: -23.72,
      floorId: 'upper',
    })
  ).toContain('UpperStairHiddenRunVoidGuard');
  for (const sample of formerLandingArtifactSamples) {
    expectSampleOnPhysicalStaircaseLanding(sample, stairMetrics);
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      true
    );
    expect(
      await getBlockingColliderNames(page, sample.target),
      sample.name
    ).toEqual([]);
  }
  expect(await canOccupyPosition(page, westSideStairEntry)).toBe(false);
  expect(await getBlockingColliderNames(page, westSideStairEntry)).toContain(
    'UpperStairWestBannisterGuard'
  );
  const runtimeWestEntry = await stepRuntimeIntoUpperStairGuard(
    page,
    { x: 8.1, z: -24.68 },
    { dx: 0.12, dz: 0 }
  );
  expect(runtimeWestEntry.movedX).toBe(false);
  expect(runtimeWestEntry.blockedBy).toContain('UpperStairWestBannisterGuard');
  await expect(async () =>
    movePlayerTo(page, westSideStairEntry)
  ).rejects.toThrow(/Cannot occupy/);

  expect(await canOccupyPosition(page, northBackStairEntry)).toBe(false);
  expect(await getBlockingColliderNames(page, northBackStairEntry)).toContain(
    'UpperStairNorthBannisterGuard'
  );
  const runtimeNorthEntry = await stepRuntimeIntoUpperStairGuard(
    page,
    { x: 10.2, z: -16 },
    { dx: 0, dz: -0.18 }
  );
  expect(runtimeNorthEntry.movedZ).toBe(false);
  expect(runtimeNorthEntry.blockedBy).toContain(
    'UpperStairNorthBannisterGuard'
  );
  await expect(async () =>
    movePlayerTo(page, northBackStairEntry)
  ).rejects.toThrow(/Cannot occupy/);
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
    z: stairTopZ + stairDirection * 0.1,
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
