import { getFloorTopElevation } from './floorElevations';
import type { SceneObjectDefinition } from './schema';
import { assertLevelSourceId } from './sourceIds';

const object = (
  id: string,
  kind: string,
  x: number,
  z: number,
  solid = true
): SceneObjectDefinition => ({
  id,
  sourceId: assertLevelSourceId(`basement.careerMuseum.${id}`),
  floorId: 'basement',
  roomId: 'careerMuseum',
  kind,
  position: { x, y: getFloorTopElevation('basement'), z },
  orientation: 0,
  purpose: solid ? 'museum-solid-display' : 'original-gallery-wall-art',
  colliderPolicy: solid
    ? {
        kind: 'solid',
        reason: 'Visible museum stand or furniture footprint blocks walking.',
      }
    : {
        kind: 'decorativeNoCollision',
        reason:
          'Wall-mounted artwork is above circulation and does not block walking.',
      },
});

/** Plan X/Z are level units; elevation and dimensions are world units. */
export const CAREER_MUSEUM_OBJECTS: SceneObjectDefinition[] = [
  object('career-southern-mississippi', 'career-exhibit', -9, -9),
  object('career-naval-research', 'career-exhibit', -9, 1),
  object('career-youtube', 'career-exhibit', 10, 1),
  object('career-muon-space', 'career-exhibit', 10, -10),
  object('museum-central-table', 'museum.table', 0, 1),
  object('museum-west-bench', 'museum.bench', -3, 4),
  object('museum-east-bench', 'museum.bench', 3, 4),
  object('museum-west-planter', 'museum.planter', -13.25, 5),
  object('museum-east-planter', 'museum.planter', 13.25, 5),
  object('museum-west-art', 'museum.wall-art', -9, -17.8, false),
  object('museum-east-art', 'museum.wall-art', 10, -17.8, false),
];

export const CAREER_EXHIBIT_FOOTPRINT = { width: 4.8, depth: 3 } as const;
export const CAREER_INTERACTION_ANCHOR = {
  height: 0.75,
  frontOffset: 2.5,
  radius: 3.6,
} as const;
