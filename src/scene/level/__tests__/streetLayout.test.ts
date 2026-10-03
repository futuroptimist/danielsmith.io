import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../../../assets/floorPlan';
import { EXTERIOR_LOCALE_COPY } from '../../../assets/i18n/exterior';
import { createNavMesh } from '../../../systems/navigation/navMesh';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';
import {
  BUS_STOP,
  PARKED_EV,
  STREET_LAMPS,
  STREET_SURFACES,
} from '../streetLayout';

const ground = PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground')!;
describe('residential street source topology', () => {
  it('retains a flat continuous sidewalk, flush curb, road and accessible shelter pad', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    const nav = createNavMesh(FLOOR_PLAN);
    for (let z = -34; z <= 38; z += 0.2) expect(nav.contains(55, z)).toBe(true);
    for (let x = 51; x <= 78; x += 0.2) expect(nav.contains(x, 32)).toBe(true);
    expect(
      ground.walls.some((wall) => wall.id === 'sidewalk-east-boundary')
    ).toBe(false);
    expect(
      ground.walls.some((wall) => wall.id === 'street-east-boundary')
    ).toBe(true);
    expect(ground.walls.some((wall) => wall.id === 'backyard-east-fence')).toBe(
      true
    );
    expect(
      ground.roomConnections?.find(
        (connection) => connection.id === 'sidewalk-to-bus-stop'
      )?.rooms
    ).toContain('busStop');
  });
  it('partitions all new surfaces without coplanar overlap', () => {
    for (let i = 0; i < STREET_SURFACES.length; i++)
      for (let j = i + 1; j < STREET_SURFACES.length; j++) {
        const a = STREET_SURFACES[i].bounds,
          b = STREET_SURFACES[j].bounds;
        expect(
          Math.min(a.maxX, b.maxX) <= Math.max(a.minX, b.minX) ||
            Math.min(a.maxZ, b.maxZ) <= Math.max(a.minZ, b.minZ)
        ).toBe(true);
      }
  });
  it('keeps the parked car away from sidewalk and garage turning lanes', () => {
    expect(PARKED_EV.x * 2 - PARKED_EV.width / 2 - 58).toBeGreaterThan(5);
    expect(-8 - (PARKED_EV.z * 2 + PARKED_EV.depth / 2)).toBeGreaterThan(7);
    const spacing = STREET_LAMPS.z
      .slice(1)
      .map((z, i) => z - STREET_LAMPS.z[i]);
    expect(spacing).toEqual([10, 10, 10]);
  });
  it('reserves a stable informational travel seam and translates all visible copy', () => {
    expect(BUS_STOP).toMatchObject({
      id: 'residential-bus-stop',
      availability: 'coming-soon',
      futureDestinationRef: 'future-remote-location',
    });
    expect(BUS_STOP).not.toHaveProperty('url');
    for (const strings of Object.values(EXTERIOR_LOCALE_COPY))
      for (const key of ['busStop', 'comingSoon', 'busStopMessage'] as const)
        expect(strings[key].length).toBeGreaterThan(1);
  });
});
