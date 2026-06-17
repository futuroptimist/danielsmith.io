import type {
  LevelDefinition,
  WallDefinition,
  WallRunGapDefinition,
} from './schema';
import { assertValidLevelDefinition } from './schema';
import { assertLevelSourceId } from './sourceIds';

const sourceId = (value: string) => assertLevelSourceId(value);

const asGap = (start: number, end: number): WallRunGapDefinition => ({
  start,
  end,
});

/**
 * Canonical current-state level source for the portfolio house.
 *
 * Rooms, wall runs, openings, and semantic room connections live here first.
 * Legacy floor-plan exports adapt this data until the remaining scene builders
 * consume declarative level records directly.
 */
export const PORTFOLIO_LEVEL: LevelDefinition = {
  id: 'portfolio-level',
  floors: [
    {
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
        wall(
          'ground-living-south-wall',
          'ground.living_room.south_wall',
          'ground',
          {
            start: { x: -16, z: -16 },
            end: { x: 16, z: -16 },
          },
          ['livingRoom'],
          'exterior-boundary'
        ),
        wall(
          'ground-living-north-wall',
          'ground.living_room.north_wall',
          'ground',
          {
            start: { x: -16, z: -4 },
            end: { x: 16, z: -4 },
            gaps: [asGap(5, 9), asGap(21.5, 25.5)],
          },
          ['livingRoom', 'kitchen', 'studio']
        ),
        wall(
          'ground-living-west-wall',
          'ground.living_room.west_wall',
          'ground',
          {
            start: { x: -16, z: -16 },
            end: { x: -16, z: -4 },
          },
          ['livingRoom'],
          'exterior-boundary'
        ),
        wall(
          'ground-living-east-wall',
          'ground.living_room.east_wall',
          'ground',
          {
            start: { x: 16, z: -16 },
            end: { x: 16, z: -4 },
          },
          ['livingRoom'],
          'exterior-boundary'
        ),
        wall(
          'ground-kitchen-studio-wall',
          'ground.kitchen_studio.wall',
          'ground',
          {
            start: { x: -2, z: -4 },
            end: { x: -2, z: 8 },
            gaps: [asGap(4, 8)],
          },
          ['kitchen', 'studio']
        ),
        wall(
          'ground-kitchen-west-wall',
          'ground.kitchen.west_wall',
          'ground',
          {
            start: { x: -16, z: -4 },
            end: { x: -16, z: 8 },
          },
          ['kitchen'],
          'exterior-boundary'
        ),
        wall(
          'ground-studio-east-wall',
          'ground.studio.east_wall',
          'ground',
          {
            start: { x: 16, z: -4 },
            end: { x: 16, z: 8 },
          },
          ['studio'],
          'exterior-boundary'
        ),
        wall(
          'ground-backyard-south-wall',
          'ground.backyard.south_wall',
          'ground',
          {
            start: { x: -16, z: 8 },
            end: { x: 16, z: 8 },
            gaps: [asGap(5, 9), asGap(21.5, 25.5)],
          },
          ['kitchen', 'studio', 'backyard']
        ),
        wall(
          'ground-backyard-north-wall',
          'ground.backyard.north_wall',
          'ground',
          {
            start: { x: -16, z: 16 },
            end: { x: 16, z: 16 },
          },
          ['backyard'],
          'exterior-boundary'
        ),
        wall(
          'ground-backyard-west-wall',
          'ground.backyard.west_wall',
          'ground',
          {
            start: { x: -16, z: 8 },
            end: { x: -16, z: 16 },
          },
          ['backyard'],
          'exterior-boundary'
        ),
        wall(
          'ground-backyard-east-wall',
          'ground.backyard.east_wall',
          'ground',
          {
            start: { x: 16, z: 8 },
            end: { x: 16, z: 16 },
          },
          ['backyard'],
          'exterior-boundary'
        ),
      ],
      floorSurfaces: [
        surface('ground', 'livingRoom', {
          minX: -16,
          maxX: 16,
          minZ: -16,
          maxZ: -4,
        }),
        surface('ground', 'studio', { minX: -2, maxX: 16, minZ: -4, maxZ: 8 }),
        surface('ground', 'kitchen', {
          minX: -16,
          maxX: -2,
          minZ: -4,
          maxZ: 8,
        }),
        surface('ground', 'backyard', {
          minX: -16,
          maxX: 16,
          minZ: 8,
          maxZ: 16,
        }),
      ],
      roomConnections: [
        connection(
          'ground-living-kitchen',
          'ground.living_room_kitchen.connection',
          'ground',
          ['livingRoom', 'kitchen']
        ),
        connection(
          'ground-living-studio',
          'ground.living_room_studio.connection',
          'ground',
          ['livingRoom', 'studio']
        ),
        connection(
          'ground-kitchen-studio',
          'ground.kitchen_studio.connection',
          'ground',
          ['kitchen', 'studio']
        ),
        connection(
          'ground-kitchen-backyard',
          'ground.kitchen_backyard.connection',
          'ground',
          ['kitchen', 'backyard']
        ),
        connection(
          'ground-studio-backyard',
          'ground.studio_backyard.connection',
          'ground',
          ['studio', 'backyard']
        ),
      ],
    },
    {
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
        wall(
          'upper-south-wall',
          'upper.south_wall',
          'upper',
          {
            start: { x: -10, z: -16 },
            end: { x: 10.4, z: -16 },
          },
          ['creatorsStudio', 'upperLanding'],
          'exterior-boundary'
        ),
        wall(
          'upper-landing-creators-wall',
          'upper.upper_landing_creators_studio.wall',
          'upper',
          {
            start: { x: 2, z: -16 },
            end: { x: 2, z: -8 },
            gaps: [asGap(0, 2.93)],
          },
          ['upperLanding', 'creatorsStudio']
        ),
        wall(
          'upper-landing-east-wall',
          'upper.upper_landing.east_wall',
          'upper',
          {
            start: { x: 10.4, z: -16 },
            end: { x: 10.4, z: -8 },
          },
          ['upperLanding'],
          'exterior-boundary'
        ),
        wall(
          'upper-landing-library-wall',
          'upper.upper_landing_loft_library.wall',
          'upper',
          {
            start: { x: 2, z: -8 },
            end: { x: 12, z: -8 },
            gaps: [asGap(0, 6.2)],
          },
          ['upperLanding', 'loftLibrary']
        ),
        wall(
          'upper-creators-west-wall',
          'upper.creators_studio.west_wall',
          'upper',
          {
            start: { x: -10, z: -16 },
            end: { x: -10, z: 0 },
          },
          ['creatorsStudio'],
          'exterior-boundary'
        ),
        wall(
          'upper-creators-north-wall',
          'upper.creators_studio.north_wall',
          'upper',
          {
            start: { x: -10, z: 0 },
            end: { x: 2, z: 0 },
          },
          ['creatorsStudio']
        ),
        wall(
          'upper-library-west-wall',
          'upper.loft_library.west_wall',
          'upper',
          {
            start: { x: 2, z: -8 },
            end: { x: 2, z: 6 },
            gaps: [asGap(2, 6)],
          },
          ['creatorsStudio', 'loftLibrary']
        ),
        wall(
          'upper-library-east-wall',
          'upper.loft_library.east_wall',
          'upper',
          {
            start: { x: 12, z: -8 },
            end: { x: 12, z: 14 },
          },
          ['loftLibrary', 'focusPods'],
          'exterior-boundary'
        ),
        wall(
          'upper-focus-south-wall',
          'upper.focus_pods.south_wall',
          'upper',
          {
            start: { x: -10, z: 6 },
            end: { x: 12, z: 6 },
            gaps: [asGap(12, 16)],
          },
          ['loftLibrary', 'focusPods']
        ),
        wall(
          'upper-focus-north-wall',
          'upper.focus_pods.north_wall',
          'upper',
          {
            start: { x: -10, z: 14 },
            end: { x: 12, z: 14 },
          },
          ['focusPods'],
          'exterior-boundary'
        ),
        wall(
          'upper-focus-west-wall',
          'upper.focus_pods.west_wall',
          'upper',
          {
            start: { x: -10, z: 6 },
            end: { x: -10, z: 14 },
          },
          ['focusPods'],
          'exterior-boundary'
        ),
      ],
      floorSurfaces: [
        surface('upper', 'upperLanding', {
          minX: 2,
          maxX: 10.4,
          minZ: -16,
          maxZ: -8,
        }),
        surface('upper', 'creatorsStudio', {
          minX: -10,
          maxX: 2,
          minZ: -16,
          maxZ: 0,
        }),
        surface('upper', 'loftLibrary', {
          minX: 2,
          maxX: 12,
          minZ: -8,
          maxZ: 6,
        }),
        surface('upper', 'focusPods', {
          minX: -10,
          maxX: 12,
          minZ: 6,
          maxZ: 14,
        }),
      ],
      roomConnections: [
        connection(
          'upper-landing-creators',
          'upper.upper_landing_creators_studio.connection',
          'upper',
          ['upperLanding', 'creatorsStudio']
        ),
        connection(
          'upper-landing-library',
          'upper.upper_landing_loft_library.connection',
          'upper',
          ['upperLanding', 'loftLibrary']
        ),
        connection(
          'upper-creators-library',
          'upper.creators_studio_loft_library.connection',
          'upper',
          ['creatorsStudio', 'loftLibrary']
        ),
        connection(
          'upper-library-focus',
          'upper.loft_library_focus_pods.connection',
          'upper',
          ['loftLibrary', 'focusPods']
        ),
      ],
    },
  ],
};

function wall(
  id: string,
  source: string,
  floorId: string,
  run: WallDefinition['run'],
  rooms: string[],
  purpose: WallDefinition['purpose'] = 'room-boundary'
): WallDefinition {
  return {
    id,
    sourceId: sourceId(source),
    floorId,
    wallKind: 'wall',
    run,
    rooms,
    purpose,
  };
}

function connection(
  id: string,
  source: string,
  floorId: string,
  rooms: [string, string, ...string[]]
) {
  return {
    id,
    sourceId: sourceId(source),
    floorId,
    rooms,
    purpose: 'semantic adjacency only',
  };
}

function toSourcePart(id: string): string {
  return id.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function surface(
  floorId: string,
  roomId: string,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
) {
  return {
    id: `${floorId}-${roomId}-floor`,
    sourceId: sourceId(`${floorId}.${toSourcePart(roomId)}.floor_surface`),
    floorId,
    bounds,
    roomId,
  };
}

assertValidLevelDefinition(PORTFOLIO_LEVEL);
