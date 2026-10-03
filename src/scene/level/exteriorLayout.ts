import type { DoorDefinition } from '../../systems/doors/controller';

import type {
  FloorSurfaceDefinition,
  SceneObjectDefinition,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';
import { assertLevelSourceId } from './sourceIds';

/** Preserve the original launch framing while navigation grows outside the house. */
export const HOUSE_CAMERA_OUTLINE: Array<[number, number]> = [
  [-16, -16],
  [16, -16],
  [16, 16],
  [-16, 16],
];
export const FRONT_ENTRY = { x: 16, z: -7.5, width: 3, height: 3.5 } as const;
// A distinct interior approach east of the existing solid stair guard.
export const FRONT_ENTRY_APPROACH = { start: 11.75, end: 14.75 } as const;
const source = assertLevelSourceId;
export const EXTERIOR_ROOMS: SemanticRoomDefinition[] = [
  {
    id: 'frontYard',
    sourceId: source('ground.frontYard.room'),
    name: 'Front Yard',
    bounds: { minX: 16, maxX: 26, minZ: -16, maxZ: -4 },
    ledColor: 0x45644a,
    category: 'exterior',
  },
  {
    id: 'frontPath',
    sourceId: source('ground.frontPath.room'),
    name: 'Front Path',
    bounds: { minX: 16, maxX: 26, minZ: -9, maxZ: -6 },
    ledColor: 0xadb4b0,
    category: 'exterior',
  },
  {
    id: 'sidewalk',
    sourceId: source('ground.sidewalk.room'),
    name: 'Sidewalk',
    bounds: { minX: 26, maxX: 29, minZ: -18, maxZ: 20 },
    ledColor: 0xc2c0b7,
    category: 'exterior',
  },
];
export const EXTERIOR_SURFACES: FloorSurfaceDefinition[] =
  EXTERIOR_ROOMS.flatMap((room) => {
    const path = EXTERIOR_ROOMS.find(
      (candidate) => candidate.id === 'frontPath'
    )!;
    const surfaces =
      room.id === 'frontYard'
        ? [
            {
              suffix: 'south',
              bounds: { ...room.bounds, maxZ: path.bounds.minZ },
            },
            {
              suffix: 'north',
              bounds: { ...room.bounds, minZ: path.bounds.maxZ },
            },
          ]
        : [{ suffix: 'main', bounds: { ...room.bounds } }];
    return surfaces.map(({ suffix, bounds }) => ({
      id: `${room.id}-${suffix}-exterior-surface`,
      sourceId: source(`ground.${room.id}.${suffix}.surface`),
      floorId: 'ground',
      roomId: room.id,
      bounds,
      purpose: 'exterior-surface',
    }));
  });
export const EXTERIOR_OBJECTS: SceneObjectDefinition[] = [
  {
    id: 'front-door',
    sourceId: source('ground.frontEntry.door'),
    kind: 'door.sliding',
    floorId: 'ground',
    roomId: 'frontYard',
    position: { x: FRONT_ENTRY.x, z: FRONT_ENTRY.z },
    purpose:
      'Operable front entrance with a protected threshold and wall pocket',
    colliderPolicy: {
      kind: 'custom',
      purpose:
        'Door progress owns the aperture blocker; the wall encloses the lateral pocket',
    },
  },
  ...[-13, -5].map(
    (z, i): SceneObjectDefinition => ({
      id: `front-planter-${i + 1}`,
      sourceId: source(`ground.frontYard.planter${i + 1}`),
      kind: 'exterior.planter',
      floorId: 'ground',
      roomId: 'frontYard',
      position: { x: 22.5, z },
      purpose: 'Solid planted border outside the entry circulation lane',
      colliderPolicy: { kind: 'solid' },
    })
  ),
];
export const EXTERIOR_WALLS: WallDefinition[] = [
  {
    id: 'front-yard-south-boundary',
    sourceId: source('ground.frontYard.southBoundary'),
    floorId: 'ground',
    wallKind: 'fence',
    height: 1.1,
    rooms: ['frontYard'],
    purpose: 'exterior-boundary',
    run: { start: { x: 16, z: -16 }, end: { x: 26, z: -16 } },
  },
  {
    id: 'front-yard-north-boundary',
    sourceId: source('ground.frontYard.northBoundary'),
    floorId: 'ground',
    wallKind: 'fence',
    height: 1.1,
    rooms: ['frontYard'],
    purpose: 'exterior-boundary',
    run: { start: { x: 16, z: -4 }, end: { x: 26, z: -4 } },
  },
  {
    id: 'sidewalk-east-boundary',
    sourceId: source('ground.sidewalk.eastBoundary'),
    floorId: 'ground',
    wallKind: 'fence',
    height: 0.6,
    rooms: ['sidewalk'],
    purpose: 'exterior-boundary',
    run: { start: { x: 29, z: -18 }, end: { x: 29, z: 20 } },
  },
  ...[-18, 20].map(
    (z, index): WallDefinition => ({
      id: `sidewalk-end-${index}`,
      sourceId: source(`ground.sidewalk.end${index}`),
      floorId: 'ground',
      wallKind: 'fence',
      height: 1.1,
      rooms: ['sidewalk'],
      purpose: 'exterior-boundary',
      run: { start: { x: 26, z }, end: { x: 29, z } },
    })
  ),
];

/** Only plan X/Z are scaled. Heights, travel headroom and timing stay in world units. */
export function createExteriorDoorDefinitions(scale: number): DoorDefinition[] {
  const x = FRONT_ENTRY.x * scale;
  const z = FRONT_ENTRY.z * scale;
  const width = FRONT_ENTRY.width * scale;
  const blockingBounds = {
    minX: x - 0.18,
    maxX: x + 0.18,
    minZ: z - width / 2,
    maxZ: z + width / 2,
  };
  return [
    {
      id: 'front-door',
      sourceId: 'ground.frontEntry.door',
      floorId: 'ground',
      kind: 'sliding',
      center: { x, z },
      width,
      height: FRONT_ENTRY.height,
      depth: 0.36,
      travel: width + 0.22,
      duration: 0.85,
      clearanceProgress: 1,
      blockingBounds,
      threshold: { ...blockingBounds, minX: x - 1.2, maxX: x + 1.2 },
      sweep: { ...blockingBounds, maxZ: z + width * 1.5 + 0.22 },
    },
  ];
}
