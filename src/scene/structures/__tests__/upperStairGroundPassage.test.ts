import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { collidesWithColliders } from '../../../systems/collision';
import {
  createFloorConnectionController,
  type StairConnection,
} from '../../../systems/movement/floorConnections';
import { planMovementSubsteps } from '../../../systems/movement/movementSubsteps';
import { computeStairLayout } from '../../../systems/movement/stairLayout';
import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../../avatar/mannequin';
import { getFloorTopElevation } from '../../level/floorElevations';
import { createBasementStaircase } from '../basementStaircase';
import { STAIRCASE_CONFIG } from '../portfolioSceneLayout';
import { createStaircase } from '../staircase';
import { createUpperStairGroundPassage } from '../upperStairGroundPassage';

const radius = 0.75;
const config = STAIRCASE_CONFIG;
const layout = computeStairLayout({
  baseZ: config.basePosition.z,
  stepRun: config.step.run,
  stepCount: config.step.count,
  landingDepth: config.landing.depth,
  direction: config.direction,
  guardMargin: 1.2,
  stairwellMargin: 0.8,
});
const upstairs: StairConnection = {
  id: 'ground-upper',
  lowerFloorId: 'ground',
  upperFloorId: 'upper',
  lowerFloorElevation: 0,
  upperFloorElevation: 5,
  lowerEntranceOnly: true,
  layout,
  groups: [],
  geometry: {
    centerX: config.basePosition.x,
    halfWidth: config.step.width / 2,
    bottomZ: config.basePosition.z,
    topZ: layout.topZ,
    landingMinZ: layout.landingMinZ,
    landingMaxZ: layout.landingMaxZ,
    totalRise: config.step.count * config.step.rise,
    direction: -1,
  },
  behavior: {
    transitionMargin: 1.2,
    landingTriggerMargin: 0.4,
    stepRise: config.step.rise,
    descentCorridorInset: radius,
  },
  sources: {
    visual: 'ground.upperStairs.visual',
    navigation: 'ground.upperStairs.navigation',
    safety: [],
  },
};
const guards = createUpperStairGroundPassage(config, {
  connectionId: upstairs.id,
  guardThickness: 0.44,
});
const colliders = guards.map(({ bounds }) => bounds);
const groundActor = {
  feetY: 0,
  height: PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
  activeConnectionId: null,
};
const basement = createBasementStaircase();
const makeController = () =>
  createFloorConnectionController({
    floors: {
      get: (id) => ({ elevation: getFloorTopElevation(id) }),
    } as Parameters<typeof createFloorConnectionController>[0]['floors'],
    connections: [upstairs, basement.connection],
    initialFloorId: 'ground',
  });

function walk(
  controller: ReturnType<typeof makeController>,
  start: Vector3,
  dx: number,
  dz: number
) {
  const steps = planMovementSubsteps(dx, dz, radius / 2);
  const samples: Vector3[] = [];
  for (let i = 0; i < steps.count; i++) {
    const x = start.x + steps.stepX;
    const z = start.z + steps.stepZ;
    const preview = controller.preview(x, z);
    const actor = {
      ...groundActor,
      feetY: controller.sampleHeight(x, z, preview),
      activeConnectionId: preview.activeConnectionId,
    };
    const floorColliders = basement.safety
      .filter(({ floor }) => floor === preview.floorId)
      .map(({ bounds }) => bounds);
    if (preview.floorId === 'ground') floorColliders.push(...colliders);
    if (collidesWithColliders(x, z, radius, floorColliders, actor)) break;
    controller.commitPosition(x, z);
    start.set(x, controller.sampleHeight(x, z), z);
    samples.push(start.clone());
  }
  return samples;
}

describe('upper stair ground passage', () => {
  it('derives exact solid underside bounds from the rendered treads and landing', () => {
    const stair = createStaircase(config);
    stair.group.updateMatrixWorld(true);
    for (let i = 0; i <= config.step.count; i++) {
      const name =
        i === config.step.count ? 'StaircaseLanding' : `StaircaseStep-${i + 1}`;
      const bounds = new Box3().setFromObject(
        stair.group.getObjectByName(name)!
      );
      const part = i === config.step.count ? 'landing' : `step${i + 1}`;
      const collider = guards.find(
        ({ name }) => name === `UpperStairGround-${part}.underside`
      )!.bounds;
      expect(collider.minY).toBeCloseTo(bounds.min.y);
      expect(collider.maxY).toBeCloseTo(bounds.max.y);
      expect(collider.minX).toBeCloseTo(bounds.min.x);
      expect(collider.maxX).toBeCloseTo(bounds.max.x);
      expect(collider.minZ).toBeCloseTo(bounds.min.z);
      expect(collider.maxZ).toBeCloseTo(bounds.max.z);
    }
  });

  it('removes the unrendered foyer and lower-approach barriers', () => {
    expect(
      guards.some(({ sourceId }) => sourceId.includes('lowerCorner'))
    ).toBe(false);
    expect(
      guards.every(({ bounds }) => bounds.maxZ <= config.basePosition.z + 1e-9)
    ).toBe(true);
    for (const [x, z] of [
      [21.35, -14.66],
      [22.1, -14.66],
      [17.38, -8.84],
    ]) {
      expect(collidesWithColliders(x, z, radius, colliders, groundActor)).toBe(
        false
      );
      expect(makeController().preview(x, z).activeConnectionId).toBeNull();
    }
  });

  it('opens only headroom that fits the full avatar and its collision radius', () => {
    const firstHighTreadZ = config.basePosition.z - config.step.run * 6;
    const x = config.basePosition.x;
    expect(config.step.rise * 5).toBeLessThan(groundActor.height);
    expect(config.step.rise * 6).toBeGreaterThan(groundActor.height);
    expect(
      collidesWithColliders(
        x,
        firstHighTreadZ - radius - 0.01,
        radius,
        colliders,
        groundActor
      )
    ).toBe(false);
    expect(
      collidesWithColliders(
        x,
        firstHighTreadZ - radius + 0.01,
        radius,
        colliders,
        groundActor
      )
    ).toBe(true);
    expect(
      collidesWithColliders(
        x,
        (layout.landingMinZ + layout.landingMaxZ) / 2,
        radius,
        colliders,
        groundActor
      )
    ).toBe(false);
  });

  for (const dx of [-15, 15]) {
    it(`crosses under the upper flight in a single coarse ${dx > 0 ? 'east' : 'west'} frame without capturing stairs`, () => {
      const controller = makeController();
      const start = new Vector3(dx < 0 ? 23 : 8, 0, -23);
      const samples = walk(controller, start, dx, 0);
      expect(samples.length).toBeGreaterThan(30);
      expect(start.x).toBeCloseTo(dx < 0 ? 8 : 23);
      expect(samples.every(({ y }) => y === 0)).toBe(true);
      expect(controller.getState()).toMatchObject({
        floorId: 'ground',
        activeConnectionId: null,
      });
    });
  }

  it('blocks walking into low headroom from beneath and blocks side exits while ascending', () => {
    const controller = makeController();
    const start = new Vector3(config.basePosition.x, 0, -23);
    walk(controller, start, 0, 9);
    expect(start.z).toBeLessThanOrEqual(-21.55);
    expect(start.y).toBe(0);
    expect(controller.getState().activeConnectionId).toBeNull();
    start.set(config.basePosition.x, 0, config.basePosition.z + 0.2);
    walk(controller, start, 0, -12);
    expect(start.y).toBeGreaterThan(3);
    const rampY = start.y;
    walk(controller, start, 10, 0);
    expect(start.x).toBeLessThan(config.basePosition.x + config.step.width / 2);
    expect(start.y).toBeCloseTo(rampY);
  });

  it('connects the underpass to the basement landing without crossing either physical rail', () => {
    const controller = makeController();
    const position = new Vector3(23, 0, -23);
    for (const [x, z] of [
      [8, -23],
      [8, -11],
      [3.8, -11],
      [3.8, -32.5],
      [3.8, -11],
      [8, -11],
      [8, -23],
      [23, -23],
    ]) {
      walk(controller, position, x - position.x, z - position.z);
      expect(position.x).toBeCloseTo(x);
      expect(position.z).toBeCloseTo(z);
      expect(position.y).toBe(z === -32.5 ? -5 : 0);
      expect(controller.getState().floorId).toBe(
        z === -32.5 ? 'basement' : 'ground'
      );
    }
  });

  it('retains upstairs ascent, descent and both-floor basement handoffs after crossing underneath', () => {
    const controller = makeController();
    const start = new Vector3(23, 0, -23);
    walk(controller, start, -15, 0);
    expect(
      controller.preview(
        config.basePosition.x,
        (layout.landingMinZ + layout.landingMaxZ) / 2
      ).floorId
    ).toBe('ground');
    start.set(config.basePosition.x, 0, config.basePosition.z + 0.2);
    walk(controller, start, 0, -17);
    expect(controller.getState().floorId).toBe('upper');
    expect(start.y).toBe(5);
    walk(controller, start, 0, 17);
    expect(controller.getState().floorId).toBe('ground');
    expect(start.y).toBe(0);
    const b = basement.geometry;
    controller.commitPosition(b.centerX, b.topZ - 0.6);
    expect(controller.getState().floorId).toBe('basement');
    controller.commitPosition(b.centerX, b.bottomZ);
    expect(controller.sampleHeight(b.centerX, b.bottomZ)).toBe(-5);
    controller.commitPosition(b.centerX, b.topZ + 0.5);
    expect(controller.getState().floorId).toBe('ground');
  });
});
