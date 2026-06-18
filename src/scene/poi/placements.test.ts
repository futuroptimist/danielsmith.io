import { describe, expect, it } from 'vitest';

import { applyManualPoiPlacements, MANUAL_POI_PLACEMENTS } from './placements';
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

describe('applyManualPoiPlacements', () => {
  it('resolves migrated POI placements from PORTFOLIO_LEVEL scene objects', () => {
    const expected: Array<{
      id: PoiId;
      roomId: string;
      x: number;
      z: number;
      headingRadians: number;
    }> = [
      {
        id: 'flywheel-studio-flywheel',
        roomId: 'studio',
        x: 11,
        z: -4,
        headingRadians: 0,
      },
      {
        id: 'jobbot-studio-terminal',
        roomId: 'studio',
        x: 24,
        z: 4,
        headingRadians: -Math.PI / 2,
      },
      {
        id: 'axel-studio-tracker',
        roomId: 'studio',
        x: 20,
        z: -4,
        headingRadians: Math.PI,
      },
      {
        id: 'wove-kitchen-loom',
        roomId: 'kitchen',
        x: -15,
        z: 5,
        headingRadians: Math.PI * 0.45,
      },
      {
        id: 'pr-reaper-backyard-console',
        roomId: 'backyard',
        x: 0,
        z: 20,
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
      expect(poi.position.x).toBeCloseTo(nextExpected.x);
      expect(poi.position.y).toBe(0.5);
      expect(poi.position.z).toBeCloseTo(nextExpected.z);
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
