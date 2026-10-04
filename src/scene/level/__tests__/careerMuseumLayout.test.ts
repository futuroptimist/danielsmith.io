import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { getCareerPoiPlacements } from '../../poi/careers';
import { getPoiDefinitions } from '../../poi/registry';
import type { CareerPoiDefinition } from '../../poi/types';
import { mockCareerCanvas } from '../../structures/__tests__/helpers/careerCanvas';
import {
  createCareerMuseum,
  type MuseumFurnishingPlacement,
} from '../../structures/careerMuseum';
import { CAREER_MUSEUM_OBJECTS } from '../careerMuseumLayout';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';

beforeEach(() => {
  mockCareerCanvas();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('declarative career museum layout', () => {
  it('uses unique source IDs, explicit collision decisions, and one horizontal scaling step', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    expect(CAREER_MUSEUM_OBJECTS).toHaveLength(11);
    expect(
      new Set(CAREER_MUSEUM_OBJECTS.map((object) => object.sourceId)).size
    ).toBe(11);
    const placements = getCareerPoiPlacements();
    for (const object of CAREER_MUSEUM_OBJECTS) {
      expect(object.floorId).toBe('basement');
      expect(object.roomId).toBe('careerMuseum');
      expect(object.position.y).toBe(-5);
      expect(object.colliderPolicy?.kind).toBe(
        object.kind === 'museum.wall-art' ? 'decorativeNoCollision' : 'solid'
      );
      if (object.kind !== 'career-exhibit') continue;
      const placement = placements[object.id as keyof typeof placements];
      expect(placement.position.x).toBeCloseTo(
        object.position.x * FLOOR_PLAN_SCALE
      );
      expect(placement.position.z).toBeCloseTo(
        object.position.z * FLOOR_PLAN_SCALE
      );
      expect(placement.position.y).toBe(-5);
      expect(placement.interactionAnchorPosition.y).toBe(-4.25);
      expect(
        placement.interactionAnchorPosition.z - placement.position.z
      ).toBeCloseTo(2.5);
    }
  });

  it('keeps museum stands and furniture clear of each other and the perimeter circulation lane', () => {
    const definitions = getPoiDefinitions().filter(
      (poi): poi is CareerPoiDefinition => poi.category === 'career'
    );
    const furnishings = CAREER_MUSEUM_OBJECTS.filter((object) =>
      object.kind.startsWith('museum.')
    ).map(
      (object): MuseumFurnishingPlacement => ({
        id: object.id,
        kind: object.kind.slice(7) as MuseumFurnishingPlacement['kind'],
        position: {
          x: object.position.x * FLOOR_PLAN_SCALE,
          y: object.position.y!,
          z: object.position.z * FLOOR_PLAN_SCALE,
        },
      })
    );
    const museum = createCareerMuseum(definitions, furnishings);
    const obstacles = [...museum.exhibits, ...museum.furnishings].flatMap(
      (object) =>
        object.collider ? [{ id: object.id, bounds: object.collider }] : []
    );
    expect(obstacles).toHaveLength(9);
    for (const { id, bounds } of obstacles) {
      // Deduct both avatar-radius offsets and conservative inward wall thickness.
      expect(
        31.5 - bounds.maxX - 1.5,
        `${id}: east perimeter`
      ).toBeGreaterThanOrEqual(2.5);
      expect(
        bounds.minX + 31.5 - 1.5,
        `${id}: west perimeter`
      ).toBeGreaterThanOrEqual(2.5);
      expect(
        15.5 - bounds.maxZ - 1.5,
        `${id}: north perimeter`
      ).toBeGreaterThanOrEqual(2.5);
      expect(
        bounds.minZ + 35.5 - 1.5,
        `${id}: south perimeter`
      ).toBeGreaterThanOrEqual(2.5);
    }
    museum.dispose();
  });
});
