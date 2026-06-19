import type { Object3D } from 'three';

import type { RectCollider } from '../../systems/collision';

import type { LevelDefinition, SceneObjectDefinition } from './schema';

export type SceneObjectColliderSourceMetadata = {
  sourceId: SceneObjectDefinition['sourceId'];
  sourceType: 'sceneObject';
  purpose?: string;
};

export function createSceneObjectDefinitionsById(
  level: LevelDefinition
): Map<string, SceneObjectDefinition> {
  const definitionsById = new Map<string, SceneObjectDefinition>();
  for (const floor of level.floors) {
    for (const object of floor.sceneObjects ?? []) {
      const existing = definitionsById.get(object.id);
      if (existing) {
        throw new Error(
          `Duplicate scene object id "${object.id}" used by source IDs ` +
            `"${existing.sourceId}" and "${object.sourceId}".`
        );
      }
      definitionsById.set(object.id, object);
    }
  }
  return definitionsById;
}

export function getSceneObjectSourcePurpose(
  definition: SceneObjectDefinition
): string | undefined {
  return definition.purpose ?? definition.colliderPolicy?.kind;
}

export function getSceneObjectColliderSourcePurpose(
  definition: SceneObjectDefinition
): string | undefined {
  return definition.colliderPolicy?.kind === 'custom'
    ? definition.colliderPolicy.purpose
    : definition.colliderPolicy?.kind;
}

export function applySceneObjectSourceMetadata(
  object: Object3D,
  definition: SceneObjectDefinition
): void {
  object.traverse((node) => {
    node.userData.levelSourceId = definition.sourceId;
    node.userData.levelSource = {
      sourceId: definition.sourceId,
      sourceType: 'sceneObject',
      purpose: getSceneObjectSourcePurpose(definition),
    };
  });
}

type SceneObjectColliderMetadataSink = {
  set(
    collider: RectCollider,
    metadata: SceneObjectColliderSourceMetadata
  ): unknown;
};

export function registerSceneObjectColliders(
  colliders: readonly RectCollider[],
  definition: SceneObjectDefinition,
  target: RectCollider[],
  colliderSourceMetadata: SceneObjectColliderMetadataSink
): void {
  colliders.forEach((collider) => {
    target.push(collider);
    colliderSourceMetadata.set(collider, {
      sourceId: definition.sourceId,
      sourceType: 'sceneObject',
      purpose: getSceneObjectColliderSourcePurpose(definition),
    });
  });
}
