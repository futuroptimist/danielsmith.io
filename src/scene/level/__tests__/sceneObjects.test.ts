import { Group } from 'three';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_LEVEL } from '../portfolioLevel';
import {
  applySceneObjectSourceMetadata,
  createSceneObjectDefinitionLookup,
  getSceneObjectSourceMetadata,
} from '../sceneObjects';

const migratedObjectIds = [
  'flywheel-studio-showpiece',
  'jobbot-studio-terminal',
  'axel-studio-navigator',
  'wove-kitchen-loom',
  'pr-reaper-backyard-console',
];

describe('declarative scene object source data', () => {
  const ground = PORTFOLIO_LEVEL.floors.find((floor) => floor.id === 'ground');
  const lookup = createSceneObjectDefinitionLookup(ground?.sceneObjects ?? []);

  it('defines migrated showpieces with unique source IDs and explicit collider policies', () => {
    const objects = migratedObjectIds.map((id) => lookup.require(id));

    expect(new Set(objects.map((object) => object.sourceId)).size).toBe(
      objects.length
    );
    expect(objects.every((object) => object.colliderPolicy)).toBe(true);
    expect(objects.map((object) => object.colliderPolicy?.kind)).toEqual([
      'custom',
      'solid',
      'solid',
      'solid',
      'solid',
    ]);
    expect(objects.every((object) => object.purpose?.trim())).toBe(true);
  });

  it('applies scene object source metadata to generated object userData', () => {
    const object = lookup.require('flywheel-studio-showpiece');
    const group = new Group();

    applySceneObjectSourceMetadata(group, getSceneObjectSourceMetadata(object));

    expect(group.userData.levelSourceId).toBe(object.sourceId);
    expect(group.userData.levelSource).toMatchObject({
      sourceId: object.sourceId,
      sourceType: 'sceneObject',
      purpose: object.purpose,
    });
  });
});
