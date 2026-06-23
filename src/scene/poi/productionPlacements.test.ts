import { describe, expect, it } from 'vitest';

import { createPoiFloorResolver } from '../floors/visibilityController';
import { PORTFOLIO_LEVEL } from '../level/portfolioLevel';
import { createSceneObjectDefinitionsById } from '../level/sceneObjects';

import { getPoiDefinitions } from './registry';
import type { PoiDefinition, PoiId } from './types';

const getPoiFloorId = createPoiFloorResolver(
  PORTFOLIO_LEVEL.floors.map((floor) => ({
    id: floor.id,
    name: floor.name,
    plan: { outline: floor.outline, rooms: floor.rooms },
  }))
);

const definitions = new Map(getPoiDefinitions().map((poi) => [poi.id, poi]));
const sceneObjects = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);

const expectPosition = (
  poi: PoiDefinition,
  expected: { x: number; y: number; z: number }
) => {
  expect(poi.position.x).toBeCloseTo(expected.x, 2);
  expect(poi.position.y).toBeCloseTo(expected.y, 2);
  expect(poi.position.z).toBeCloseTo(expected.z, 2);
};

describe('production POI placements', () => {
  it('resolves launch POIs to requested world positions and floors', () => {
    const expected: Array<{
      id: PoiId;
      floor: 'ground' | 'upper';
      position: { x: number; y: number; z: number };
    }> = [
      {
        id: 'tokenplace-studio-cluster',
        floor: 'ground',
        position: { x: -22.34, y: 0.75, z: -22.61 },
      },
      {
        id: 'sugarkube-backyard-greenhouse',
        floor: 'ground',
        position: { x: -8.74, y: 0.75, z: -22.92 },
      },
      {
        id: 'danielsmith-portfolio-table',
        floor: 'ground',
        position: { x: -21.6, y: 0.75, z: 1.63 },
      },
      {
        id: 'pr-reaper-backyard-console',
        floor: 'ground',
        position: { x: 3, y: 0.75, z: 1.05 },
      },
      {
        id: 'flywheel-studio-flywheel',
        floor: 'ground',
        position: { x: 18.07, y: 0.75, z: 1.49 },
      },
      {
        id: 'jobbot-studio-terminal',
        floor: 'upper',
        position: { x: -16.76, y: 4.91, z: -28.8 },
      },
      {
        id: 'axel-studio-tracker',
        floor: 'upper',
        position: { x: -12.42, y: 4.91, z: -19.18 },
      },
      {
        id: 'gabriel-studio-sentry',
        floor: 'upper',
        position: { x: -17.28, y: 4.91, z: -7.02 },
      },
      {
        id: 'wove-kitchen-loom',
        floor: 'upper',
        position: { x: 16.48, y: 4.91, z: 4.27 },
      },
      {
        id: 'sigma-kitchen-workbench',
        floor: 'upper',
        position: { x: 16.59, y: 4.91, z: 17.66 },
      },
      {
        id: 'f2clipboard-kitchen-console',
        floor: 'upper',
        position: { x: -0.63, y: 4.91, z: 14.03 },
      },
      {
        id: 'gitshelves-living-room-installation',
        floor: 'upper',
        position: { x: -16.87, y: 4.91, z: 17.23 },
      },
    ];

    for (const { id, floor, position } of expected) {
      const poi = definitions.get(id);
      expect(poi, id).toBeDefined();
      expect(getPoiFloorId(poi!), id).toBe(floor);
      expectPosition(poi!, position);
    }
  });

  it('keeps DSPACE placement, floor, and orientation unchanged', () => {
    const dspace = definitions.get('dspace-backyard-rocket');
    expect(dspace).toBeDefined();
    expect(getPoiFloorId(dspace!)).toBe('ground');
    expectPosition(dspace!, { x: -12, y: 0, z: 24 });
    expect(dspace!.headingRadians).toBeCloseTo(-Math.PI / 10);
  });

  it('keeps danielsmith.io and pr-reaper independently reachable', () => {
    const portfolio = definitions.get('danielsmith-portfolio-table');
    const reaper = definitions.get('pr-reaper-backyard-console');
    expect(portfolio).toBeDefined();
    expect(reaper).toBeDefined();
    expect(portfolio!.position).not.toEqual(reaper!.position);
    expect(portfolio!.interactionRadius).toBeGreaterThan(0);
    expect(reaper!.interactionRadius).toBeGreaterThan(0);
  });

  it('preserves canonical POI IDs and external links', () => {
    expect(definitions.has('tokenplace-studio-cluster')).toBe(true);
    expect(definitions.has('pr-reaper-backyard-console')).toBe(true);
    expect(definitions.get('tokenplace-studio-cluster')?.links?.[0]?.href).toBe(
      'https://token.place'
    );
    expect(
      definitions.get('pr-reaper-backyard-console')?.links?.[0]?.href
    ).toBe('https://github.com/futuroptimist/pr-reaper');
  });

  it('keeps moved showpiece scene objects on matching floors', () => {
    const expectations = new Map<PoiId, 'ground' | 'upper'>([
      ['flywheel-studio-flywheel', 'ground'],
      ['jobbot-studio-terminal', 'upper'],
      ['axel-studio-tracker', 'upper'],
      ['wove-kitchen-loom', 'upper'],
      ['pr-reaper-backyard-console', 'ground'],
    ]);

    for (const [id, floor] of expectations) {
      expect(sceneObjects.get(id)?.floorId).toBe(floor);
      expect(getPoiFloorId(definitions.get(id)!)).toBe(floor);
    }
  });
});
