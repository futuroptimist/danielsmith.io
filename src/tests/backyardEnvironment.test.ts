import { Group } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBackyardEnvironment } from '../environments/backyard';

const BACKYARD_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: 8,
  maxZ: 16,
};

describe('createBackyardEnvironment', () => {
  let originalRandom: () => number;
  let originalGetContext: HTMLCanvasElement['getContext'];

  beforeEach(() => {
    originalRandom = Math.random;
    Math.random = () => 0.42;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockImplementation((type) => {
        if (type === '2d') {
          return {
            clearRect: vi.fn(),
            createLinearGradient: vi
              .fn()
              .mockReturnValue({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            fillText: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            quadraticCurveTo: vi.fn(),
            font: '',
            textAlign: 'left',
            textBaseline: 'alphabetic',
            shadowColor: '',
            shadowBlur: 0,
            globalAlpha: 1,
            fillStyle: '',
          } as unknown as CanvasRenderingContext2D;
        }
        return null;
      });
  });

  afterEach(() => {
    Math.random = originalRandom;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('adds the model rocket installation and collider to the backyard', () => {
    const { group, colliders } = createBackyardEnvironment(BACKYARD_BOUNDS);
    const rocket = group.getObjectByName('BackyardModelRocket');
    expect(rocket).toBeInstanceOf(Group);

    const rocketPosition = (rocket as Group).position.clone();
    const matchingCollider = colliders.find(
      (collider) =>
        rocketPosition.x >= collider.minX &&
        rocketPosition.x <= collider.maxX &&
        rocketPosition.z >= collider.minZ &&
        rocketPosition.z <= collider.maxZ
    );

    expect(matchingCollider).toBeDefined();
    expect(matchingCollider?.maxX).toBeGreaterThan(matchingCollider!.minX);
    expect(matchingCollider?.maxZ).toBeGreaterThan(matchingCollider!.minZ);
  });
});
