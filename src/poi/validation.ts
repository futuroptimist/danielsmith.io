import type { FloorPlanDefinition, RoomWall } from '../floorPlan';
import {
  getDoorwayClearanceZones,
  type DoorwayClearanceZone,
} from '../floorPlan/doorways';

import type { PoiDefinition, PoiId } from './types';

export type PoiValidationIssue =
  | { type: 'duplicate-id'; poiId: PoiId }
  | { type: 'invalid-room'; poiId: PoiId; roomId: string }
  | {
      type: 'out-of-bounds';
      poiId: PoiId;
      roomId: string;
      position: { x: number; z: number };
    }
  | { type: 'overlap'; poiId: PoiId; otherPoiId: PoiId }
  | {
      type: 'doorway-blocked';
      poiId: PoiId;
      roomId: string;
      wall: RoomWall;
      doorway: { start: number; end: number };
    };

export interface PoiValidationOptions {
  floorPlan: FloorPlanDefinition;
  /** Optional epsilon for floating point comparisons. */
  epsilon?: number;
  /** Allow small overlaps when POIs are conceptually the same exhibit. */
  allowOverlapFor?: PoiId[];
}

const defaultOptions: Required<Omit<PoiValidationOptions, 'floorPlan'>> = {
  epsilon: 1e-4,
  allowOverlapFor: [],
};

interface RectLike {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function rectanglesOverlap(a: RectLike, b: RectLike, epsilon: number): boolean {
  return (
    a.minX < b.maxX - epsilon &&
    a.maxX > b.minX + epsilon &&
    a.minZ < b.maxZ - epsilon &&
    a.maxZ > b.minZ + epsilon
  );
}

export function validatePoiDefinitions(
  definitions: PoiDefinition[],
  options: PoiValidationOptions
): PoiValidationIssue[] {
  const { floorPlan } = options;
  const { epsilon, allowOverlapFor } = { ...defaultOptions, ...options };

  const issues: PoiValidationIssue[] = [];
  const seen = new Map<PoiId, PoiDefinition>();
  const roomLookup = new Map(floorPlan.rooms.map((room) => [room.id, room]));
  const clearances = getDoorwayClearanceZones(floorPlan);
  const clearancesByRoom = new Map<string, DoorwayClearanceZone[]>(
    floorPlan.rooms.map((room) => [room.id, []])
  );
  clearances.forEach((zone) => {
    const list = clearancesByRoom.get(zone.roomId);
    if (list) {
      list.push(zone);
    } else {
      clearancesByRoom.set(zone.roomId, [zone]);
    }
  });

  definitions.forEach((definition) => {
    const duplicate = seen.get(definition.id);
    if (duplicate) {
      issues.push({ type: 'duplicate-id', poiId: definition.id });
    } else {
      seen.set(definition.id, definition);
    }

    const room = roomLookup.get(definition.roomId);
    if (!room) {
      issues.push({
        type: 'invalid-room',
        poiId: definition.id,
        roomId: definition.roomId,
      });
      return;
    }

    const { x, z } = definition.position;
    if (
      x < room.bounds.minX - epsilon ||
      x > room.bounds.maxX + epsilon ||
      z < room.bounds.minZ - epsilon ||
      z > room.bounds.maxZ + epsilon
    ) {
      issues.push({
        type: 'out-of-bounds',
        poiId: definition.id,
        roomId: definition.roomId,
        position: { x, z },
      });
    }

    const footprintBounds = {
      minX: x - definition.footprint.width / 2,
      maxX: x + definition.footprint.width / 2,
      minZ: z - definition.footprint.depth / 2,
      maxZ: z + definition.footprint.depth / 2,
    };
    const roomClearances = clearancesByRoom.get(definition.roomId) ?? [];
    const blockingDoorway = roomClearances.find((zone) =>
      rectanglesOverlap(zone.bounds, footprintBounds, epsilon)
    );
    if (blockingDoorway) {
      issues.push({
        type: 'doorway-blocked',
        poiId: definition.id,
        roomId: definition.roomId,
        wall: blockingDoorway.wall,
        doorway: {
          start: blockingDoorway.doorway.start,
          end: blockingDoorway.doorway.end,
        },
      });
    }
  });

  const allowOverlapSet = new Set(allowOverlapFor ?? []);
  const pairs = definitions.length;
  for (let i = 0; i < pairs; i += 1) {
    const a = definitions[i];
    if (!a) continue;
    const footprintRadiusA = Math.hypot(
      a.footprint.width / 2,
      a.footprint.depth / 2
    );
    const radiusA = Math.max(footprintRadiusA, a.interactionRadius);

    for (let j = i + 1; j < pairs; j += 1) {
      const b = definitions[j];
      if (!b) continue;

      if (allowOverlapSet.has(a.id) && allowOverlapSet.has(b.id)) {
        continue;
      }

      const footprintRadiusB = Math.hypot(
        b.footprint.width / 2,
        b.footprint.depth / 2
      );
      const radiusB = Math.max(footprintRadiusB, b.interactionRadius);
      const dx = a.position.x - b.position.x;
      const dz = a.position.z - b.position.z;
      const distance = Math.hypot(dx, dz);

      if (distance + epsilon < radiusA + radiusB) {
        issues.push({
          type: 'overlap',
          poiId: a.id,
          otherPoiId: b.id,
        });
      }
    }
  }

  return issues;
}

export function assertValidPoiDefinitions(
  definitions: PoiDefinition[],
  options: PoiValidationOptions
): void {
  const issues = validatePoiDefinitions(definitions, options);
  if (issues.length === 0) {
    return;
  }

  const message = issues
    .map((issue) => {
      switch (issue.type) {
        case 'duplicate-id':
          return `Duplicate POI id detected: ${issue.poiId}`;
        case 'invalid-room':
          return `POI ${issue.poiId} references unknown room ${issue.roomId}`;
        case 'out-of-bounds': {
          const x = issue.position.x.toFixed(2);
          const z = issue.position.z.toFixed(2);
          return `POI ${issue.poiId} is outside ${issue.roomId} bounds at (${x}, ${z})`;
        }
        case 'overlap':
          return `POIs ${issue.poiId} and ${issue.otherPoiId} overlap beyond allowed footprint clearance`;
        case 'doorway-blocked': {
          const start = issue.doorway.start.toFixed(2);
          const end = issue.doorway.end.toFixed(2);
          return `POI ${issue.poiId} blocks the ${issue.wall} doorway (${start}–${end}) of ${issue.roomId}`;
        }
        default:
          return 'Unknown POI validation issue';
      }
    })
    .join('\n');

  throw new Error(`POI registry validation failed:\n${message}`);
}
