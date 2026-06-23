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

let getContextSpy: { mockRestore: () => void };

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
  position: { x: number; y?: number; z: number };
  orientation: number;
};

type MigratedFactory = {
  id: string;
  placement: MigratedFactoryPlacement;
  build: (placement: MigratedFactoryPlacement) => {
    colliders: readonly RectCollider[];
  };
};

const migratedFactories = [
  {
    id: 'flywheel-studio-flywheel',
    placement: { position: { x: 9.035, y: 0.75, z: 0.745 }, orientation: 0 },
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
    placement: {
      position: { x: -8.38, y: 4.91, z: -14.4 },
      orientation: -Math.PI / 2,
    },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createJobbotTerminal({
        position: { x: position.x, y: position.y ?? 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'axel-studio-tracker',
    placement: {
      position: { x: -6.21, y: 4.91, z: -9.59 },
      orientation: Math.PI,
    },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createAxelNavigator({
        position: { x: position.x, y: position.y ?? 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'wove-kitchen-loom',
    placement: {
      position: { x: 8.24, y: 4.91, z: 2.135 },
      orientation: Math.PI * 0.45,
    },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createWoveLoom({
        position: { x: position.x, y: position.y ?? 0, z: position.z },
        orientationRadians: orientation,
      }),
  },
  {
    id: 'pr-reaper-backyard-console',
    placement: {
      position: { x: 1.5, y: 0.75, z: 0.525 },
      orientation: Math.PI * 0.35,
    },
    build: ({ position, orientation }: MigratedFactoryPlacement) =>
      createPrReaperConsole({
        position: { x: position.x, y: position.y ?? 0, z: position.z },
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
    for (const { id, build, placement } of migratedFactories) {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();
      const factoryColliders = build(placement).colliders;
      const registered: RectCollider[] = [];
      const metadata = new Map<RectCollider, unknown>();

      registerSceneObjectColliders(
        factoryColliders,
        definition!,
        registered,
        metadata
      );

      expect(factoryColliders.length, id).toBeGreaterThan(0);
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

  it('keeps migrated placements unique in the declarative scene object inventory', () => {
    // This inventory-level uniqueness check replaces the removed implementation-wiring
    // grep; runtime duplicate-assembly coverage belongs in a public/helper contract.
    const placements = migratedFactories.map(({ id }) => {
      const definition = definitionsById.get(id);
      expect(definition, id).toBeDefined();

      return `${definition!.position.x},${definition!.position.y ?? 0},${definition!.position.z},${definition!.orientation}`;
    });

    expect(new Set(placements).size).toBe(placements.length);
  });
});
