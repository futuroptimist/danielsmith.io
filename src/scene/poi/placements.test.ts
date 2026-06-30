import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../../assets/floorPlan';
import { createPoiFloorResolver } from '../floors/visibilityController';
import { UPPER_FLOOR_TOP_ELEVATION } from '../level/floorElevations';

import {
  applyManualPoiPlacements,
  getPoiInteractionAnchorPosition,
} from './placements';
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

const getPoiFloorId = createPoiFloorResolver(FLOOR_PLAN_LEVELS);

describe('applyManualPoiPlacements', () => {
  it('resolves launch POI placements to requested world positions and floors', () => {
    const expected: Array<{
      id: PoiId;
      roomId: string;
      floorId: 'ground' | 'upper';
      position: { x: number; y: number; z: number };
      anchorY: number;
    }> = [
      {
        id: 'tokenplace-studio-cluster',
        roomId: 'livingRoom',
        floorId: 'ground',
        anchorY: 0.75,
        position: { x: -18, y: 0, z: -28.2 },
      },
      {
        id: 'sugarkube-backyard-greenhouse',
        roomId: 'livingRoom',
        floorId: 'ground',
        anchorY: 0.75,
        position: { x: -8.74, y: 0, z: -22.92 },
      },
      {
        id: 'danielsmith-portfolio-table',
        roomId: 'kitchen',
        floorId: 'ground',
        anchorY: 0.75,
        position: { x: -21.6, y: 0, z: 1.63 },
      },
      {
        id: 'pr-reaper-backyard-console',
        roomId: 'studio',
        floorId: 'ground',
        anchorY: 0.75,
        position: { x: 3, y: 0, z: 1.05 },
      },
      {
        id: 'flywheel-studio-flywheel',
        roomId: 'studio',
        floorId: 'ground',
        anchorY: 0.75,
        position: { x: 18.07, y: 0, z: 1.49 },
      },
      {
        id: 'jobbot-studio-terminal',
        roomId: 'creatorsStudio',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: -16.76, y: UPPER_FLOOR_TOP_ELEVATION, z: -28.8 },
      },
      {
        id: 'axel-studio-tracker',
        roomId: 'creatorsStudio',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: -12.42, y: UPPER_FLOOR_TOP_ELEVATION, z: -19.18 },
      },
      {
        id: 'gabriel-studio-sentry',
        roomId: 'creatorsStudio',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: -17.28, y: UPPER_FLOOR_TOP_ELEVATION, z: -7.02 },
      },
      {
        id: 'wove-kitchen-loom',
        roomId: 'loftLibrary',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: 16.48, y: UPPER_FLOOR_TOP_ELEVATION, z: 4.27 },
      },
      {
        id: 'sigma-kitchen-workbench',
        roomId: 'focusPods',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: 16.59, y: UPPER_FLOOR_TOP_ELEVATION, z: 17.66 },
      },
      {
        id: 'f2clipboard-kitchen-console',
        roomId: 'focusPods',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: -0.63, y: UPPER_FLOOR_TOP_ELEVATION, z: 14.03 },
      },
      {
        id: 'gitshelves-living-room-installation',
        roomId: 'focusPods',
        floorId: 'upper',
        anchorY: UPPER_FLOOR_TOP_ELEVATION + 0.75,
        position: { x: -16.87, y: UPPER_FLOOR_TOP_ELEVATION, z: 17.23 },
      },
    ];
    const placed = applyManualPoiPlacements(
      expected.map(({ id }) => definition(id))
    );

    for (const [index, poi] of placed.entries()) {
      const nextExpected = expected[index];
      expect(poi.id).toBe(nextExpected.id);
      expect(poi.roomId).toBe(nextExpected.roomId);
      expect(getPoiFloorId(poi)).toBe(nextExpected.floorId);
      expect(poi.position.x).toBeCloseTo(nextExpected.position.x, 2);
      expect(poi.position.y).toBeCloseTo(nextExpected.position.y, 2);
      expect(poi.position.z).toBeCloseTo(nextExpected.position.z, 2);
      const anchor = getPoiInteractionAnchorPosition(poi);
      expect(anchor.x).toBeCloseTo(nextExpected.position.x, 2);
      expect(anchor.y).toBeCloseTo(nextExpected.anchorY, 2);
      expect(anchor.z).toBeCloseTo(nextExpected.position.z, 2);
    }
  });

  it('keeps DSPACE placement, floor, and orientation unchanged', () => {
    const dspace = definition('dspace-backyard-rocket');
    dspace.roomId = 'backyard';
    dspace.position = { x: -12, y: 0, z: 24 };
    dspace.headingRadians = -Math.PI / 10;
    const placed = applyManualPoiPlacements([dspace])[0];

    expect(placed.roomId).toBe('backyard');
    expect(getPoiFloorId(placed)).toBe('ground');
    expect(placed.position).toEqual({ x: -12, y: 0, z: 24 });
    expect(placed.headingRadians).toBe(-Math.PI / 10);
  });

  it('keeps danielsmith.io and pr-reaper independently positioned', () => {
    const [portfolio, reaper] = applyManualPoiPlacements([
      definition('danielsmith-portfolio-table'),
      definition('pr-reaper-backyard-console'),
    ]);

    expect(portfolio.position.x).toBeCloseTo(-21.6, 2);
    expect(portfolio.position.y).toBeCloseTo(0, 2);
    expect(portfolio.position.z).toBeCloseTo(1.63, 2);
    expect(reaper.position.x).toBeCloseTo(3, 2);
    expect(reaper.position.y).toBeCloseTo(0, 2);
    expect(reaper.position.z).toBeCloseTo(1.05, 2);
    expect(portfolio.position).not.toEqual(reaper.position);
  });
});
