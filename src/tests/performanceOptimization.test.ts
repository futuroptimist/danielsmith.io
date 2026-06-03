import { describe, expect, it, vi } from 'vitest';

import type { GraphicsQualityLevel } from '../scene/graphics/qualityManager';
import {
  createSceneDetailController,
  getSceneDetailPolicy,
} from '../scene/graphics/sceneDetailPolicy';
import {
  createAdaptiveQualityController,
  type AdaptiveQualitySelectionSource,
} from '../scene/performance/adaptiveQuality';
import {
  clampDevicePixelRatio,
  getQualityFeaturePolicy,
  resolveInitialQualityPolicy,
  resolveResizedBasePixelRatio,
  resolveSoftwareRendererPolicy,
  resolveSoftwareSafeRenderCadence,
  getQualitySceneDetailPolicy,
} from '../scene/performance/qualityPolicy';
import { classifyRendererInfo } from '../scene/performance/rendererCapabilities';

function createPolicyHarness({
  level = 'balanced',
  basePixelRatio = 1.25,
  selectionSource = 'adaptive',
  isSoftwareRenderer = false,
  onSceneDetailLevelChange,
}: {
  level?: GraphicsQualityLevel;
  basePixelRatio?: number;
  selectionSource?: AdaptiveQualitySelectionSource;
  isSoftwareRenderer?: boolean;
  onSceneDetailLevelChange?: (level: GraphicsQualityLevel) => void;
} = {}) {
  let currentLevel = level;
  let currentBasePixelRatio = basePixelRatio;
  let currentSelectionSource = selectionSource;
  const onAction = vi.fn();
  const controller = createAdaptiveQualityController({
    qualityManager: {
      getLevel: () => currentLevel,
      setLevel: (next, options = {}) => {
        currentLevel = next;
        currentSelectionSource = options.source ?? 'user';
      },
      setBasePixelRatio: (next) => {
        currentBasePixelRatio = next;
      },
    },
    getBasePixelRatio: () => currentBasePixelRatio,
    setBasePixelRatio: (next) => {
      currentBasePixelRatio = next;
    },
    getSelectionSource: () => currentSelectionSource,
    isSoftwareRenderer,
    cooldownMs: 0,
    downgradeAfterMs: 1000,
    warmupMs: isSoftwareRenderer ? 0 : 3000,
    recoveryAfterMs: 3000,
    recoveryFpsThreshold: 55,
    recoveryP95FrameMs: 22,
    onAction,
    onSceneDetailLevelChange,
  });

  return {
    controller,
    onAction,
    get level() {
      return currentLevel;
    },
    get basePixelRatio() {
      return currentBasePixelRatio;
    },
    setLevel(next: GraphicsQualityLevel) {
      currentLevel = next;
    },
    setSelectionSource(next: AdaptiveQualitySelectionSource) {
      currentSelectionSource = next;
    },
  };
}

describe('immersive performance optimization policy', () => {
  it('classifies known dangerous software renderers separately from hardware', () => {
    const dangerousRenderers = [
      'ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)',
      'Google SwiftShader',
      'ANGLE (Microsoft, WARP, D3D11)',
      'llvmpipe (LLVM 17.0.0, 256 bits)',
    ];

    dangerousRenderers.forEach((renderer) => {
      expect(
        classifyRendererInfo({ unmaskedRenderer: renderer })
      ).toMatchObject({
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: true,
        riskLevel: 'dangerous-software',
      });
    });

    expect(
      classifyRendererInfo({ renderer: 'ANGLE (NVIDIA GeForce RTX)' })
    ).toMatchObject({
      isSoftwareRenderer: false,
      isDangerousSoftwareRenderer: false,
      riskLevel: 'normal',
    });
  });

  it('keeps generic software renderers out of dangerous safe mode', () => {
    const genericSoftwareRenderers = [
      'Generic Software Renderer',
      'CPU Rasterizer',
      'Chromium Software Compositor',
      'ANGLE (Generic, Software Renderer, D3D11)',
    ];

    genericSoftwareRenderers.forEach((renderer) => {
      expect(classifyRendererInfo({ renderer })).toMatchObject({
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: false,
        riskLevel: 'software',
      });
    });
  });

  it('starts software renderers in low-cost performance mode', () => {
    const software = resolveInitialQualityPolicy(
      { isSoftwareRenderer: true, isDangerousSoftwareRenderer: false },
      2
    );
    expect(software.initialLevel).toBe('performance');
    expect(software.basePixelRatioCap).toBe(0.75);
    expect(software.mirrorEnabled).toBe(false);

    const normal = resolveInitialQualityPolicy(
      { isSoftwareRenderer: false, isDangerousSoftwareRenderer: false },
      2
    );
    expect(normal.initialLevel).toBe('balanced');
    expect(normal.basePixelRatioCap).toBe(1.25);
    expect(normal.mirrorEnabled).toBe(true);
  });

  it('chooses ultra-low DPR and capped cadence for dangerous software safe mode', () => {
    const policy = resolveSoftwareRendererPolicy(
      { isDangerousSoftwareRenderer: true },
      '?mode=immersive&disablePerformanceFailover=1'
    );
    const quality = resolveInitialQualityPolicy(
      { isSoftwareRenderer: true, isDangerousSoftwareRenderer: true },
      2,
      policy
    );

    expect(policy).toMatchObject({
      safeMode: true,
      mode: 'safe',
      renderCadenceFps: 12,
    });
    expect(quality).toMatchObject({
      initialLevel: 'performance',
      basePixelRatioCap: 0.45,
      mirrorEnabled: false,
      softwareSafeMode: true,
      renderCadenceFps: 12,
    });
  });

  it('allows continuous rendering only with an explicit software override', () => {
    expect(
      resolveSoftwareRendererPolicy(
        { isDangerousSoftwareRenderer: true },
        '?softwareRendererMode=continuous'
      )
    ).toMatchObject({
      safeMode: false,
      mode: 'continuous',
      renderCadenceFps: null,
    });
    expect(
      resolveSoftwareRendererPolicy(
        { isDangerousSoftwareRenderer: true },
        '?forceContinuousRendering=1'
      )
    ).toMatchObject({
      safeMode: false,
      mode: 'continuous',
      renderCadenceFps: null,
    });
  });

  it('enforces the dangerous software safe render cadence deterministically', () => {
    const intervalMs = 1000 / 12;

    expect(
      resolveSoftwareSafeRenderCadence({
        safeMode: true,
        hasPresentedFirstFrame: false,
        renderRequested: false,
        lastRenderMs: 0,
        nowMs: 0,
        renderIntervalMs: intervalMs,
      })
    ).toMatchObject({ shouldRender: true, lastRenderMs: 0 });

    expect(
      resolveSoftwareSafeRenderCadence({
        safeMode: true,
        hasPresentedFirstFrame: true,
        renderRequested: false,
        lastRenderMs: 0,
        nowMs: 16,
        renderIntervalMs: intervalMs,
      })
    ).toMatchObject({ shouldRender: false, lastRenderMs: 0 });

    expect(
      resolveSoftwareSafeRenderCadence({
        safeMode: true,
        hasPresentedFirstFrame: true,
        renderRequested: true,
        lastRenderMs: 0,
        nowMs: 20,
        renderIntervalMs: intervalMs,
      })
    ).toMatchObject({
      shouldRender: true,
      renderRequested: false,
      lastRenderMs: 20,
    });

    expect(
      resolveSoftwareSafeRenderCadence({
        safeMode: true,
        hasPresentedFirstFrame: true,
        renderRequested: false,
        lastRenderMs: 0,
        nowMs: intervalMs,
        renderIntervalMs: intervalMs,
      })
    ).toMatchObject({ shouldRender: true, lastRenderMs: intervalMs });

    expect(
      resolveSoftwareSafeRenderCadence({
        safeMode: false,
        hasPresentedFirstFrame: true,
        renderRequested: false,
        lastRenderMs: 20,
        nowMs: 32,
        renderIntervalMs: intervalMs,
      })
    ).toMatchObject({ shouldRender: true, lastRenderMs: 32 });
  });

  it('clamps DPR and disables expensive features in performance mode', () => {
    expect(clampDevicePixelRatio(3, 1.25)).toBe(1.25);
    expect(clampDevicePixelRatio(Number.NaN, 1.25)).toBe(1);
    expect(getQualityFeaturePolicy('performance')).toMatchObject({
      mirrorEnabled: false,
      mirrorUpdateRateFps: 0,
      mirrorTargetSize: 192,
    });
    expect(getQualityFeaturePolicy('cinematic')).toMatchObject({
      mirrorEnabled: true,
      mirrorUpdateRateFps: 15,
      mirrorTargetSize: 512,
    });
  });

  it('maps graphics quality to centralized scene detail budgets', () => {
    const balanced = getQualitySceneDetailPolicy('balanced');
    const performance = getQualitySceneDetailPolicy('performance');

    expect(performance.level).toBe('performance');
    expect(performance.effects.mist).toBe(false);
    expect(performance.effects.pondRippleShader).toBe(false);
    expect(performance.effects.dynamicPointLights).toBe(false);
    expect(performance.textures.jobbotScreen.width).toBeLessThanOrEqual(
      balanced.textures.jobbotScreen.width / 4
    );
    expect(performance.geometry.cylinderSegments).toBeLessThanOrEqual(
      balanced.geometry.cylinderSegments / 5
    );
    expect(performance.geometry.sphereWidthSegments).toBeLessThanOrEqual(
      balanced.geometry.sphereWidthSegments / 4
    );
    expect(performance.budgets.transparentShaderLayers).toBe(0);
    expect(performance.budgets.dynamicPointLights).toBeLessThan(
      balanced.budgets.dynamicPointLights
    );
  });

  it('starts coarse-pointer constrained hardware in performance without persisted preferences', () => {
    const policy = resolveInitialQualityPolicy(
      { isSoftwareRenderer: false, isDangerousSoftwareRenderer: false },
      2,
      resolveSoftwareRendererPolicy({ isDangerousSoftwareRenderer: false }),
      { coarsePointer: true, tabletLike: true, deviceMemoryGb: 4 }
    );

    expect(policy.initialLevel).toBe('performance');
    expect(policy.sceneDetailLevel).toBe('performance');
    expect(policy.mirrorEnabled).toBe(false);
  });

  it('respects persisted balanced quality on coarse-pointer hardware', () => {
    const policy = resolveInitialQualityPolicy(
      { isSoftwareRenderer: false, isDangerousSoftwareRenderer: false },
      2,
      resolveSoftwareRendererPolicy({ isDangerousSoftwareRenderer: false }),
      {
        coarsePointer: true,
        mobileLike: true,
        tabletLike: true,
        explicitGraphicsQualityLevel: 'balanced',
      }
    );

    expect(policy.initialLevel).toBe('balanced');
    expect(policy.sceneDetailLevel).toBe('balanced');
    expect(policy.mirrorEnabled).toBe(true);
  });

  it('resolves persisted performance scene detail before construction', () => {
    const policy = resolveInitialQualityPolicy(
      { isSoftwareRenderer: false, isDangerousSoftwareRenderer: false },
      2,
      resolveSoftwareRendererPolicy({ isDangerousSoftwareRenderer: false }),
      { explicitGraphicsQualityLevel: 'performance' }
    );

    expect(policy.initialLevel).toBe('performance');
    expect(policy.sceneDetailLevel).toBe('performance');
    expect(getQualitySceneDetailPolicy(policy.sceneDetailLevel).level).toBe(
      'performance'
    );
  });

  it('resizes DPR up to the device cap without undoing adaptive downgrades', () => {
    expect(resolveResizedBasePixelRatio(2, 1.25)).toBe(1.25);
    expect(resolveResizedBasePixelRatio(2, 1.25, 1)).toBe(1);
    expect(resolveResizedBasePixelRatio(0.9, 1.25, 1)).toBe(0.9);
  });

  it('does not downgrade normal renderers for transient startup warmup FPS', () => {
    const harness = createPolicyHarness({ level: 'balanced' });

    for (let index = 0; index < 6; index += 1) {
      expect(harness.controller.update(0.4)).toBeNull();
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getSnapshot()).toMatchObject({
      isWarmingUp: true,
      downgradeCount: 0,
    });
  });

  it('downgrades normal renderers after sustained low FPS beyond warmup', () => {
    const harness = createPolicyHarness({ level: 'cinematic' });

    for (let index = 0; index < 9; index += 1) {
      harness.controller.update(0.4);
    }
    const event = harness.controller.update(0.4);

    expect(event?.step).toBe('quality-balanced');
    expect(event?.reason).toContain('sustained low FPS');
    expect(harness.level).toBe('balanced');
  });

  it('recovers normal hardware from performance to balanced after stable FPS', () => {
    const harness = createPolicyHarness({ level: 'performance' });

    let event = null;
    for (let index = 0; index < 380; index += 1) {
      event = harness.controller.update(1 / 60) ?? event;
    }

    expect(event?.action).toBe('recover');
    expect(event?.step).toBe('quality-balanced');
    expect(harness.level).toBe('balanced');
    expect(harness.controller.getRecoveryCount()).toBe(1);
  });

  it('does not bank recovery time while balanced or cinematic', () => {
    const balancedHarness = createPolicyHarness({ level: 'balanced' });
    const cinematicHarness = createPolicyHarness({ level: 'cinematic' });

    for (let index = 0; index < 240; index += 1) {
      balancedHarness.controller.update(1 / 60);
      cinematicHarness.controller.update(1 / 60);
    }

    expect(balancedHarness.controller.getSnapshot().stableDurationMs).toBe(0);
    expect(cinematicHarness.controller.getSnapshot().stableDurationMs).toBe(0);
  });

  it('does not auto-recover after adaptive downgrade to performance', () => {
    const sceneDetailChanges: GraphicsQualityLevel[] = [];
    const harness = createPolicyHarness({
      level: 'balanced',
      selectionSource: 'adaptive',
      onSceneDetailLevelChange: (level) => sceneDetailChanges.push(level),
    });

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.controller.getSnapshot().stableDurationMs).toBe(0);

    let downgradeEvent = null;
    for (let index = 0; index < 6; index += 1) {
      downgradeEvent = harness.controller.update(0.4) ?? downgradeEvent;
    }

    expect(downgradeEvent?.step).toBe('quality-performance');
    expect(harness.level).toBe('performance');
    expect(sceneDetailChanges).toEqual(['performance']);
    expect(harness.controller.getSnapshot()).toMatchObject({
      autoRecoveryEnabled: false,
      stableDurationMs: 0,
    });

    let recoveryEvent = null;
    for (let index = 0; index < 420; index += 1) {
      recoveryEvent = harness.controller.update(1 / 60) ?? recoveryEvent;
    }

    expect(recoveryEvent).toBeNull();
    expect(harness.level).toBe('performance');
    expect(harness.controller.getRecoveryCount()).toBe(0);

    harness.setLevel('balanced');
    harness.setSelectionSource('user');

    expect(harness.level).toBe('balanced');
  });

  it('notifies scene detail policy when adaptive downgrade reaches performance', () => {
    let currentLevel: GraphicsQualityLevel = 'balanced';
    const sceneDetailChanges: GraphicsQualityLevel[] = [];
    const controller = createAdaptiveQualityController({
      qualityManager: {
        getLevel: () => currentLevel,
        setLevel: (next) => {
          currentLevel = next;
        },
        setBasePixelRatio: () => undefined,
      },
      getBasePixelRatio: () => 1,
      setBasePixelRatio: () => undefined,
      cooldownMs: 0,
      downgradeAfterMs: 1000,
      warmupMs: 0,
      onSceneDetailLevelChange: (level) => sceneDetailChanges.push(level),
    });

    for (let index = 0; index < 4; index += 1) {
      controller.update(0.4);
    }

    expect(currentLevel).toBe('performance');
    expect(sceneDetailChanges).toContain('performance');
    expect(getSceneDetailPolicy(currentLevel).effects.dynamicPointLights).toBe(
      false
    );
  });

  it('throttles decorative updates per subsystem channel', () => {
    const controller = createSceneDetailController('performance');

    expect(controller.shouldRunDecorativeUpdate(1, 1, 'media-wall')).toBe(true);
    expect(controller.shouldRunDecorativeUpdate(1, 1, 'jobbot')).toBe(true);
    expect(controller.shouldRunDecorativeUpdate(1.1, 1, 'media-wall')).toBe(
      false
    );
    expect(controller.shouldRunDecorativeUpdate(1.3, 1, 'media-wall')).toBe(
      true
    );
  });

  it('keeps software renderers conservative and does not auto-upshift', () => {
    const harness = createPolicyHarness({
      level: 'performance',
      isSoftwareRenderer: true,
    });

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot()).toMatchObject({
      autoRecoveryEnabled: false,
      softwareRenderer: true,
      recoveryCount: 0,
    });
  });

  it('does not override user-selected performance with auto-upshift', () => {
    const harness = createPolicyHarness({
      level: 'performance',
      selectionSource: 'user',
    });

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot()).toMatchObject({
      autoRecoveryEnabled: false,
      stableDurationMs: 0,
    });
  });

  it('clears accrued recovery when the selection source switches to user', () => {
    const harness = createPolicyHarness({ level: 'performance' });

    for (let index = 0; index < 90; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.controller.getSnapshot().stableDurationMs).toBeGreaterThan(
      0
    );

    harness.setSelectionSource('user');
    expect(harness.controller.update(1 / 60)).toBeNull();

    for (let index = 0; index < 240; index += 1) {
      harness.controller.update(1 / 60);
    }

    expect(harness.level).toBe('performance');
    expect(harness.controller.getSnapshot()).toMatchObject({
      autoRecoveryEnabled: false,
      stableDurationMs: 0,
      recoveryCount: 0,
    });
  });

  it('requires hysteresis so boundary frames do not oscillate quality', () => {
    const harness = createPolicyHarness({ level: 'balanced' });

    for (let index = 0; index < 12; index += 1) {
      harness.controller.update(index % 2 === 0 ? 1 / 29 : 1 / 60);
    }

    expect(harness.level).toBe('balanced');
    expect(harness.controller.getDowngradeCount()).toBe(0);
    expect(harness.onAction).not.toHaveBeenCalled();
  });

  it('downgrades quality and DPR once adaptive steps are exhausted', () => {
    const harness = createPolicyHarness({
      level: 'cinematic',
      isSoftwareRenderer: true,
    });

    expect(harness.controller.update(0.5)).toBeNull();
    expect(harness.controller.update(0.6)?.step).toBe('quality-balanced');
    expect(harness.level).toBe('balanced');
    expect(harness.controller.update(1.1)?.step).toBe('quality-performance');
    expect(harness.level).toBe('performance');
    expect(harness.controller.update(1.1)?.step).toBe('pixel-ratio');
    expect(harness.basePixelRatio).toBeCloseTo(1);
    expect(harness.controller.update(1.1)).toBeNull();
    expect(harness.controller.isExhausted()).toBe(true);
    expect(harness.onAction).toHaveBeenCalledTimes(3);
  });
});
