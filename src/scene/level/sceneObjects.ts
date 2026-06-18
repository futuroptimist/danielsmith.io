import type { Object3D } from 'three';

import type { RectCollider } from '../../systems/collision';

import type { Bounds2D, SceneObjectDefinition } from './schema';
import type { LevelSourceMetadata, LevelSourceId } from './sourceIds';

export type SceneObjectColliderPolicyKind =
  | 'solid'
  | 'decorativeNoCollision'
  | 'interactionOnly'
  | 'custom';

export interface SceneObjectLevelSourceMetadata {
  sourceId: LevelSourceId;
  sourceType: 'sceneObject';
  purpose?: string;
}

export interface SourceBackedSceneObjectOptions {
  levelSource?: SceneObjectLevelSourceMetadata;
}

export interface SceneObjectDefinitionLookup {
  byId: ReadonlyMap<string, SceneObjectDefinition>;
  require(id: string): SceneObjectDefinition;
}

export const createSceneObjectDefinitionLookup = (
  sceneObjects: readonly SceneObjectDefinition[]
): SceneObjectDefinitionLookup => {
  const byId = new Map(sceneObjects.map((object) => [object.id, object]));

  return {
    byId,
    require(id) {
      const object = byId.get(id);
      if (!object) throw new Error(`Missing scene object definition "${id}".`);
      return object;
    },
  };
};

export const getSceneObjectSourceMetadata = (
  object: SceneObjectDefinition
): SceneObjectLevelSourceMetadata => ({
  sourceId: object.sourceId,
  sourceType: 'sceneObject',
  ...(object.purpose ? { purpose: object.purpose } : {}),
});

export const applySceneObjectSourceMetadata = (
  object: Object3D,
  metadata: SceneObjectLevelSourceMetadata
): void => {
  object.userData.levelSourceId = metadata.sourceId;
  object.userData.levelSource = {
    sourceId: metadata.sourceId,
    sourceType: metadata.sourceType,
    ...(metadata.purpose ? { purpose: metadata.purpose } : {}),
  } satisfies LevelSourceMetadata;
};

export const registerSceneObjectColliderMetadata = (
  colliders: readonly RectCollider[],
  metadata: SceneObjectLevelSourceMetadata,
  register: (
    collider: RectCollider,
    metadata: SceneObjectLevelSourceMetadata
  ) => void
): void => {
  colliders.forEach((collider) => register(collider, metadata));
};

export const boundsToRectCollider = (bounds: Bounds2D): RectCollider => ({
  ...bounds,
});
