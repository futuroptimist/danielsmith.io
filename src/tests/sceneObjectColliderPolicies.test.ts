import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PORTFOLIO_LEVEL } from '../scene/level/portfolioLevel';
import {
  createSceneObjectDefinitionsById,
  registerSceneObjectColliders,
} from '../scene/level/sceneObjects';
import { createAxelNavigator } from '../scene/structures/axelNavigator';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';
import { createJobbotTerminal } from '../scene/structures/jobbotTerminal';
import { createPrReaperConsole } from '../scene/structures/prReaperConsole';
import { createWoveLoom } from '../scene/structures/woveLoom';

const createCanvasContext = (): CanvasRenderingContext2D => {
  const gradient = { addColorStop: vi.fn() };
  return {
    canvas: document.createElement('canvas'),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineWidth: 0,
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    createLinearGradient: vi.fn(() => gradient),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
};

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
    createCanvasContext()
  );
});

const definitionsById = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);

const migratedFactories = [
  {
    id: 'flywheel-studio-flywheel',
    expectedColliderCount: 2,
    build: () =>
      createFlywheelShowpiece({
        centerX: 5.5,
        centerZ: -2,
        roomBounds: { minX: 0, maxX: 16, minZ: -16, maxZ: 16 },
      }),
  },
  {
    id: 'jobbot-studio-terminal',
    expectedColliderCount: 1,
    build: () =>
      createJobbotTerminal({
        position: { x: 12, y: 0, z: 2 },
        orientationRadians: -Math.PI / 2,
      }),
  },
  {
    id: 'axel-studio-tracker',
    expectedColliderCount: 2,
    build: () =>
      createAxelNavigator({
        position: { x: 10, y: 0, z: -2 },
        orientationRadians: Math.PI,
      }),
  },
  {
    id: 'wove-kitchen-loom',
    expectedColliderCount: 2,
    build: () =>
      createWoveLoom({
        position: { x: -7.5, y: 0, z: 2.5 },
        orientationRadians: Math.PI * 0.45,
      }),
  },
  {
    id: 'pr-reaper-backyard-console',
    expectedColliderCount: 2,
    build: () =>
      createPrReaperConsole({
        position: { x: 0, y: 0, z: 10 },
        orientationRadians: Math.PI * 0.35,
      }),
  },
] as const;

describe('migrated scene object collider policies', () => {
  it('keeps each migrated visible showpiece on a custom factory-collider policy', () => {
    for (const { id } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition?.colliderPolicy).toEqual({
        kind: 'custom',
        purpose: 'factory-colliders',
      });
      expect(definition?.sourceId).toMatch(/\.scene_object$/);
    }
  });

  it('registers every existing factory collider with scene object source metadata', () => {
    for (const { id, expectedColliderCount, build } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition).toBeDefined();
      const factoryColliders = build().colliders;
      const registered = [];
      const metadata = new Map();

      registerSceneObjectColliders(
        factoryColliders,
        definition!,
        registered,
        metadata
      );

      expect(factoryColliders, id).toHaveLength(expectedColliderCount);
      expect(registered, id).toHaveLength(expectedColliderCount);
      for (const collider of factoryColliders) {
        expect(metadata.get(collider), id).toEqual({
          sourceId: definition!.sourceId,
          sourceType: 'sceneObject',
          purpose: 'factory-colliders',
        });
      }
    }
  });
});
