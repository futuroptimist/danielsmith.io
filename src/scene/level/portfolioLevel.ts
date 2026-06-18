import type {
  FloorDefinition,
  LevelDefinition,
  SceneObjectDefinition,
  WallDefinition,
} from './schema';
import { assertLevelSourceId } from './sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const DOOR_WIDTH = 4;
const DOOR_HALF_WIDTH = DOOR_WIDTH / 2;

const doorwayRange = (center: number) => ({
  start: center - DOOR_HALF_WIDTH,
  end: center + DOOR_HALF_WIDTH,
});

const gap = (start: number, end: number, label: string) => ({
  start,
  end,
  label,
});

const horizontalWall = (
  id: string,
  source: string,
  floorId: 'ground' | 'upper',
  z: number,
  startX: number,
  endX: number,
  rooms: string[],
  gaps: Array<{ start: number; end: number; label: string }> = [],
  wallKind: WallDefinition['wallKind'] = 'wall'
): WallDefinition => ({
  id,
  sourceId: sourceId(source),
  floorId,
  wallKind,
  rooms,
  purpose: rooms.length === 1 ? 'exterior-boundary' : 'room-boundary',
  run: {
    start: { x: startX, z },
    end: { x: endX, z },
    ...(gaps.length > 0 ? { gaps } : {}),
  },
});

const verticalWall = (
  id: string,
  source: string,
  floorId: 'ground' | 'upper',
  x: number,
  startZ: number,
  endZ: number,
  rooms: string[],
  gaps: Array<{ start: number; end: number; label: string }> = [],
  wallKind: WallDefinition['wallKind'] = 'wall'
): WallDefinition => ({
  id,
  sourceId: sourceId(source),
  floorId,
  wallKind,
  rooms,
  purpose: rooms.length === 1 ? 'exterior-boundary' : 'room-boundary',
  run: {
    start: { x, z: startZ },
    end: { x, z: endZ },
    ...(gaps.length > 0 ? { gaps } : {}),
  },
});

const livingToKitchenDoorCenter = -9;
const livingToStudioDoorCenter = 7.5;
const kitchenToBackyardDoorCenter = -9;
const studioToBackyardDoorCenter = 7.5;
const kitchenToStudioDoorCenterZ = 2;
const upperLandingToCreatorsStudioDoorway = { start: -16, end: -13.07 };
const upperLandingToLoftLibraryDoorway = { start: 2, end: 8.2 };

const centeredGap = (runStart: number, center: number, label: string) => {
  const range = doorwayRange(center);
  return gap(range.start - runStart, range.end - runStart, label);
};

const sceneObject = (
  id: string,
  source: string,
  floorId: 'ground' | 'upper',
  kind: string,
  roomId: string,
  position: { x: number; y?: number; z: number },
  orientation: number,
  purpose: string,
  colliderPolicy: SceneObjectDefinition['colliderPolicy'] = {
    kind: 'custom',
    purpose: 'factory-colliders',
  }
): SceneObjectDefinition => ({
  id,
  sourceId: sourceId(source),
  floorId,
  kind,
  roomId,
  position,
  orientation,
  purpose,
  colliderPolicy,
});

const FLOOR_SURFACE_SOURCE_IDS: Readonly<Record<string, string>> = {
  'ground:livingRoom': 'ground.livingRoom.floor.main',
  'ground:studio': 'ground.studio.floor.main',
  'ground:kitchen': 'ground.kitchen.floor.main',
  'upper:upperLanding': 'upper.upperLanding.floor.main',
  'upper:upperLandingStairEdge': 'upper.upperLanding.floor.stairEdgePiece',
  'upper:creatorsStudio': 'upper.creatorsStudio.floor.main',
  'upper:loftLibrary': 'upper.loftLibrary.floor.main',
  'upper:focusPods': 'upper.focusPods.floor.main',
};

export const UPPER_LANDING_FLOOR_MAIN_ID = 'upperLanding-floor-main';

const floorSurfaceForRoom = (
  floorId: FloorDefinition['id'],
  room: FloorDefinition['rooms'][number]
): FloorDefinition['floorSurfaces'][number] | undefined => {
  if (room.category === 'exterior') return undefined;

  const mappedSourceId = FLOOR_SURFACE_SOURCE_IDS[`${floorId}:${room.id}`];
  if (!mappedSourceId) {
    throw new Error(
      `Missing floor surface source ID for ${floorId}:${room.id}.`
    );
  }

  return {
    id:
      room.id === 'upperLanding'
        ? UPPER_LANDING_FLOOR_MAIN_ID
        : `${room.id}-floor-main`,
    sourceId: sourceId(mappedSourceId),
    floorId,
    bounds: { ...room.bounds },
    roomId: room.id,
    purpose: 'room-floor',
  };
};

type FloorDefinitionInput = Omit<FloorDefinition, 'floorSurfaces'>;

const buildFloor = (floor: FloorDefinitionInput): FloorDefinition => ({
  ...floor,
  floorSurfaces: [
    ...floor.rooms.flatMap((room) => {
      const surface = floorSurfaceForRoom(floor.id, room);
      return surface ? [surface] : [];
    }),
    ...(floor.id === 'upper'
      ? [
          {
            id: 'upperLanding-floor-stair-edge-piece',
            sourceId: sourceId(
              FLOOR_SURFACE_SOURCE_IDS['upper:upperLandingStairEdge']
            ),
            floorId: 'upper',
            bounds: { minX: 4.65, maxX: 7.75, minZ: -16, maxZ: -15.9 },
            roomId: 'upperLanding',
            purpose: 'stair-edge-floor',
          },
        ]
      : []),
  ],
});

export const PORTFOLIO_LEVEL: LevelDefinition = {
  id: 'portfolio',
  floors: [
    buildFloor({
      id: 'ground',
      name: 'Ground Floor',
      outline: [
        [-16, -16],
        [16, -16],
        [16, 16],
        [-16, 16],
      ],
      rooms: [
        {
          id: 'livingRoom',
          sourceId: sourceId('ground.living_room.room'),
          name: 'Living Room',
          bounds: { minX: -16, maxX: 16, minZ: -16, maxZ: -4 },
          ledColor: 0x4cf889,
        },
        {
          id: 'studio',
          sourceId: sourceId('ground.studio.room'),
          name: 'Studio',
          bounds: { minX: -2, maxX: 16, minZ: -4, maxZ: 8 },
          ledColor: 0x58c4ff,
        },
        {
          id: 'kitchen',
          sourceId: sourceId('ground.kitchen.room'),
          name: 'Kitchen',
          bounds: { minX: -16, maxX: -2, minZ: -4, maxZ: 8 },
          ledColor: 0xffb347,
        },
        {
          id: 'backyard',
          sourceId: sourceId('ground.backyard.room'),
          name: 'Backyard',
          bounds: { minX: -16, maxX: 16, minZ: 8, maxZ: 16 },
          ledColor: 0x274f37,
          category: 'exterior',
        },
      ],
      walls: [
        horizontalWall(
          'living-room-south-wall',
          'ground.living_room.south_wall',
          'ground',
          -16,
          -16,
          16,
          ['livingRoom']
        ),
        verticalWall(
          'living-room-west-wall',
          'ground.living_room.west_wall',
          'ground',
          -16,
          -16,
          -4,
          ['livingRoom']
        ),
        verticalWall(
          'living-room-east-wall',
          'ground.living_room.east_wall',
          'ground',
          16,
          -16,
          -4,
          ['livingRoom']
        ),
        horizontalWall(
          'living-room-north-wall',
          'ground.living_room.north_wall',
          'ground',
          -4,
          -16,
          16,
          ['livingRoom', 'kitchen', 'studio'],
          [
            centeredGap(-16, livingToKitchenDoorCenter, 'living-to-kitchen'),
            centeredGap(-16, livingToStudioDoorCenter, 'living-to-studio'),
          ]
        ),
        verticalWall(
          'kitchen-studio-wall',
          'ground.kitchen_studio.wall',
          'ground',
          -2,
          -4,
          8,
          ['kitchen', 'studio'],
          [centeredGap(-4, kitchenToStudioDoorCenterZ, 'kitchen-to-studio')]
        ),
        verticalWall(
          'kitchen-west-wall',
          'ground.kitchen.west_wall',
          'ground',
          -16,
          -4,
          8,
          ['kitchen']
        ),
        verticalWall(
          'studio-east-wall',
          'ground.studio.east_wall',
          'ground',
          16,
          -4,
          8,
          ['studio']
        ),
        horizontalWall(
          'kitchen-studio-backyard-wall',
          'ground.backyard.south_wall',
          'ground',
          8,
          -16,
          16,
          ['kitchen', 'studio', 'backyard'],
          [
            centeredGap(
              -16,
              kitchenToBackyardDoorCenter,
              'kitchen-to-backyard'
            ),
            centeredGap(-16, studioToBackyardDoorCenter, 'studio-to-backyard'),
          ]
        ),
        verticalWall(
          'backyard-west-fence',
          'ground.backyard.west_fence',
          'ground',
          -16,
          8,
          16,
          ['backyard'],
          [],
          'fence'
        ),
        verticalWall(
          'backyard-east-fence',
          'ground.backyard.east_fence',
          'ground',
          16,
          8,
          16,
          ['backyard'],
          [],
          'fence'
        ),
        horizontalWall(
          'backyard-north-fence',
          'ground.backyard.north_fence',
          'ground',
          16,
          -16,
          16,
          ['backyard'],
          [],
          'fence'
        ),
      ],
      sceneObjects: [
        sceneObject(
          'flywheel-studio-flywheel',
          'ground.studio.flywheel_showpiece.scene_object',
          'ground',
          'showpiece.flywheel',
          'studio',
          { x: 11, z: -4 },
          0,
          'POI showpiece and info panel with factory-owned solid colliders'
        ),
        sceneObject(
          'jobbot-studio-terminal',
          'ground.studio.jobbot_terminal.scene_object',
          'ground',
          'showpiece.jobbot_terminal',
          'studio',
          { x: 24, z: 4 },
          -Math.PI / 2,
          'POI terminal with factory-owned desk collider'
        ),
        sceneObject(
          'axel-studio-tracker',
          'ground.studio.axel_navigator.scene_object',
          'ground',
          'showpiece.axel_navigator',
          'studio',
          { x: 20, z: -4 },
          Math.PI,
          'POI navigator with factory-owned dais and console colliders'
        ),
        sceneObject(
          'wove-kitchen-loom',
          'ground.kitchen.wove_loom.scene_object',
          'ground',
          'showpiece.wove_loom',
          'kitchen',
          { x: -15, z: 5 },
          Math.PI * 0.45,
          'POI tactile loom with factory-owned table and loom colliders'
        ),
        sceneObject(
          'pr-reaper-backyard-console',
          'ground.backyard.pr_reaper_console.scene_object',
          'ground',
          'showpiece.pr_reaper_console',
          'backyard',
          { x: 0, z: 20 },
          Math.PI * 0.35,
          'Backyard POI console with factory-owned deck and console colliders'
        ),
      ],
      roomConnections: [
        {
          id: 'living-to-kitchen',
          sourceId: sourceId('ground.living_room_to_kitchen.connection'),
          floorId: 'ground',
          rooms: ['livingRoom', 'kitchen'],
          label: 'Living room to kitchen',
        },
        {
          id: 'living-to-studio',
          sourceId: sourceId('ground.living_room_to_studio.connection'),
          floorId: 'ground',
          rooms: ['livingRoom', 'studio'],
          label: 'Living room to studio',
        },
        {
          id: 'kitchen-to-studio',
          sourceId: sourceId('ground.kitchen_to_studio.connection'),
          floorId: 'ground',
          rooms: ['kitchen', 'studio'],
          label: 'Kitchen to studio',
        },
        {
          id: 'kitchen-to-backyard',
          sourceId: sourceId('ground.kitchen_to_backyard.connection'),
          floorId: 'ground',
          rooms: ['kitchen', 'backyard'],
          label: 'Kitchen to backyard',
        },
        {
          id: 'studio-to-backyard',
          sourceId: sourceId('ground.studio_to_backyard.connection'),
          floorId: 'ground',
          rooms: ['studio', 'backyard'],
          label: 'Studio to backyard',
        },
      ],
    }),
    buildFloor({
      id: 'upper',
      name: 'Upper Floor',
      outline: [
        [-14, -16],
        [14, -16],
        [14, 14],
        [-14, 14],
      ],
      rooms: [
        {
          id: 'upperLanding',
          sourceId: sourceId('upper.upper_landing.room'),
          name: 'Upper Landing',
          bounds: { minX: 2, maxX: 10.4, minZ: -16, maxZ: -8 },
          ledColor: 0xffba52,
        },
        {
          id: 'creatorsStudio',
          sourceId: sourceId('upper.creators_studio.room'),
          name: 'Creators Studio',
          bounds: { minX: -10, maxX: 2, minZ: -16, maxZ: 0 },
          ledColor: 0x7bd5ff,
        },
        {
          id: 'loftLibrary',
          sourceId: sourceId('upper.loft_library.room'),
          name: 'Loft Library',
          bounds: { minX: 2, maxX: 12, minZ: -8, maxZ: 6 },
          ledColor: 0xc3a7ff,
        },
        {
          id: 'focusPods',
          sourceId: sourceId('upper.focus_pods.room'),
          name: 'Focus Pods',
          bounds: { minX: -10, maxX: 12, minZ: 6, maxZ: 14 },
          ledColor: 0x9cf7c7,
        },
      ],
      walls: [
        horizontalWall(
          'creators-studio-south-wall',
          'upper.creators_studio.south_wall',
          'upper',
          -16,
          -10,
          2,
          ['creatorsStudio']
        ),
        verticalWall(
          'creators-studio-west-wall',
          'upper.creators_studio.west_wall',
          'upper',
          -10,
          -16,
          0,
          ['creatorsStudio']
        ),
        verticalWall(
          'creators-studio-upper-landing-wall',
          'upper.creators_studio_to_upper_landing.wall',
          'upper',
          2,
          -16,
          0,
          ['creatorsStudio', 'upperLanding', 'loftLibrary'],
          [
            gap(
              0,
              upperLandingToCreatorsStudioDoorway.end -
                upperLandingToCreatorsStudioDoorway.start,
              'creators-studio-to-landing'
            ),
            centeredGap(-16, -4, 'creators-studio-to-library'),
          ]
        ),
        horizontalWall(
          'creators-studio-north-wall',
          'upper.creators_studio.north_wall',
          'upper',
          0,
          -10,
          2,
          ['creatorsStudio']
        ),
        verticalWall(
          'loft-library-west-wall',
          'upper.loft_library.west_wall',
          'upper',
          2,
          0,
          6,
          ['loftLibrary']
        ),
        horizontalWall(
          'focus-pods-south-wall',
          'upper.focus_pods.south_wall',
          'upper',
          6,
          -10,
          2,
          ['focusPods']
        ),
        horizontalWall(
          'upper-landing-south-wall',
          'upper.upper_landing.south_wall',
          'upper',
          -16,
          2,
          10.4,
          ['upperLanding']
        ),
        verticalWall(
          'upper-landing-east-wall',
          'upper.upper_landing.east_wall',
          'upper',
          10.4,
          -16,
          -8,
          ['upperLanding']
        ),
        horizontalWall(
          'upper-landing-loft-library-wall',
          'upper.upper_landing_to_loft_library.wall',
          'upper',
          -8,
          2,
          12,
          ['upperLanding', 'loftLibrary'],
          [
            gap(
              0,
              upperLandingToLoftLibraryDoorway.end -
                upperLandingToLoftLibraryDoorway.start,
              'landing-to-library'
            ),
          ]
        ),
        verticalWall(
          'loft-library-east-wall',
          'upper.loft_library.east_wall',
          'upper',
          12,
          -8,
          6,
          ['loftLibrary']
        ),
        horizontalWall(
          'loft-library-focus-pods-wall',
          'upper.loft_library_to_focus_pods.wall',
          'upper',
          6,
          2,
          12,
          ['loftLibrary', 'focusPods'],
          [centeredGap(2, 4, 'library-to-focus-pods')]
        ),
        horizontalWall(
          'focus-pods-north-wall',
          'upper.focus_pods.north_wall',
          'upper',
          14,
          -10,
          12,
          ['focusPods']
        ),
        verticalWall(
          'focus-pods-west-wall',
          'upper.focus_pods.west_wall',
          'upper',
          -10,
          6,
          14,
          ['focusPods']
        ),
        verticalWall(
          'focus-pods-east-wall',
          'upper.focus_pods.east_wall',
          'upper',
          12,
          6,
          14,
          ['focusPods']
        ),
      ],
      roomConnections: [
        {
          id: 'upper-landing-to-creators-studio',
          sourceId: sourceId(
            'upper.upper_landing_to_creators_studio.connection'
          ),
          floorId: 'upper',
          rooms: ['upperLanding', 'creatorsStudio'],
          label: 'Upper landing to creators studio',
        },
        {
          id: 'upper-landing-to-loft-library',
          sourceId: sourceId('upper.upper_landing_to_loft_library.connection'),
          floorId: 'upper',
          rooms: ['upperLanding', 'loftLibrary'],
          label: 'Upper landing to loft library',
        },
        {
          id: 'creators-studio-to-loft-library',
          sourceId: sourceId(
            'upper.creators_studio_to_loft_library.connection'
          ),
          floorId: 'upper',
          rooms: ['creatorsStudio', 'loftLibrary'],
          label: 'Creators studio to loft library',
        },
        {
          id: 'loft-library-to-focus-pods',
          sourceId: sourceId('upper.loft_library_to_focus_pods.connection'),
          floorId: 'upper',
          rooms: ['loftLibrary', 'focusPods'],
          label: 'Loft library to focus pods',
        },
      ],
    }),
  ],
};
