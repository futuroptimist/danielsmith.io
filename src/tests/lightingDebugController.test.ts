import { describe, expect, it } from 'vitest';

import { createLightingDebugController } from '../scene/lighting/debugControls';

describe('lighting debug controller', () => {
  const createController = () => {
    const renderer = { toneMappingExposure: 1.1 };
    const ambientLight = { intensity: 0.38 };
    const hemisphericLight = { intensity: 0.22 };
    const directionalLight = { intensity: 0.64 };
    const bloomPass = { enabled: true };
    const ledGroup = { visible: true };
    const ledFillLights = { visible: true };

    const controller = createLightingDebugController({
      renderer,
      ambientLight,
      hemisphericLight,
      directionalLight,
      bloomPass: bloomPass as never,
      ledGroup: ledGroup as never,
      ledFillLights: ledFillLights as never,
      debug: {
        exposure: 0.9,
        ambientIntensity: 0.6,
        hemisphericIntensity: 0.4,
        directionalIntensity: 0.35,
        ledVisible: false,
        bloomEnabled: false,
      },
    });

    return {
      renderer,
      ambientLight,
      hemisphericLight,
      directionalLight,
      bloomPass,
      ledGroup,
      ledFillLights,
      controller,
    };
  };

  it('captures baseline cinematic state on creation', () => {
    const context = createController();
    expect(context.controller.getMode()).toBe('cinematic');
    context.controller.setMode('cinematic');
    expect(context.renderer.toneMappingExposure).toBeCloseTo(1.1);
    expect(context.ambientLight.intensity).toBeCloseTo(0.38);
    expect(context.hemisphericLight.intensity).toBeCloseTo(0.22);
    expect(context.directionalLight.intensity).toBeCloseTo(0.64);
    expect(context.ledGroup.visible).toBe(true);
    expect(context.ledFillLights.visible).toBe(true);
    expect(context.bloomPass.enabled).toBe(true);
  });

  it('applies debug overrides when toggled', () => {
    const context = createController();
    const mode = context.controller.toggle();
    expect(mode).toBe('debug');
    expect(context.renderer.toneMappingExposure).toBeCloseTo(0.9);
    expect(context.ambientLight.intensity).toBeCloseTo(0.6);
    expect(context.hemisphericLight.intensity).toBeCloseTo(0.4);
    expect(context.directionalLight.intensity).toBeCloseTo(0.35);
    expect(context.ledGroup.visible).toBe(false);
    expect(context.ledFillLights.visible).toBe(false);
    expect(context.bloomPass.enabled).toBe(false);
  });

  it('restores cinematic settings when toggled back', () => {
    const context = createController();
    context.controller.toggle();
    const mode = context.controller.toggle();
    expect(mode).toBe('cinematic');
    expect(context.renderer.toneMappingExposure).toBeCloseTo(1.1);
    expect(context.ambientLight.intensity).toBeCloseTo(0.38);
    expect(context.hemisphericLight.intensity).toBeCloseTo(0.22);
    expect(context.directionalLight.intensity).toBeCloseTo(0.64);
    expect(context.ledGroup.visible).toBe(true);
    expect(context.ledFillLights.visible).toBe(true);
    expect(context.bloomPass.enabled).toBe(true);
  });
});
