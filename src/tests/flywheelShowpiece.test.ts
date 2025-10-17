import { Group, Mesh, MeshBasicMaterial } from 'three';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFlywheelShowpiece } from '../scene/structures/flywheel';

type CapturingContext = CanvasRenderingContext2D & {
  fillTextCalls: string[];
};

const contexts: CapturingContext[] = [];

const createMockContext = (canvas: HTMLCanvasElement): CapturingContext => {
  const fillTextCalls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const context = {
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
    createLinearGradient: vi.fn(() => gradient),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
    fillText: vi.fn((text: string) => {
      fillTextCalls.push(text);
    }),
    fillTextCalls,
  } as Partial<CapturingContext>;
  Object.defineProperty(context, 'canvas', { value: canvas });
  return context as CapturingContext;
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') {
        return null;
      }
      const context = createMockContext(this);
      contexts.push(context);
      return context;
    },
  });
});

beforeEach(() => {
  contexts.length = 0;
});

describe('createFlywheelShowpiece', () => {
  const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

  it('builds kinetic hub geometry with docs callout signage', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    expect(build.group.name).toBe('FlywheelShowpiece');

    const rotorGroup = build.group.getObjectByName('FlywheelRotorGroup');
    expect(rotorGroup).toBeInstanceOf(Group);

    const panel = build.group.getObjectByName('FlywheelInfoPanel');
    expect(panel).toBeInstanceOf(Mesh);

    const callout = build.group.getObjectByName('FlywheelDocsCallout');
    expect(callout).toBeInstanceOf(Mesh);

    const capturedText = contexts.flatMap((ctx) => ctx.fillTextCalls);
    expect(capturedText).toContain('Flywheel Automation');
    expect(capturedText).toContain('Docs');
    expect(capturedText).toContain('flywheel.futuroptimist.dev');
  });

  it('reveals docs callout and accelerates the rotor under emphasis', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const callout = build.group.getObjectByName('FlywheelDocsCallout') as Mesh;
    const calloutMaterial = callout.material as MeshBasicMaterial;
    const rotorGroup = build.group.getObjectByName(
      'FlywheelRotorGroup'
    ) as Group;
    const calloutGlow = build.group.getObjectByName(
      'FlywheelDocsCalloutGlow'
    ) as Mesh;
    const calloutGlowMaterial = calloutGlow.material as MeshBasicMaterial;

    const initialRotation = rotorGroup.rotation.y;
    expect(calloutMaterial.opacity).toBeCloseTo(0);
    expect(callout.visible).toBe(false);

    build.update({ elapsed: 0.5, delta: 0.5, emphasis: 0 });
    expect(calloutMaterial.opacity).toBeLessThan(0.05);
    expect(callout.visible).toBe(false);

    build.update({ elapsed: 1, delta: 0.5, emphasis: 1 });
    build.update({ elapsed: 1.5, delta: 0.5, emphasis: 1 });

    expect(rotorGroup.rotation.y).toBeGreaterThan(initialRotation);
    expect(calloutMaterial.opacity).toBeGreaterThan(0.3);
    expect(calloutGlowMaterial.opacity).toBeGreaterThan(0.05);
    expect(callout.visible).toBe(true);
  });

  it('keeps the docs callout hidden when emphasis stays at zero', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const callout = build.group.getObjectByName('FlywheelDocsCallout') as Mesh;
    const calloutMaterial = callout.material as MeshBasicMaterial;

    for (let i = 0; i < 5; i += 1) {
      build.update({ elapsed: i * 0.5, delta: 0.5, emphasis: 0 });
    }

    expect(calloutMaterial.opacity).toBe(0);
    expect(callout.visible).toBe(false);
  });
});
