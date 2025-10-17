import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLivingRoomMediaWall } from '../scene/structures/mediaWall';

describe('createLivingRoomMediaWall', () => {
  type CapturingContext = CanvasRenderingContext2D & {
    fillTextCalls: Array<{ text: string; x: number; y: number }>;
  };

  const contexts: CapturingContext[] = [];

  const createMockContext = (): CapturingContext => {
    const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
    return {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      quadraticCurveTo: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      font: '',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      fillText: vi.fn((text: string, x: number, y: number) => {
        fillTextCalls.push({ text, x, y });
      }),
      fillTextCalls,
    } as unknown as CapturingContext;
  };

  beforeAll(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(type: string) {
        if (type !== '2d') {
          return null;
        }
        const context = createMockContext();
        contexts.push(context);
        return context;
      },
    });
  });

  beforeEach(() => {
    contexts.length = 0;
  });

  it('includes a TV screen with YouTube text and exposes POI bindings', () => {
    const bounds = { minX: -16, maxX: 16, minZ: -16, maxZ: -4 };
    const build = createLivingRoomMediaWall(bounds);

    const screen = build.group.getObjectByName('LivingRoomMediaWallScreen');
    expect(screen).toBeTruthy();

    const badge = build.group.getObjectByName('LivingRoomMediaWallBadge');
    expect(badge).toBeTruthy();

    expect(build.poiBindings.futuroptimistTv.screen).toBeTruthy();
    expect(build.poiBindings.futuroptimistTv.glow).toBeTruthy();

    const screenContext = contexts[0];
    expect(screenContext).toBeDefined();
    const initialTexts = screenContext.fillTextCalls.map((call) => call.text);
    expect(initialTexts).toContain('Futuroptimist');
    expect(initialTexts).toContain('GitHub stars');

    const glowMaterial = build.poiBindings.futuroptimistTv.glowMaterial;
    expect(glowMaterial.opacity).toBeCloseTo(0.18, 3);

    build.controller.setStarCount(1536);
    const updatedTexts = screenContext.fillTextCalls.map((call) => call.text);
    expect(updatedTexts).toContain('1.5K');

    build.controller.update({ elapsed: 1, delta: 0.5, emphasis: 1 });
    expect(glowMaterial.opacity).toBeGreaterThan(0.18);

    expect(() => build.controller.dispose()).not.toThrow();
  });
});
