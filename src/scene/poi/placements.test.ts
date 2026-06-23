import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../../assets/floorPlan';
import { createPoiFloorResolver } from '../floors/visibilityController';

import { applyManualPoiPlacements, MANUAL_POI_PLACEMENTS } from './placements';
import { getPoiDefinitions } from './registry';
import type { PoiDefinition, PoiId } from './types';

const definition = (id: PoiId): PoiDefinition => ({
  id,
  title: id,
  summary: 'Test POI summary',
  category: 'project',
  interaction: 'inspect',
  roomId: 'original-room',
  position: { x: 1, y: 0.5, z: 2 },
  headingRadians: 0.25,
  interactionRadius: 2,
  footprint: { width: 1, depth: 1 },
  interactionPrompt: 'Inspect',
});

const expectPosition = (
  poi: PoiDefinition,
  expected: { x: number; y: number; z: number }
) => {
  expect(poi.position.x).toBeCloseTo(expected.x, 2);
  expect(poi.position.y).toBeCloseTo(expected.y, 2);
  expect(poi.position.z).toBeCloseTo(expected.z, 2);
};

describe('applyManualPoiPlacements', () => {
  it('resolves migrated POI placements from PORTFOLIO_LEVEL scene objects', () => {
    const expected: Array<{
      id: PoiId;
      roomId: string;
      x: number;
      y: number;
      z: number;
      headingRadians: number;
    }> = [
      {
        id: 'flywheel-studio-flywheel',
        roomId: 'studio',
        x: 18.07,
        y: 0.75,
        z: 1.49,
        headingRadians: 0,
      },
      {
        id: 'jobbot-studio-terminal',
        roomId: 'creatorsStudio',
        x: -16.76,
        y: 4.91,
        z: -28.8,
        headingRadians: -Math.PI / 2,
      },
      {
        id: 'axel-studio-tracker',
        roomId: 'creatorsStudio',
        x: -12.42,
        y: 4.91,
        z: -19.18,
        headingRadians: Math.PI,
      },
      {
        id: 'wove-kitchen-loom',
        roomId: 'loftLibrary',
        x: 16.48,
        y: 4.91,
        z: 4.27,
        headingRadians: Math.PI * 0.45,
      },
      {
        id: 'pr-reaper-backyard-console',
        roomId: 'studio',
        x: 3,
        y: 0.75,
        z: 1.05,
        headingRadians: Math.PI * 0.35,
      },
    ];
    const placed = applyManualPoiPlacements(
      expected.map(({ id }) => definition(id))
    );

    for (const [index, poi] of placed.entries()) {
      const nextExpected = expected[index];
      expect(poi.id).toBe(nextExpected.id);
      expect(poi.roomId).toBe(nextExpected.roomId);
      expectPosition(poi, nextExpected);
      expect(poi.headingRadians).toBeCloseTo(nextExpected.headingRadians);
    }
  });

  it('leaves remaining manual placements intact', () => {
    const ids = Object.keys(MANUAL_POI_PLACEMENTS) as PoiId[];
    const placed = applyManualPoiPlacements(ids.map(definition));

    for (const poi of placed) {
      const manual = MANUAL_POI_PLACEMENTS[poi.id];
      expect(manual).toBeDefined();
      expect(poi.roomId).toBe(manual?.roomId);
      expect(poi.position).toEqual({
        x: manual?.position.x,
        y: manual?.position.y ?? 0.5,
        z: manual?.position.z,
      });
      expect(poi.headingRadians).toBe(manual?.headingRadians ?? 0.25);
    }
  });
});

describe('production POI placement contract', () => {
  const definitions = getPoiDefinitions();
  const byId = new Map(definitions.map((poi) => [poi.id, poi]));
  const getPoiFloorId = createPoiFloorResolver(FLOOR_PLAN_LEVELS);

  const poi = (id: PoiId): PoiDefinition => {
    const definition = byId.get(id);
    if (!definition) throw new Error(`Missing POI ${id}`);
    return definition;
  };

  it('places non-derived POIs at their requested world anchors', () => {
    const expected: Array<[PoiId, { x: number; y: number; z: number }]> = [
      ['tokenplace-studio-cluster', { x: -22.34, y: 0.75, z: -22.61 }],
      ['sugarkube-backyard-greenhouse', { x: -8.74, y: 0.75, z: -22.92 }],
      ['danielsmith-portfolio-table', { x: -21.6, y: 0.75, z: 1.63 }],
      ['pr-reaper-backyard-console', { x: 3, y: 0.75, z: 1.05 }],
      ['flywheel-studio-flywheel', { x: 18.07, y: 0.75, z: 1.49 }],
      ['jobbot-studio-terminal', { x: -16.76, y: 4.91, z: -28.8 }],
      ['axel-studio-tracker', { x: -12.42, y: 4.91, z: -19.18 }],
      ['gabriel-studio-sentry', { x: -17.28, y: 4.91, z: -7.02 }],
      ['wove-kitchen-loom', { x: 16.48, y: 4.91, z: 4.27 }],
      ['sigma-kitchen-workbench', { x: 16.59, y: 4.91, z: 17.66 }],
      ['f2clipboard-kitchen-console', { x: -0.63, y: 4.91, z: 14.03 }],
      ['gitshelves-living-room-installation', { x: -16.87, y: 4.91, z: 17.23 }],
    ];

    for (const [id, position] of expected) {
      expectPosition(poi(id), position);
    }
  });

  it('keeps ground and upper POIs associated with their intended floor', () => {
    const ground: PoiId[] = [
      'tokenplace-studio-cluster',
      'futuroptimist-living-room-tv',
      'sugarkube-backyard-greenhouse',
      'danielsmith-portfolio-table',
      'dspace-backyard-rocket',
      'pr-reaper-backyard-console',
      'flywheel-studio-flywheel',
    ];
    const upper: PoiId[] = [
      'jobbot-studio-terminal',
      'axel-studio-tracker',
      'gabriel-studio-sentry',
      'wove-kitchen-loom',
      'sigma-kitchen-workbench',
      'f2clipboard-kitchen-console',
      'gitshelves-living-room-installation',
    ];

    for (const id of ground) expect(getPoiFloorId(poi(id))).toBe('ground');
    for (const id of upper) expect(getPoiFloorId(poi(id))).toBe('upper');
  });

  it('keeps DSPACE placement, floor, and orientation unchanged', () => {
    const dspace = poi('dspace-backyard-rocket');
    expect(dspace.roomId).toBe('backyard');
    expectPosition(dspace, { x: -12, y: 0, z: 24 });
    expect(dspace.headingRadians).toBeCloseTo(-Math.PI / 10);
    expect(getPoiFloorId(dspace)).toBe('ground');
  });

  it('keeps danielsmith.io and pr-reaper independently reachable', () => {
    const portfolio = poi('danielsmith-portfolio-table');
    const reaper = poi('pr-reaper-backyard-console');
    expectPosition(portfolio, { x: -21.6, y: 0.75, z: 1.63 });
    expectPosition(reaper, { x: 3, y: 0.75, z: 1.05 });
    expect(portfolio.position.x).not.toBeCloseTo(reaper.position.x, 2);
    expect(portfolio.position.z).not.toBeCloseTo(reaper.position.z, 2);
    expect((portfolio.links ?? []).map((link) => link.href)).not.toEqual(
      (reaper.links ?? []).map((link) => link.href)
    );
  });
});
