import { getFloorTopElevation } from './floorElevations';
import type { SceneObjectDefinition } from './schema';
import { assertLevelSourceId } from './sourceIds';

/** Corner reservation in plan units. Keep aquarium placement outside this rectangle. */
export const WORKSHOP_RESERVATION = {
  minX: -13.5,
  maxX: -8,
  minZ: -15.7,
  maxZ: -12.4,
} as const;

export const WORKSHOP_DESCRIPTION =
  'Woodworking corner: two workbenches, a stationary band saw and drill press, ' +
  'a birdhouse awaiting its roof, a bookshelf with missing shelves, a clamped picture frame, ' +
  'a slatted planter under assembly and a stool awaiting its top. Hand tools hang above the benches.';

export const WORKSHOP_STATIONS = [
  {
    id: 'assembly-bench',
    x: -11.9,
    z: -14.5,
    width: 4.8,
    depth: 2.2,
    height: 3.8,
  },
  {
    id: 'project-bench',
    x: -8.9,
    z: -14.5,
    width: 2.6,
    depth: 2.2,
    height: 3.8,
  },
  { id: 'band-saw', x: -12.7, z: -12.95, width: 1.5, depth: 1.5, height: 3.6 },
  {
    id: 'drill-press',
    x: -11.3,
    z: -12.95,
    width: 1.5,
    depth: 1.5,
    height: 3.6,
  },
  { id: 'bookshelf', x: -9.15, z: -12.95, width: 2.8, depth: 1.4, height: 3.2 },
] as const;

export const WORKSHOP_OBJECTS: SceneObjectDefinition[] = WORKSHOP_STATIONS.map(
  (station) => ({
    id: `woodworking-${station.id}`,
    sourceId: assertLevelSourceId(
      `basement.careerMuseum.woodworking.${station.id}`
    ),
    floorId: 'basement',
    roomId: 'careerMuseum',
    kind: 'woodworking.station',
    position: {
      x: station.x,
      y: getFloorTopElevation('basement'),
      z: station.z,
    },
    orientation: 0,
    purpose: 'static-woodworking-projects',
    colliderPolicy: {
      kind: 'solid',
      reason: 'Station footprint contains static tools and projects.',
    },
  })
);
