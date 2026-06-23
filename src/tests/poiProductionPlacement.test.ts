import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import { createPoiFloorResolver } from '../scene/floors/visibilityController';
import { getPoiDefinitions } from '../scene/poi/registry';
import type { PoiDefinition, PoiId } from '../scene/poi/types';

const getPoi = (definitions: PoiDefinition[], id: PoiId): PoiDefinition => {
  const poi = definitions.find((candidate) => candidate.id === id);
  if (!poi) {
    throw new Error(`Missing POI ${id}`);
  }
  return poi;
};

const expectPosition = (
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number }
) => {
  expect(actual.x).toBeCloseTo(expected.x, 2);
  expect(actual.y).toBeCloseTo(expected.y, 2);
  expect(actual.z).toBeCloseTo(expected.z, 2);
};

describe('production POI placement', () => {
  const definitions = getPoiDefinitions();
  const getPoiFloorId = createPoiFloorResolver(FLOOR_PLAN_LEVELS);

  it('resolves requested ground-floor POIs to their world anchors', () => {
    const expected = new Map<PoiId, { x: number; y: number; z: number }>([
      ['tokenplace-studio-cluster', { x: -22.34, y: 0.75, z: -22.61 }],
      ['sugarkube-backyard-greenhouse', { x: -8.74, y: 0.75, z: -22.92 }],
      ['danielsmith-portfolio-table', { x: -21.6, y: 0.75, z: 1.63 }],
      ['pr-reaper-backyard-console', { x: 3, y: 0.75, z: 1.05 }],
      ['flywheel-studio-flywheel', { x: 18.07, y: 0.75, z: 1.49 }],
    ]);

    expected.forEach((position, id) => {
      const poi = getPoi(definitions, id);
      expect(getPoiFloorId(poi)).toBe('ground');
      expectPosition(poi.position, position);
    });
  });

  it('resolves requested upper-floor POIs to their world anchors', () => {
    const expected = new Map<PoiId, { x: number; y: number; z: number }>([
      ['jobbot-studio-terminal', { x: -16.76, y: 4.91, z: -28.8 }],
      ['axel-studio-tracker', { x: -12.42, y: 4.91, z: -19.18 }],
      ['gabriel-studio-sentry', { x: -17.28, y: 4.91, z: -7.02 }],
      ['wove-kitchen-loom', { x: 16.48, y: 4.91, z: 4.27 }],
      ['sigma-kitchen-workbench', { x: 16.59, y: 4.91, z: 17.66 }],
      ['f2clipboard-kitchen-console', { x: -0.63, y: 4.91, z: 14.03 }],
      ['gitshelves-living-room-installation', { x: -16.87, y: 4.91, z: 17.23 }],
    ]);

    expected.forEach((position, id) => {
      const poi = getPoi(definitions, id);
      expect(getPoiFloorId(poi)).toBe('upper');
      expectPosition(poi.position, position);
    });
  });

  it('keeps DSPACE placement, floor, and orientation unchanged', () => {
    const dspace = getPoi(definitions, 'dspace-backyard-rocket');

    expect(getPoiFloorId(dspace)).toBe('ground');
    expectPosition(dspace.position, { x: -12, y: 0, z: 24 });
    expect(dspace.headingRadians).toBeCloseTo(-Math.PI / 10, 6);
  });

  it('keeps danielsmith.io and pr-reaper independently reachable', () => {
    const danielsmith = getPoi(definitions, 'danielsmith-portfolio-table');
    const prReaper = getPoi(definitions, 'pr-reaper-backyard-console');

    expectPosition(danielsmith.position, { x: -21.6, y: 0.75, z: 1.63 });
    expectPosition(prReaper.position, { x: 3, y: 0.75, z: 1.05 });
    expect(
      Math.hypot(
        danielsmith.position.x - prReaper.position.x,
        danielsmith.position.z - prReaper.position.z
      )
    ).toBeGreaterThan(20);
    expect(danielsmith.links?.map((link) => link.href)).toContain(
      'https://danielsmith.io'
    );
    expect(prReaper.links?.map((link) => link.href)).toContain(
      'https://github.com/futuroptimist/pr-reaper'
    );
  });
});
