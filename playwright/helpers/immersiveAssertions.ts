import { expect, type Page } from '@playwright/test';

type FloorId = 'ground' | 'upper';

type ImmersiveSampleTarget = { x: number; z: number; floorId?: FloorId };

export type ImmersiveSample = {
  name: string;
  target: ImmersiveSampleTarget;
};

type TestWorldApi = {
  canOccupyPosition(target: ImmersiveSampleTarget): boolean;
  stepPlayerForTest(step: { dx: number; dz: number }): {
    movedX: boolean;
    movedZ: boolean;
    activeFloor: FloorId;
    position: { x: number; y: number; z: number };
    blockedBy?: string[];
  };
  getPlayerPosition(): { x: number; y: number; z: number };
  getActiveFloor(): FloorId;
};

type DebugColliderMetadata = {
  id: string;
  name: string;
  sourceId?: string;
};

type DebugSolidMetadata = {
  id: string;
  name: string;
  sourceId?: string;
};

type DebugColliderApi = {
  setEnabled(enabled: boolean): void;
  getBlockingCollidersAt(
    target: ImmersiveSampleTarget
  ): DebugColliderMetadata[];
  getCollidersBySourceId(sourceId: unknown): DebugColliderMetadata[];
};

type DebugSolidApi = {
  setEnabled(enabled: boolean): void;
  getSolidsBySourceId(sourceId: unknown): DebugSolidMetadata[];
};

type PortfolioWindow = Window & {
  portfolio?: {
    world?: TestWorldApi;
    debugColliders?: DebugColliderApi;
    debugSolids?: DebugSolidApi;
  };
};

export async function canOccupyPosition(
  page: Page,
  target: ImmersiveSampleTarget
) {
  return page.evaluate((next) => {
    const world = (window as PortfolioWindow).portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }
    return world.canOccupyPosition(next);
  }, target);
}

export async function getBlockingColliderNames(
  page: Page,
  target: ImmersiveSampleTarget
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

export async function expectSamplesOccupiable(
  page: Page,
  samples: ImmersiveSample[]
) {
  for (const sample of samples) {
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      true
    );
  }
}

export async function expectSamplesBlocked(
  page: Page,
  samples: ImmersiveSample[]
) {
  for (const sample of samples) {
    expect(await canOccupyPosition(page, sample.target), sample.name).toBe(
      false
    );
  }
}

export async function expectNoBlockingCollidersAt(
  page: Page,
  samples: ImmersiveSample[]
) {
  for (const sample of samples) {
    expect(
      await getBlockingColliderNames(page, sample.target),
      sample.name
    ).toEqual([]);
  }
}

export async function expectPathTraversable(
  page: Page,
  waypoints: Array<{ x: number; z: number }>,
  options: { maxStep?: number; floorId?: FloorId } = {}
) {
  return page.evaluate(
    ({ waypoints: nextWaypoints, maxStep, floorId }) => {
      const world = (window as PortfolioWindow).portfolio?.world;
      if (!world) {
        throw new Error('World API unavailable');
      }

      const steps: Array<ReturnType<TestWorldApi['stepPlayerForTest']>> = [];
      if (floorId && world.getActiveFloor() !== floorId) {
        throw new Error(
          `Expected ${floorId} floor before walking path, got ${world.getActiveFloor()}`
        );
      }

      for (const waypoint of nextWaypoints) {
        for (let index = 0; index < 320; index += 1) {
          const position = world.getPlayerPosition();
          const remainingX = waypoint.x - position.x;
          const remainingZ = waypoint.z - position.z;
          if (Math.abs(remainingX) < 0.001 && Math.abs(remainingZ) < 0.001) {
            break;
          }

          const dx = Math.max(-maxStep, Math.min(maxStep, remainingX));
          const dz = Math.max(-maxStep, Math.min(maxStep, remainingZ));
          const result = world.stepPlayerForTest({ dx, dz });
          steps.push(result);

          const blockedAxis =
            (dx !== 0 && !result.movedX) || (dz !== 0 && !result.movedZ);
          if (blockedAxis) {
            throw new Error(
              `Blocked walking to (${waypoint.x.toFixed(2)}, ${waypoint.z.toFixed(2)}) ` +
                `from (${position.x.toFixed(2)}, ${position.z.toFixed(2)}): ` +
                `${(result.blockedBy ?? []).join(', ')}`
            );
          }
          if (floorId && result.activeFloor !== floorId) {
            throw new Error(
              `Expected ${floorId} floor while walking path, got ${result.activeFloor}`
            );
          }
        }

        const position = world.getPlayerPosition();
        const reachedWaypoint =
          Math.abs(waypoint.x - position.x) < 0.001 &&
          Math.abs(waypoint.z - position.z) < 0.001;
        if (!reachedWaypoint) {
          throw new Error(
            `Waypoint (${waypoint.x.toFixed(2)}, ${waypoint.z.toFixed(2)}) ` +
              `not reached after 320 steps; stopped at ` +
              `(${position.x.toFixed(2)}, ${position.z.toFixed(2)})`
          );
        }
      }

      return {
        steps,
        finalState: world.getPlayerPosition(),
      };
    },
    { waypoints, maxStep: options.maxStep ?? 0.18, floorId: options.floorId }
  );
}

export async function expectSourceBackedColliderPresent(
  page: Page,
  sourceId: string
) {
  const colliders = await page.evaluate((nextSourceId) => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!debugApi) {
      throw new Error('Debug colliders API unavailable');
    }
    return debugApi.getCollidersBySourceId(nextSourceId);
  }, sourceId);

  expect(
    colliders.length,
    `${sourceId} should expose debug collider provenance`
  ).toBeGreaterThan(0);
  expect(
    colliders.map((collider) => collider.sourceId),
    sourceId
  ).toContain(sourceId);
  return colliders;
}

export async function expectSourceBackedSolidPresent(
  page: Page,
  sourceId: string
) {
  const solids = await page.evaluate((nextSourceId) => {
    const debugApi = (window as PortfolioWindow).portfolio?.debugSolids;
    if (!debugApi) {
      throw new Error('Debug solids API unavailable');
    }
    return debugApi.getSolidsBySourceId(nextSourceId);
  }, sourceId);

  expect(
    solids.length,
    `${sourceId} should expose debug solid provenance`
  ).toBeGreaterThan(0);
  expect(
    solids.map((solid) => solid.sourceId),
    sourceId
  ).toContain(sourceId);
  return solids;
}
