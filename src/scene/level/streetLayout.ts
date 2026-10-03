import type {
  FloorSurfaceDefinition,
  SceneObjectDefinition,
  SemanticRoomDefinition,
  WallDefinition,
} from './schema';
import { assertLevelSourceId as source } from './sourceIds';

/** Stable future travel seam. It deliberately contains no destination URL or loader. */
export const BUS_STOP = {
  id: 'residential-bus-stop',
  availability: 'coming-soon',
  futureDestinationRef: 'future-remote-location',
  x: 25.6,
  z: 16,
  interactionRadius: 5,
} as const;
export const PARKED_EV = { x: 33, z: -10, width: 4.6, depth: 9.2 } as const;
export const STREET_LAMPS = {
  x: 29.6,
  z: [-14, -4, 6, 16],
  height: 7.2,
} as const;
export const STREET_ROOMS: SemanticRoomDefinition[] = [
  {
    id: 'street',
    sourceId: source('ground.street.room'),
    name: 'Residential Street',
    bounds: { minX: 29, maxX: 40, minZ: -18, maxZ: 20 },
    ledColor: 0x34404b,
    category: 'exterior',
  },
  {
    id: 'verge',
    sourceId: source('ground.verge.room'),
    name: 'Planted Verge',
    bounds: { minX: 16, maxX: 26, minZ: 8, maxZ: 20 },
    ledColor: 0x45644a,
    category: 'exterior',
  },
  {
    id: 'busStop',
    sourceId: source('ground.busStop.room'),
    name: 'Bus Stop',
    bounds: { minX: 23, maxX: 26, minZ: 13, maxZ: 19 },
    ledColor: 0xc2c0b7,
    category: 'exterior',
  },
];
export const STREET_SURFACES: FloorSurfaceDefinition[] = [
  {
    roomId: 'street',
    suffix: 'curb',
    bounds: { minX: 29, maxX: 29.2, minZ: -18, maxZ: 20 },
  },
  {
    roomId: 'street',
    suffix: 'asphalt',
    bounds: { minX: 29.2, maxX: 40, minZ: -18, maxZ: 20 },
  },
  {
    roomId: 'verge',
    suffix: 'west',
    bounds: { minX: 16, maxX: 23, minZ: 8, maxZ: 20 },
  },
  {
    roomId: 'verge',
    suffix: 'south',
    bounds: { minX: 23, maxX: 26, minZ: 8, maxZ: 13 },
  },
  {
    roomId: 'verge',
    suffix: 'north',
    bounds: { minX: 23, maxX: 26, minZ: 19, maxZ: 20 },
  },
  {
    roomId: 'busStop',
    suffix: 'main',
    bounds: { minX: 23, maxX: 26, minZ: 13, maxZ: 19 },
  },
].map(({ roomId, suffix, bounds }) => ({
  id: `${roomId}-${suffix}-surface`,
  sourceId: source(`ground.${roomId}.${suffix}.surface`),
  floorId: 'ground',
  roomId,
  bounds,
  purpose: 'exterior-surface',
}));
export const STREET_OBJECTS: SceneObjectDefinition[] = [
  {
    id: 'parked-ev',
    sourceId: source('ground.street.parkedEv'),
    kind: 'street.ev',
    floorId: 'ground',
    roomId: 'street',
    position: { x: PARKED_EV.x, z: PARKED_EV.z },
    purpose:
      'Original unbranded 2040 electric sedan parked clear of pedestrian and garage circulation',
    colliderPolicy: { kind: 'solid' },
  },
  {
    id: 'street-lamps',
    sourceId: source('ground.street.lamps'),
    kind: 'street.lamps',
    floorId: 'ground',
    roomId: 'street',
    position: { x: STREET_LAMPS.x, z: 1 },
    purpose: 'Four evenly spaced shielded downward-only LED fixtures',
    colliderPolicy: {
      kind: 'custom',
      purpose:
        'Four solid pole bases; arms and opaque hoods remain above avatar headroom',
    },
  },
  {
    id: BUS_STOP.id,
    sourceId: source('ground.busStop.shelter'),
    kind: 'street.busStop',
    floorId: 'ground',
    roomId: 'busStop',
    position: { x: BUS_STOP.x, z: BUS_STOP.z },
    purpose:
      'Coming Soon travel seam with solid shelter posts and bench; no travel action',
    colliderPolicy: {
      kind: 'custom',
      purpose:
        'Bench and four posts are solid; roof and sign are above avatar headroom',
    },
  },
];
export const STREET_WALLS: WallDefinition[] = [
  {
    id: 'street-east-boundary',
    rooms: ['street'],
    height: 1.1,
    start: { x: 40, z: -18 },
    end: { x: 40, z: 20 },
  },
  {
    id: 'street-south-boundary',
    rooms: ['street'],
    height: 1.1,
    start: { x: 29, z: -18 },
    end: { x: 40, z: -18 },
  },
  {
    id: 'street-north-boundary',
    rooms: ['street'],
    height: 1.1,
    start: { x: 29, z: 20 },
    end: { x: 40, z: 20 },
  },
  {
    id: 'verge-north-boundary',
    rooms: ['verge'],
    height: 1.1,
    start: { x: 16, z: 20 },
    end: { x: 26, z: 20 },
  },
  {
    id: 'verge-west-boundary',
    rooms: ['verge'],
    height: 1.1,
    start: { x: 16, z: 16 },
    end: { x: 16, z: 20 },
  },
].map(({ id, rooms, height, start, end }) => ({
  id,
  rooms,
  height,
  sourceId: source(`ground.street.${id}`),
  floorId: 'ground',
  wallKind: 'fence',
  purpose: 'exterior-boundary',
  run: { start, end },
}));
