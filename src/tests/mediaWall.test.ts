import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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

  afterEach(() => {
    delete document.documentElement.dataset.accessibilityPulseScale;
    delete document.documentElement.dataset.accessibilityFlickerScale;
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
    expect(build.poiBindings.futuroptimistTv.halo).toBeTruthy();
    expect(build.poiBindings.futuroptimistTv.shelfLight).toBeTruthy();
    expect(build.poiBindings.futuroptimistTv.clearance).toBeTruthy();

    const shelfLight = build.group.getObjectByName(
      'LivingRoomMediaWallShelfLight'
    );
    expect(shelfLight).toBeTruthy();

    const clearance = build.group.getObjectByName(
      'LivingRoomMediaWallClearance'
    );
    expect(clearance).toBeTruthy();

    const screenContext = contexts[0];
    expect(screenContext).toBeDefined();
    const initialTexts = screenContext.fillTextCalls.map((call) => call.text);
    expect(initialTexts).toContain('Futuroptimist');
    expect(initialTexts).toContain('GitHub stars');

    const glowMaterial = build.poiBindings.futuroptimistTv.glowMaterial;
    expect(glowMaterial.opacity).toBeCloseTo(0.18, 3);
    const haloMaterial = build.poiBindings.futuroptimistTv.haloMaterial;
    const shelfLightMaterial =
      build.poiBindings.futuroptimistTv.shelfLightMaterial;
    const baseHaloIntensity = haloMaterial.emissiveIntensity;
    const baseShelfIntensity = shelfLightMaterial.emissiveIntensity;
    const clearanceMaterial =
      build.poiBindings.futuroptimistTv.clearanceMaterial;
    const baseClearanceOpacity = clearanceMaterial.opacity;
    const baseClearanceColor = clearanceMaterial.color.clone();

    build.controller.setStarCount(1536);
    const updatedTexts = screenContext.fillTextCalls.map((call) => call.text);
    expect(updatedTexts).toContain('1.5K');

    document.documentElement.dataset.accessibilityPulseScale = '0.9';
    document.documentElement.dataset.accessibilityFlickerScale = '0.7';

    let elapsedTime = 1;
    for (let step = 0; step < 6; step += 1) {
      build.controller.update({
        elapsed: elapsedTime,
        delta: 0.5,
        emphasis: 1,
      });
      elapsedTime += 0.5;
    }
    expect(glowMaterial.opacity).toBeGreaterThan(0.18);
    expect(haloMaterial.emissiveIntensity).toBeGreaterThan(baseHaloIntensity);
    expect(shelfLightMaterial.emissiveIntensity).toBeGreaterThan(
      baseShelfIntensity
    );
    expect(clearanceMaterial.opacity).toBeGreaterThan(baseClearanceOpacity);
    expect(clearanceMaterial.color.equals(baseClearanceColor)).toBe(false);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    document.documentElement.dataset.accessibilityFlickerScale = '0';

    let elapsed = elapsedTime;
    for (let i = 0; i < 60; i += 1) {
      build.controller.update({ elapsed, delta: 1 / 60, emphasis: 0 });
      elapsed += 1 / 60;
    }

    expect(
      Math.abs(haloMaterial.emissiveIntensity - baseHaloIntensity)
    ).toBeLessThan(0.1);
    expect(
      Math.abs(shelfLightMaterial.emissiveIntensity - baseShelfIntensity)
    ).toBeLessThan(0.1);
    expect(
      Math.abs(clearanceMaterial.opacity - baseClearanceOpacity)
    ).toBeLessThan(0.05);
    const clearanceColorDelta =
      Math.abs(clearanceMaterial.color.r - baseClearanceColor.r) +
      Math.abs(clearanceMaterial.color.g - baseClearanceColor.g) +
      Math.abs(clearanceMaterial.color.b - baseClearanceColor.b);
    expect(clearanceColorDelta).toBeLessThan(0.12);

    expect(() => build.controller.dispose()).not.toThrow();
  });
});
