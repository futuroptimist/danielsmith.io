import { beforeAll, describe, expect, it } from 'vitest';

import {
  createVisitedBadge,
  updateVisitedBadge,
} from '../scene/poi/visitedBadge';

beforeAll(() => {
  const noop = () => {};
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(type: string) {
      if (type !== '2d') {
        return null;
      }
      return {
        clearRect: noop,
        beginPath: noop,
        arc: noop,
        closePath: noop,
        fill: noop,
        stroke: noop,
        moveTo: noop,
        lineTo: noop,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        lineCap: 'round',
        lineJoin: 'round',
      } as CanvasRenderingContext2D;
    },
  });
});

describe('createVisitedBadge', () => {
  it('builds a textured badge mesh positioned at the base height', () => {
    const badge = createVisitedBadge({ baseHeight: 3 });
    expect(badge.mesh.name).toBe('POI_VisitedBadge');
    expect(badge.mesh.position.y).toBe(3);
    expect(badge.material.transparent).toBe(true);
    expect(badge.material.opacity).toBe(0);
    expect(badge.mesh.visible).toBe(false);
    expect(badge.material.map).toBeDefined();
  });
});

describe('updateVisitedBadge', () => {
  it('reveals, lifts, and spins the badge as exhibits are discovered', () => {
    const badge = createVisitedBadge({
      baseHeight: 1.2,
      random: () => 0.75,
    });

    updateVisitedBadge(badge, {
      elapsedTime: 2.4,
      delta: 0.016,
      visitedEmphasis: 0.8,
      floatPhase: 0,
    });

    expect(badge.material.opacity).toBeGreaterThan(0.6);
    expect(badge.mesh.visible).toBe(true);
    expect(badge.mesh.position.y).toBeGreaterThan(1.2);
    expect(badge.mesh.scale.x).toBeGreaterThan(0.68);
    expect(badge.mesh.rotation.y).toBeCloseTo(0.75 * 0.016, 5);
  });

  it('clamps emphasis and hides the badge when emphasis is zero', () => {
    const badge = createVisitedBadge({ baseHeight: 2, random: () => 0.6 });
    badge.material.opacity = 0.5;
    badge.mesh.visible = true;

    updateVisitedBadge(badge, {
      elapsedTime: 0.5,
      delta: 0.02,
      visitedEmphasis: 0,
      floatPhase: Math.PI / 4,
    });

    expect(badge.material.opacity).toBe(0);
    expect(badge.mesh.visible).toBe(false);
    expect(badge.mesh.position.y).toBeCloseTo(2, 5);

    updateVisitedBadge(badge, {
      elapsedTime: 0.5,
      delta: 0,
      visitedEmphasis: 2.5,
      floatPhase: Math.PI / 4,
    });

    expect(badge.material.opacity).toBeCloseTo(0.88, 2);
    expect(badge.mesh.scale.x).toBeLessThanOrEqual(0.95);
  });
});
