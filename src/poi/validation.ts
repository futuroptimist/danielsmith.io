import type { FloorPlanDefinition } from '../floorPlan';

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
  | { type: 'overlap'; poiId: PoiId; otherPoiId: PoiId };

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

export function validatePoiDefinitions(
  definitions: PoiDefinition[],
  options: PoiValidationOptions
): PoiValidationIssue[] {
  const { floorPlan } = options;
  const { epsilon, allowOverlapFor } = { ...defaultOptions, ...options };

  const issues: PoiValidationIssue[] = [];
  const seen = new Map<PoiId, PoiDefinition>();
  const roomLookup = new Map(floorPlan.rooms.map((room) => [room.id, room]));

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
        default:
          return 'Unknown POI validation issue';
      }
    })
    .join('\n');

  throw new Error(`POI registry validation failed:\n${message}`);
}
