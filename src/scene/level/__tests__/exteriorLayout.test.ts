import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN, FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { EXTERIOR_LOCALE_COPY } from '../../../assets/i18n/exterior';
import { createNavMesh } from '../../../systems/navigation/navMesh';
import {
  createExteriorDoorDefinitions,
  FRONT_ENTRY,
  HOUSE_CAMERA_OUTLINE,
} from '../exteriorLayout';
import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import { validateLevelDefinition } from '../schema';

describe('front entry declarative topology', () => {
  it('keeps level source identities and rooms valid', () => {
    expect(validateLevelDefinition(PORTFOLIO_LEVEL).errors).toEqual([]);
    const floor = PORTFOLIO_LEVEL.floors.find(
      (floor) => floor.id === 'ground'
    )!;
    expect(
      floor.rooms.filter((room) =>
        ['frontYard', 'frontPath', 'sidewalk'].includes(room.id)
      )
    ).toHaveLength(3);
    expect(
      floor.floorSurfaces.filter(
        (surface) => surface.purpose === 'exterior-surface'
      )
    ).toHaveLength(4);
  });
  it('places the new opening on the positive-X wall beneath the stairs', () => {
    const wall = PORTFOLIO_LEVEL.floors
      .find((floor) => floor.id === 'ground')!
      .walls.find((wall) => wall.id === 'living-room-east-wall')!;
    expect(wall.run?.start.x).toBe(FRONT_ENTRY.x);
    const gap = wall.run!.gaps!.find(
      (gap) => gap.label === 'living-to-front-yard'
    )!;
    expect(wall.run!.start.z + (gap.start + gap.end) / 2).toBe(-7.5);
    expect(gap.end - gap.start).toBe(FRONT_ENTRY.width);
    expect(HOUSE_CAMERA_OUTLINE).toEqual([
      [-16, -16],
      [16, -16],
      [16, 16],
      [-16, 16],
    ]);
  });
  it('adds a six-unit studio approach without weakening the original staircase guard', () => {
    const wall = PORTFOLIO_LEVEL.floors
      .find((floor) => floor.id === 'ground')!
      .walls.find((wall) => wall.id === 'living-room-north-wall')!;
    const entry = wall.run!.gaps!.find(
      (gap) => gap.label === 'studio-to-front-entry'
    )!;
    expect((wall.run!.start.x + entry.start) * FLOOR_PLAN_SCALE).toBeCloseTo(
      23.5
    );
    expect((wall.run!.start.x + entry.end) * FLOOR_PLAN_SCALE).toBeCloseTo(
      29.5
    );
    expect(
      wall.run!.gaps!.some((gap) => gap.label === 'living-to-studio')
    ).toBe(true);
    expect(23.5 + 0.75 - (22.18 + 0.75)).toBeGreaterThan(1);
    expect(29.5 - 0.75 - (23.5 + 0.75)).toBeGreaterThanOrEqual(3);
  });
  it('scales horizontal coordinates once and keeps door headroom unscaled', () => {
    const door = createExteriorDoorDefinitions(FLOOR_PLAN_SCALE)[0];
    expect(door.center.x).toBeCloseTo(32);
    expect(door.center.z).toBeCloseTo(-15);
    expect(door.height).toBe(3.5);
    expect(door.width).toBeCloseTo(6);
  });
  it('provides continuous navigable path and a clear planter-free threshold', () => {
    const nav = createNavMesh(FLOOR_PLAN);
    for (let x = 30; x < 58; x += 0.1) expect(nav.contains(x, -15)).toBe(true);
    const mirror = PORTFOLIO_LEVEL.floors
      .find((floor) => floor.id === 'ground')!
      .sceneObjects!.find(
        (object) => object.id === 'selfie-mirror-living-room'
      )!;
    expect(mirror.position.z).toBe(-11.4);
  });
  it('provides all door controls and status strings in every supported locale', () => {
    expect(Object.keys(EXTERIOR_LOCALE_COPY)).toHaveLength(9);
    expect(EXTERIOR_LOCALE_COPY.ja.closed).toBe('閉まっています');
    expect(EXTERIOR_LOCALE_COPY.ja.closing).toBe('閉じています');
    expect(EXTERIOR_LOCALE_COPY.ja.closed).not.toBe(
      EXTERIOR_LOCALE_COPY.ja.closing
    );
    for (const copy of Object.values(EXTERIOR_LOCALE_COPY)) {
      expect(Object.values(copy).every((value) => value.length > 0)).toBe(true);
      expect(copy.open).toContain('{door}');
      expect(copy.status).toContain('{state}');
    }
  });
});
