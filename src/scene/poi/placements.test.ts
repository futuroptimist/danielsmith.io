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
    ];
    const placed = applyManualPoiPlacements(
      expected.map(({ id }) => definition(id))
    );

    for (const [index, poi] of placed.entries()) {
      const nextExpected = expected[index];
      expect(poi.id).toBe(nextExpected.id);
      expect(poi.roomId).toBe(nextExpected.roomId);
      expect(poi.position.x).toBeCloseTo(nextExpected.x);
      expect(poi.position.y).toBeCloseTo(nextExpected.y);
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
