import { Group, Mesh } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { RectCollider } from '../../systems/collision';
import { createAxelNavigator } from '../structures/axelNavigator';
import { createFlywheelShowpiece } from '../structures/flywheel';
import { createJobbotTerminal } from '../structures/jobbotTerminal';
import { createPrReaperConsole } from '../structures/prReaperConsole';
import { createWoveLoom } from '../structures/woveLoom';

import { PORTFOLIO_LEVEL } from './portfolioLevel';
import {
  applySceneObjectSourceMetadata,
  createSceneObjectDefinitionsById,
  registerSceneObjectColliders,
} from './sceneObjects';

const createCanvasContext = (canvas: HTMLCanvasElement) => {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
  } as Partial<CanvasRenderingContext2D>;
  Object.defineProperty(context, 'canvas', { value: canvas });
  return context as CanvasRenderingContext2D;
};

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement, type: string) {
      return type === '2d' ? createCanvasContext(this) : null;
    }
  );
});

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

  it('keeps migrated showpiece factory colliders source-backed without count changes', () => {
    const definitions = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);
    const showpieces = [
      {
        id: 'flywheel-studio-flywheel',
        build: createFlywheelShowpiece({
          centerX: 5.5,
          centerZ: -2,
          roomBounds: { minX: 3, maxX: 14, minZ: -6, maxZ: 4 },
        }),
        colliderCount: 2,
      },
      {
        id: 'jobbot-studio-terminal',
        build: createJobbotTerminal({ position: { x: 12, z: 2 } }),
        colliderCount: 1,
      },
      {
        id: 'axel-studio-tracker',
        build: createAxelNavigator({ position: { x: 10, z: -2 } }),
        colliderCount: 2,
      },
      {
        id: 'wove-kitchen-loom',
        build: createWoveLoom({ position: { x: -7.5, z: 2.5 } }),
        colliderCount: 2,
      },
      {
        id: 'pr-reaper-backyard-console',
        build: createPrReaperConsole({ position: { x: 0, z: 10 } }),
        colliderCount: 2,
      },
    ] as const;

    for (const { id, build, colliderCount } of showpieces) {
      const definition = definitions.get(id);
      expect(definition).toBeDefined();
      expect(build.colliders).toHaveLength(colliderCount);

      const registered: RectCollider[] = [];
      const metadata = new Map<RectCollider, unknown>();

      registerSceneObjectColliders(
        build.colliders,
        definition!,
        registered,
        metadata
      );

      expect(registered).toEqual(build.colliders);
      expect([...metadata.values()]).toEqual(
        Array.from({ length: colliderCount }, () => ({
          sourceId: definition!.sourceId,
          sourceType: 'sceneObject',
          purpose: 'factory-colliders',
        }))
      );
    }
  });
});
