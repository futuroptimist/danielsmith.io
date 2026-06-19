import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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
import type { RectCollider } from '../systems/collision';

const createCanvasContext = (
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D => {
  const gradient = { addColorStop: vi.fn() };
  return {
    canvas,
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

let getContextSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(function (this: HTMLCanvasElement, contextId: string) {
      if (contextId !== '2d') {
        return null;
      }

      return createCanvasContext(this);
    });
});

afterAll(() => {
  getContextSpy.mockRestore();
});

const definitionsById = createSceneObjectDefinitionsById(PORTFOLIO_LEVEL);

type MigratedFactoryPlacement = {
  position: { x: number; z: number };
  orientation: number;
};

type MigratedFactory = {
  id: string;
  factoryName: string;
  expectedColliderCount: number;
  placement: MigratedFactoryPlacement;
  build: (placement: MigratedFactoryPlacement) => {
    colliders: readonly RectCollider[];
  };
};

const mainSource = readFileSync('src/main.ts', 'utf8');

const migratedFactories = [
  {
    id: 'flywheel-studio-flywheel',
    factoryName: 'createFlywheelShowpiece',
    expectedColliderCount: 2,
    placement: { position: { x: 5.5, z: -2 }, orientation: 0 },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createFlywheelShowpiece({
        centerX: position.x,
        centerZ: position.z,
        orientationRadians: orientation,
        roomBounds: { minX: 0, maxX: 16, minZ: -16, maxZ: 16 },
      }),
  },
  {
    id: 'jobbot-studio-terminal',
    factoryName: 'createJobbotTerminal',
    expectedColliderCount: 1,
    placement: { position: { x: 12, z: 2 }, orientation: -Math.PI / 2 },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createJobbotTerminal({
        position: { x: position.x, y: 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'axel-studio-tracker',
    factoryName: 'createAxelNavigator',
    expectedColliderCount: 2,
    placement: { position: { x: 10, z: -2 }, orientation: Math.PI },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createAxelNavigator({
        position: { x: position.x, y: 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'wove-kitchen-loom',
    factoryName: 'createWoveLoom',
    expectedColliderCount: 2,
    placement: { position: { x: -7.5, z: 2.5 }, orientation: Math.PI * 0.45 },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createWoveLoom({
        position: { x: position.x, y: 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'pr-reaper-backyard-console',
    factoryName: 'createPrReaperConsole',
    expectedColliderCount: 2,
    placement: { position: { x: 0, z: 10 }, orientation: Math.PI * 0.35 },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createPrReaperConsole({
        position: { x: position.x, y: 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
] satisfies readonly MigratedFactory[];

describe('migrated scene object collider policies', () => {
  it('keeps each migrated visible showpiece on a custom factory-collider policy', () => {
    for (const { id } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();
      expect(definition!.colliderPolicy).toEqual({
        kind: 'custom',
        purpose: 'factory-colliders',
      });
      expect(definition!.sourceId).toMatch(/\.scene_object$/);
    }
  });

  it('keeps factory args aligned with declarative placement data', () => {
    for (const { id, placement } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();
      expect(definition!.position, id).toEqual(placement.position);
      expect(definition!.orientation, id).toBe(placement.orientation);
    }
  });

  it('registers every existing factory collider with scene object source metadata', () => {
    for (const {
      id,
      build,
      expectedColliderCount,
      placement,
    } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();
      const factoryColliders = build(placement).colliders;
      const registered = [];
      const metadata = new Map();

      registerSceneObjectColliders(
        factoryColliders,
        definition!,
        registered,
        metadata
      );

      expect(factoryColliders, id).toHaveLength(expectedColliderCount);
      expect(registered, id).toHaveLength(factoryColliders.length);
      for (const collider of factoryColliders) {
        expect(metadata.get(collider), id).toEqual({
          sourceId: definition!.sourceId,
          sourceType: 'sceneObject',
          purpose: 'factory-colliders',
        });
      }
    }
  });

  it('keeps runtime assembly paths singular for migrated factory placements', () => {
    for (const { id, factoryName } of migratedFactories) {
      const factoryCalls =
        mainSource.match(new RegExp(`\\b${factoryName}\\(`, 'g')) ?? [];
      const sceneObjectLookups =
        mainSource.match(
          new RegExp(`getSceneObjectDefinition\\(\\n?\\s*['"]${id}['"]`, 'g')
        ) ?? [];

      expect(factoryCalls, factoryName).toHaveLength(1);
      expect(sceneObjectLookups, id).toHaveLength(1);
    }
  });

  it('keeps migrated placements unique in the declarative scene object inventory', () => {
    const placements = migratedFactories.map(({ id }) => {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();

      return `${definition!.position.x},${definition!.position.z},${definition!.orientation}`;
    });

    expect(new Set(placements).size).toBe(placements.length);
  });
});
