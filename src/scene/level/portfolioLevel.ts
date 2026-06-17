import type { LevelDefinition, WallDefinition } from './schema';
import { assertLevelSourceId } from './sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const runGap = (start: number, end: number, label: string) => ({
  start,
  end,
  label,
});

const horizontalWall = (
  floorId: string,
  id: string,
  z: number,
  minX: number,
  maxX: number,
  rooms: string[],
  gaps: Array<{ start: number; end: number; label: string }> = []
): WallDefinition => ({
  id,
  sourceId: sourceId(`${floorId}.${id.replaceAll('-', '_')}.wall`),
  floorId,
  wallKind: rooms.includes('backyard') ? 'fence' : 'wall',
  purpose: rooms.length > 1 ? 'room-boundary' : 'exterior-boundary',
  rooms,
  run: {
    start: { x: minX, z },
    end: { x: maxX, z },
    gaps,
  },
});

const verticalWall = (
  floorId: string,
  id: string,
  x: number,
  minZ: number,
  maxZ: number,
  rooms: string[],
  gaps: Array<{ start: number; end: number; label: string }> = []
): WallDefinition => ({
  id,
  sourceId: sourceId(`${floorId}.${id.replaceAll('-', '_')}.wall`),
  floorId,
  wallKind: rooms.includes('backyard') ? 'fence' : 'wall',
  purpose: rooms.length > 1 ? 'room-boundary' : 'exterior-boundary',
  rooms,
  run: {
    start: { x, z: minZ },
    end: { x, z: maxZ },
    gaps,
  },
});

export const PORTFOLIO_LEVEL: LevelDefinition = {
  id: 'portfolio-home',
  floors: [
    {
      id: 'ground',
      name: 'Ground floor',
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
        horizontalWall('ground', 'living-room-south', -16, -16, 16, [
          'livingRoom',
        ]),
        verticalWall('ground', 'living-room-west', -16, -16, -4, [
          'livingRoom',
        ]),
        verticalWall('ground', 'living-room-east', 16, -16, -4, ['livingRoom']),
        horizontalWall(
          'ground',
          'living-kitchen-studio',
          -4,
          -16,
          16,
          ['livingRoom', 'kitchen', 'studio'],
          [
            runGap(5, 9, 'living room to studio passage'),
            runGap(21.5, 25.5, 'living room to kitchen passage'),
          ]
        ),
        verticalWall(
          'ground',
          'kitchen-studio',
          -2,
          -4,
          8,
          ['kitchen', 'studio'],
          [runGap(4, 8, 'kitchen to studio passage')]
        ),
        verticalWall('ground', 'kitchen-west', -16, -4, 8, ['kitchen']),
        verticalWall('ground', 'studio-east', 16, -4, 8, ['studio']),
        horizontalWall(
          'ground',
          'kitchen-studio-backyard',
          8,
          -16,
          16,
          ['kitchen', 'studio', 'backyard'],
          [
            runGap(5, 9, 'kitchen to backyard passage'),
            runGap(21.5, 25.5, 'studio to backyard passage'),
          ]
        ),
        verticalWall('ground', 'backyard-west', -16, 8, 16, ['backyard']),
        verticalWall('ground', 'backyard-east', 16, 8, 16, ['backyard']),
        horizontalWall('ground', 'backyard-north', 16, -16, 16, ['backyard']),
      ],
      floorSurfaces: [],
      roomConnections: [
        {
          id: 'living-room-to-kitchen',
          sourceId: sourceId('ground.living_room_to_kitchen.connection'),
          floorId: 'ground',
          rooms: ['livingRoom', 'kitchen'],
          purpose: 'semantic adjacency only',
        },
        {
          id: 'living-room-to-studio',
          sourceId: sourceId('ground.living_room_to_studio.connection'),
          floorId: 'ground',
          rooms: ['livingRoom', 'studio'],
          purpose: 'semantic adjacency only',
        },
      ],
    },
    {
      id: 'upper',
      name: 'Upper floor',
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
        horizontalWall('upper', 'upper-landing-south', -16, 2, 10.4, [
          'upperLanding',
        ]),
        verticalWall('upper', 'upper-landing-east', 10.4, -16, -8, [
          'upperLanding',
        ]),
        verticalWall(
          'upper',
          'upper-landing-creators-studio',
          2,
          -16,
          -8,
          ['upperLanding', 'creatorsStudio'],
          [runGap(0, 2.93, 'upper landing to creators studio passage')]
        ),
        horizontalWall(
          'upper',
          'upper-landing-loft-library',
          -8,
          2,
          10.4,
          ['upperLanding', 'loftLibrary'],
          [runGap(0, 6.2, 'upper landing to loft library passage')]
        ),
        horizontalWall('upper', 'creators-studio-south', -16, -10, 2, [
          'creatorsStudio',
        ]),
        verticalWall('upper', 'creators-studio-west', -10, -16, 0, [
          'creatorsStudio',
        ]),
        horizontalWall('upper', 'creators-studio-north', 0, -10, 2, [
          'creatorsStudio',
        ]),
        verticalWall(
          'upper',
          'creators-studio-loft-library',
          2,
          -8,
          6,
          ['creatorsStudio', 'loftLibrary'],
          [runGap(2, 6, 'creators studio to loft library passage')]
        ),
        verticalWall('upper', 'loft-library-east', 12, -8, 6, ['loftLibrary']),
        horizontalWall(
          'upper',
          'loft-library-focus-pods',
          6,
          2,
          12,
          ['loftLibrary', 'focusPods'],
          [runGap(0, 4, 'loft library to focus pods passage')]
        ),
        horizontalWall('upper', 'focus-pods-south-west', 6, -10, 2, [
          'focusPods',
        ]),
        verticalWall('upper', 'focus-pods-west', -10, 6, 14, ['focusPods']),
        verticalWall('upper', 'focus-pods-east', 12, 6, 14, ['focusPods']),
        horizontalWall('upper', 'focus-pods-north', 14, -10, 12, ['focusPods']),
      ],
      floorSurfaces: [],
      roomConnections: [
        {
          id: 'upper-landing-to-creators-studio',
          sourceId: sourceId(
            'upper.upper_landing_to_creators_studio.connection'
          ),
          floorId: 'upper',
          rooms: ['upperLanding', 'creatorsStudio'],
          purpose: 'semantic adjacency only',
        },
      ],
    },
  ],
};

for (const floor of PORTFOLIO_LEVEL.floors) {
  floor.floorSurfaces = floor.rooms.map((room) => ({
    id: `${room.id}-floor`,
    sourceId: sourceId(
      `${floor.id}.${room.id.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}.floor_surface`
    ),
    floorId: floor.id,
    roomId: room.id,
    bounds: { ...room.bounds },
    purpose: 'walkable floor',
  }));
}

export const PORTFOLIO_GROUND_FLOOR = PORTFOLIO_LEVEL.floors[0];
export const PORTFOLIO_UPPER_FLOOR = PORTFOLIO_LEVEL.floors[1];
