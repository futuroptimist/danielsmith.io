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

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') return null;
      const gradient = { addColorStop: vi.fn() };
      return {
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        fillRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        scale: vi.fn(),
        createLinearGradient: vi.fn(() => gradient),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        textAlign: 'left',
        textBaseline: 'alphabetic',
        font: '',
        globalAlpha: 1,
        shadowBlur: 0,
        shadowColor: '',
        canvas: this,
      } as Partial<CanvasRenderingContext2D>;
    },
  });
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

  it('keeps migrated showpiece factory collider counts source-backed', () => {
    const definitions = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);
    const builds = [
      {
        id: 'flywheel-studio-flywheel',
        build: createFlywheelShowpiece({
          centerX: 5.5,
          centerZ: -2,
          roomBounds: { minX: -2, maxX: 16, minZ: -4, maxZ: 8 },
        }),
      },
      {
        id: 'jobbot-studio-terminal',
        build: createJobbotTerminal({
          position: { x: 12, y: 0, z: 2 },
          orientationRadians: -Math.PI / 2,
        }),
      },
      {
        id: 'axel-studio-tracker',
        build: createAxelNavigator({
          position: { x: 10, y: 0, z: -2 },
          orientationRadians: Math.PI,
        }),
      },
      {
        id: 'wove-kitchen-loom',
        build: createWoveLoom({
          position: { x: -7.5, y: 0, z: 2.5 },
          orientationRadians: Math.PI * 0.45,
        }),
      },
      {
        id: 'pr-reaper-backyard-console',
        build: createPrReaperConsole({
          position: { x: 0, y: 0, z: 10 },
          orientationRadians: Math.PI * 0.35,
        }),
      },
    ];

    for (const { id, build } of builds) {
      const definition = definitions.get(id);
      expect(definition).toBeDefined();
      expect(build.colliders.length).toBeGreaterThan(0);

      const registered: RectCollider[] = [];
      const metadata = new Map();
      registerSceneObjectColliders(
        build.colliders,
        definition!,
        registered,
        metadata
      );

      expect(registered).toHaveLength(build.colliders.length);
      for (const collider of build.colliders) {
        expect(metadata.get(collider)).toMatchObject({
          sourceId: definition!.sourceId,
          sourceType: 'sceneObject',
        });
      }
    }
  });
});
