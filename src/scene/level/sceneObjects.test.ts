import { Group, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import type { RectCollider } from '../../systems/collision';

import { PORTFOLIO_LEVEL } from './portfolioLevel';
import {
  applySceneObjectSourceMetadata,
  createSceneObjectDefinitionsById,
  registerSceneObjectColliders,
} from './sceneObjects';

describe('scene object metadata helpers', () => {
  it('applies scene object source metadata to the root group and descendants', () => {
    const definition = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL).get(
      'flywheel-studio-flywheel'
    );
    expect(definition).toBeDefined();

    const group = new Group();
    const child = new Mesh();
    const grandchild = new Mesh();
    child.add(grandchild);
    group.add(child);

    applySceneObjectSourceMetadata(group, definition!);

    for (const object of [group, child, grandchild]) {
      expect(object.userData.levelSourceId).toBe(definition!.sourceId);
      expect(object.userData.levelSource).toEqual({
        sourceId: definition!.sourceId,
        sourceType: 'sceneObject',
        purpose: definition!.purpose,
      });
    }
  });

  it('registers all factory-returned colliders with scene object source metadata', () => {
    const definition = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL).get(
      'flywheel-studio-flywheel'
    );
    expect(definition).toBeDefined();
    const factoryColliders: RectCollider[] = [
      { minX: 0, maxX: 1, minZ: 2, maxZ: 3 },
      { minX: 4, maxX: 5, minZ: 6, maxZ: 7 },
    ];
    const registered: RectCollider[] = [];
    const metadata = new Map();

    registerSceneObjectColliders(
      factoryColliders,
      definition!,
      registered,
      metadata
    );

    expect(registered).toHaveLength(factoryColliders.length);
    expect(registered).toEqual(factoryColliders);
    for (const collider of factoryColliders) {
      expect(metadata.get(collider)).toEqual({
        sourceId: definition!.sourceId,
        sourceType: 'sceneObject',
        purpose: 'factory-colliders',
      });
    }
  });
});
