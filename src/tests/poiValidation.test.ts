import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../floorPlan';
import { getPoiDefinitions } from '../poi/registry';
import type { PoiDefinition } from '../poi/types';
import {
  assertValidPoiDefinitions,
  type PoiValidationIssue,
  validatePoiDefinitions,
} from '../poi/validation';

const baseDefinitions = getPoiDefinitions();
const livingRoomBounds = FLOOR_PLAN.rooms.find(
  (room) => room.id === baseDefinitions[0].roomId
)!.bounds;

function clonePoi(overrides: Partial<PoiDefinition>): PoiDefinition {
  return {
    ...baseDefinitions[0],
    ...overrides,
  };
}

describe('validatePoiDefinitions', () => {
  it('returns no issues for baseline registry', () => {
    const issues = validatePoiDefinitions(baseDefinitions, {
      floorPlan: FLOOR_PLAN,
    });
    expect(issues).toHaveLength(0);
  });

  it('detects duplicate identifiers', () => {
    const duplicate: PoiDefinition = {
      ...baseDefinitions[1],
      summary: 'Duplicate entry for testing.',
    };
    const issues = validatePoiDefinitions([...baseDefinitions, duplicate], {
      floorPlan: FLOOR_PLAN,
    });
    expect(issues).toContainEqual({
      type: 'duplicate-id',
      poiId: duplicate.id,
    } satisfies PoiValidationIssue);
  });

  it('detects invalid room references', () => {
    const invalidRoomPoi = clonePoi({ roomId: 'moon-base' });
    const issues = validatePoiDefinitions(
      [...baseDefinitions, invalidRoomPoi],
      {
        floorPlan: FLOOR_PLAN,
      }
    );
    expect(issues).toContainEqual({
      type: 'invalid-room',
      poiId: invalidRoomPoi.id,
      roomId: 'moon-base',
    } satisfies PoiValidationIssue);
  });

  it('flags POIs positioned outside of their room bounds', () => {
    const invalidPositionPoi = clonePoi({
      position: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 },
    });
    const issues = validatePoiDefinitions(
      [...baseDefinitions, invalidPositionPoi],
      {
        floorPlan: FLOOR_PLAN,
      }
    );
    expect(
      issues.find((issue) => issue.type === 'out-of-bounds')
    ).toMatchObject({
      poiId: invalidPositionPoi.id,
      roomId: invalidPositionPoi.roomId,
    });
  });

  it('detects overlapping footprints based on distance heuristics', () => {
    const poiA = clonePoi({
      id: 'futuroptimist-overlap-test' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 2,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.minZ + 2,
      },
    });
    const poiB = clonePoi({
      id: 'futuroptimist-overlap-test-b' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 2.1,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.minZ + 2,
      },
    });
    const issues = validatePoiDefinitions([...baseDefinitions, poiA, poiB], {
      floorPlan: FLOOR_PLAN,
    });
    expect(issues).toContainEqual({
      type: 'overlap',
      poiId: poiA.id,
      otherPoiId: poiB.id,
    } satisfies PoiValidationIssue);
  });

  it('flags POIs that intrude on reserved doorway clearances', () => {
    const doorwayPoi = clonePoi({
      id: 'futuroptimist-doorway-test' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 14,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.maxZ - 0.4,
      },
      footprint: { width: 3.2, depth: 2.4 },
    });

    const issues = validatePoiDefinitions([...baseDefinitions, doorwayPoi], {
      floorPlan: FLOOR_PLAN,
    });

    expect(issues).toContainEqual({
      type: 'doorway-blocked',
      poiId: doorwayPoi.id,
      roomId: doorwayPoi.roomId,
      wall: 'north',
      doorway: expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
    });
  });

  it('includes interaction radii when checking for overlaps', () => {
    const poiA = clonePoi({
      id: 'futuroptimist-interaction-overlap-a' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 6,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.minZ + 6,
      },
      footprint: { width: 0.5, depth: 0.5 },
      interactionRadius: 2,
    });
    const poiB = clonePoi({
      id: 'futuroptimist-interaction-overlap-b' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: poiA.position.x + 3,
        y: baseDefinitions[0].position.y,
        z: poiA.position.z,
      },
      footprint: { width: 0.5, depth: 0.5 },
      interactionRadius: 2,
    });

    const issues = validatePoiDefinitions([...baseDefinitions, poiA, poiB], {
      floorPlan: FLOOR_PLAN,
    });

    expect(issues).toContainEqual({
      type: 'overlap',
      poiId: poiA.id,
      otherPoiId: poiB.id,
    } satisfies PoiValidationIssue);
  });

  it('allows configured POIs to overlap when explicitly permitted', () => {
    const poiA = clonePoi({
      id: 'futuroptimist-overlap-permitted' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 4,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.minZ + 4,
      },
    });
    const poiB = clonePoi({
      id: 'futuroptimist-overlap-permitted-b' as (typeof baseDefinitions)[0]['id'],
      position: {
        x: livingRoomBounds.minX + 4.1,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.minZ + 4,
      },
    });
    const issues = validatePoiDefinitions([...baseDefinitions, poiA, poiB], {
      floorPlan: FLOOR_PLAN,
      allowOverlapFor: [poiA.id, poiB.id],
    });
    expect(issues.every((issue) => issue.type !== 'overlap')).toBe(true);
  });
});

describe('assertValidPoiDefinitions', () => {
  it('throws with aggregated messaging when issues are present', () => {
    const duplicate = { ...baseDefinitions[0] };
    const invalidRoomPoi = clonePoi({
      id: 'invalid-room-poi' as PoiDefinition['id'],
      roomId: 'unknown-room',
    });
    const outOfBoundsPoi = clonePoi({
      id: 'out-of-bounds-poi' as PoiDefinition['id'],
      position: {
        x: FLOOR_PLAN.rooms[0]!.bounds.maxX + 10,
        y: 0,
        z: FLOOR_PLAN.rooms[0]!.bounds.maxZ + 10,
      },
    });
    const overlapA = clonePoi({
      id: 'overlap-a' as PoiDefinition['id'],
      position: baseDefinitions[0].position,
    });
    const overlapB = clonePoi({
      id: 'overlap-b' as PoiDefinition['id'],
      position: {
        x: baseDefinitions[0].position.x + 0.2,
        y: baseDefinitions[0].position.y,
        z: baseDefinitions[0].position.z,
      },
    });
    const doorwayBlocker = clonePoi({
      id: 'doorway-blocker' as PoiDefinition['id'],
      position: {
        x: livingRoomBounds.minX + 14,
        y: baseDefinitions[0].position.y,
        z: livingRoomBounds.maxZ - 0.35,
      },
      footprint: { width: 3.2, depth: 2.4 },
    });

    const problematicList = [
      ...baseDefinitions,
      duplicate,
      invalidRoomPoi,
      outOfBoundsPoi,
      overlapA,
      overlapB,
      doorwayBlocker,
    ];

    expect(() =>
      assertValidPoiDefinitions(problematicList, { floorPlan: FLOOR_PLAN })
    ).toThrowError(/Duplicate POI id detected/);

    try {
      assertValidPoiDefinitions(problematicList, { floorPlan: FLOOR_PLAN });
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('unknown room');
        expect(error.message).toContain('outside livingRoom');
        expect(error.message).toContain('overlap');
        expect(error.message).toContain('doorway');
      } else {
        throw error;
      }
    }
  });
});
