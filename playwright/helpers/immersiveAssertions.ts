import { expect, type Page } from '@playwright/test';

export type ImmersiveFloorId = 'ground' | 'upper';

export type ImmersiveSample = {
  name: string;
  target: { x: number; z: number; floorId?: ImmersiveFloorId };
};

type StepResult = {
  movedX: boolean;
  movedZ: boolean;
  activeFloor: ImmersiveFloorId;
  position: { x: number; y: number; z: number };
  blockedBy?: string[];
};

type DebugSourceResult = {
  id: string;
  sourceId?: string;
};

declare global {
  interface Window {
    portfolio?: {
      world?: {
        movePlayerTo(target: {
          x: number;
          z: number;
          floorId?: ImmersiveFloorId;
        }): void;
        stepPlayerForTest(step: { dx: number; dz: number }): StepResult;
        getActiveFloor(): ImmersiveFloorId;
        canOccupyPosition(target: {
          x: number;
          z: number;
          floorId?: ImmersiveFloorId;
        }): boolean;
        getPlayerPosition(): { x: number; y: number; z: number };
      };
      debugColliders?: {
        setEnabled(enabled: boolean): void;
        getBlockingCollidersAt(target: {
          x: number;
          z: number;
          floorId?: ImmersiveFloorId;
        }): Array<{ id: string; name: string; sourceId?: string }>;
        getColliderById(id: unknown): unknown;
        getCollidersBySourceId(sourceId: unknown): DebugSourceResult[];
      };
      debugSolids?: {
        setEnabled(enabled: boolean): void;
        getSolidById(id: unknown): unknown;
        getSolidsBySourceId(sourceId: unknown): DebugSourceResult[];
      };
    };
  }
}

async function getCanOccupyResults(page: Page, samples: ImmersiveSample[]) {
  return page.evaluate((nextSamples) => {
    const world = window.portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }

    return nextSamples.map((sample) => ({
      name: sample.name,
      canOccupy: world.canOccupyPosition(sample.target),
    }));
  }, samples);
}

export async function expectSamplesOccupiable(
  page: Page,
  samples: ImmersiveSample[]
) {
  const results = await getCanOccupyResults(page, samples);
  for (const result of results) {
    expect(result.canOccupy, result.name).toBe(true);
  }
}

export async function expectSamplesBlocked(
  page: Page,
  samples: ImmersiveSample[]
) {
  const results = await getCanOccupyResults(page, samples);
  for (const result of results) {
    expect(result.canOccupy, result.name).toBe(false);
  }
}

export async function expectNoBlockingCollidersAt(
  page: Page,
  samples: ImmersiveSample[]
) {
  const blockingCollidersBySample = await page.evaluate((nextSamples) => {
    const debugColliders = window.portfolio?.debugColliders;
    if (!debugColliders) {
      throw new Error('Debug colliders API unavailable');
    }

    return nextSamples.map((sample) => ({
      name: sample.name,
      colliders: debugColliders
        .getBlockingCollidersAt(sample.target)
        .map((collider) => collider.name),
    }));
  }, samples);

  for (const sample of blockingCollidersBySample) {
    expect(sample.colliders, sample.name).toEqual([]);
  }
}

export async function expectPathTraversable(
  page: Page,
  path: {
    start: { x: number; z: number; floorId?: ImmersiveFloorId };
    steps: { dx: number; dz: number; count: number }[];
    expectedFloor?: ImmersiveFloorId;
  }
) {
  const result = await page.evaluate((nextPath) => {
    const world = window.portfolio?.world;
    if (!world) {
      throw new Error('World API unavailable');
    }

    world.movePlayerTo(nextPath.start);
    const steps: StepResult[] = [];
    for (const sequence of nextPath.steps) {
      for (let index = 0; index < sequence.count; index += 1) {
        const step = world.stepPlayerForTest({
          dx: sequence.dx,
          dz: sequence.dz,
        });
        steps.push(step);
        const blockedAxis =
          (sequence.dx !== 0 && !step.movedX) ||
          (sequence.dz !== 0 && !step.movedZ);
        if (blockedAxis) {
          return { traversable: false, blockedStep: step, steps };
        }
        if (
          nextPath.expectedFloor &&
          step.activeFloor !== nextPath.expectedFloor
        ) {
          return { traversable: false, wrongFloorStep: step, steps };
        }
      }
    }

    return {
      traversable: true,
      finalPosition: world.getPlayerPosition(),
      activeFloor: world.getActiveFloor(),
      steps,
    };
  }, path);

  expect(result.traversable, JSON.stringify(result)).toBe(true);
  return result;
}

export async function expectSourceBackedColliderPresent(
  page: Page,
  sourceId: string
) {
  const colliders = await page.evaluate((nextSourceId) => {
    const debugColliders = window.portfolio?.debugColliders;
    if (!debugColliders) {
      throw new Error('Debug colliders API unavailable');
    }

    debugColliders.setEnabled(true);
    return debugColliders.getCollidersBySourceId(nextSourceId);
  }, sourceId);

  expect(colliders.length, sourceId).toBeGreaterThan(0);
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
    const debugSolids = window.portfolio?.debugSolids;
    if (!debugSolids) {
      throw new Error('Debug solids API unavailable');
    }

    debugSolids.setEnabled(true);
    return debugSolids.getSolidsBySourceId(nextSourceId);
  }, sourceId);

  expect(solids.length, sourceId).toBeGreaterThan(0);
  expect(
    solids.map((solid) => solid.sourceId),
    sourceId
  ).toContain(sourceId);
  return solids;
}

// Raw debug IDs are reserved for debug registry tests only. Player behavior
// tests should assert paths, occupancy, openings, or source-backed provenance.
export async function getDebugColliderByRegistryId(page: Page, id: string) {
  return page.evaluate((nextId) => {
    const debugColliders = window.portfolio?.debugColliders;
    if (!debugColliders) {
      throw new Error('Debug colliders API unavailable');
    }
    return debugColliders.getColliderById(nextId);
  }, id);
}

// Raw debug IDs are reserved for debug registry tests only. Player behavior
// tests should assert paths, occupancy, openings, or source-backed provenance.
export async function getDebugSolidByRegistryId(page: Page, id: string) {
  return page.evaluate((nextId) => {
    const debugSolids = window.portfolio?.debugSolids;
    if (!debugSolids) {
      throw new Error('Debug solids API unavailable');
    }
    return debugSolids.getSolidById(nextId);
  }, id);
}
