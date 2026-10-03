import type { DoorDefinition } from '../../systems/doors/controller';

import type {
  SceneObjectDefinition,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';
import { assertLevelSourceId } from './sourceIds';

const source = assertLevelSourceId;
export const HOUSE_GARAGE_DOOR = {
  x: 16,
  z: -1,
  width: 3,
  height: 3.5,
} as const;
export const GARAGE_DOOR = {
  x: 25,
  z: 2,
  width: 7,
  height: 4.8,
  minimumHeadroom: 3.1,
} as const;
export const GARAGE_ROOMS: SemanticRoomDefinition[] = [
  {
    id: 'garage',
    sourceId: source('ground.garage.room'),
    name: 'Attached Garage',
    bounds: { minX: 16, maxX: 25, minZ: -4, maxZ: 8 },
    ledColor: 0xe7cfa9,
    category: 'interior',
  },
  {
    id: 'driveway',
    sourceId: source('ground.driveway.room'),
    name: 'Driveway',
    bounds: { minX: 25, maxX: 29, minZ: -4, maxZ: 8 },
    ledColor: 0x66737c,
    category: 'exterior',
  },
];
export const GARAGE_WALLS: WallDefinition[] = [
  {
    id: 'garage-south-wall',
    sourceId: source('ground.garage.southWall'),
    floorId: 'ground',
    wallKind: 'wall',
    rooms: ['garage', 'frontYard'],
    purpose: 'room-boundary',
    run: { start: { x: 16, z: -4 }, end: { x: 25, z: -4 } },
  },
  {
    id: 'garage-north-wall',
    sourceId: source('ground.garage.northWall'),
    floorId: 'ground',
    wallKind: 'wall',
    rooms: ['garage'],
    purpose: 'exterior-boundary',
    run: { start: { x: 16, z: 8 }, end: { x: 25, z: 8 } },
  },
  {
    id: 'garage-east-wall',
    sourceId: source('ground.garage.eastWall'),
    floorId: 'ground',
    wallKind: 'wall',
    rooms: ['garage', 'driveway'],
    purpose: 'room-boundary',
    run: {
      start: { x: 25, z: -4 },
      end: { x: 25, z: 8 },
      gaps: [
        {
          start: GARAGE_DOOR.z - GARAGE_DOOR.width / 2 + 4,
          end: GARAGE_DOOR.z + GARAGE_DOOR.width / 2 + 4,
          label: 'garage-to-driveway',
        },
      ],
    },
  },
  {
    id: 'driveway-north-edge',
    sourceId: source('ground.driveway.northBoundary'),
    floorId: 'ground',
    wallKind: 'fence',
    height: 0.6,
    rooms: ['driveway'],
    purpose: 'exterior-boundary',
    run: { start: { x: 25, z: 8 }, end: { x: 26, z: 8 } },
  },
];
export const GARAGE_OBJECTS: SceneObjectDefinition[] = [
  {
    id: 'house-garage-door',
    sourceId: source('ground.garage.houseDoor'),
    floorId: 'ground',
    roomId: 'garage',
    kind: 'door.sliding',
    position: { x: HOUSE_GARAGE_DOOR.x, z: HOUSE_GARAGE_DOOR.z },
    purpose: 'Pedestrian house/garage connection',
    colliderPolicy: {
      kind: 'custom',
      purpose:
        'Protected sliding-door aperture controlled by authoritative progress',
    },
  },
  {
    id: 'garage-door',
    sourceId: source('ground.garage.vehicleDoor'),
    floorId: 'ground',
    roomId: 'garage',
    kind: 'door.overhead',
    position: { x: GARAGE_DOOR.x, z: GARAGE_DOOR.z },
    purpose: 'Operable overhead vehicle entrance',
    colliderPolicy: {
      kind: 'custom',
      purpose:
        'The overhead panel blocks until its lower edge provides avatar ' +
        'headroom; occupancy prevents closing',
    },
  },
  {
    id: 'garage-workbench',
    sourceId: source('ground.garage.workbench'),
    floorId: 'ground',
    roomId: 'garage',
    kind: 'garage.workbench',
    position: { x: 21, z: 6.8 },
    purpose: 'Solid rear-wall workbench clear of both door approaches',
    colliderPolicy: { kind: 'solid' },
  },
  {
    id: 'garage-cabinet',
    sourceId: source('ground.garage.cabinet'),
    floorId: 'ground',
    roomId: 'garage',
    kind: 'garage.cabinet',
    position: { x: 23.75, z: 6.4 },
    purpose: 'Solid storage cabinet outside the vehicle aperture',
    colliderPolicy: { kind: 'solid' },
  },
];

export function createGarageDoorDefinitions(scale: number): DoorDefinition[] {
  return [
    {
      id: 'house-garage-door',
      sourceId: 'ground.garage.houseDoor',
      kind: 'sliding' as const,
      plan: HOUSE_GARAGE_DOOR,
    },
    {
      id: 'garage-door',
      sourceId: 'ground.garage.vehicleDoor',
      kind: 'overhead' as const,
      plan: GARAGE_DOOR,
    },
  ].map(({ id, sourceId, kind, plan }) => {
    const x = plan.x * scale;
    const z = plan.z * scale;
    const width = plan.width * scale;
    const blockingBounds = {
      minX: x - 0.18,
      maxX: x + 0.18,
      minZ: z - width / 2,
      maxZ: z + width / 2,
    };
    const threshold = { ...blockingBounds, minX: x - 1.2, maxX: x + 1.2 };
    return {
      id,
      sourceId,
      floorId: 'ground',
      kind,
      center: { x, z },
      width,
      height: plan.height,
      depth: 0.36,
      travel: kind === 'overhead' ? plan.height : width + 0.22,
      duration: kind === 'overhead' ? 1.8 : 0.85,
      clearanceProgress:
        kind === 'overhead'
          ? GARAGE_DOOR.minimumHeadroom / GARAGE_DOOR.height
          : 1,
      blockingBounds,
      threshold,
      sweep:
        kind === 'overhead'
          ? threshold
          : { ...blockingBounds, maxZ: z + width * 1.5 + 0.22 },
    };
  });
}
