import { describe, expect, it } from 'vitest';

import { createPerformanceDiagnostics } from '../scene/performance/performanceDiagnostics';

describe('performance diagnostics', () => {
  it('aggregates frame and phase samples into read-only snapshots', () => {
    const diagnostics = createPerformanceDiagnostics({
      rendererInfo: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'NVIDIA',
        unmaskedRenderer: 'ANGLE NVIDIA',
        isSoftwareRenderer: false,
        riskLevel: 'normal',
        reason: 'test',
      },
      getRendererSize: () => ({
        pixelRatio: 1.25,
        viewport: { width: 1280, height: 720 },
        drawingBuffer: { width: 1600, height: 900 },
      }),
      getQualityState: () => ({
        level: 'balanced',
        source: 'adaptive',
        adaptiveDowngradeCount: 1,
        adaptiveRecoveryCount: 1,
        lastAdaptiveReason:
          'sustained stable FPS recovered performance to balanced',
        lastAdaptiveDowngradeReason:
          'sustained low FPS downgraded cinematic to balanced',
        lastAdaptiveRecoveryReason:
          'sustained stable FPS recovered performance to balanced',
        adaptivePolicy: {
          elapsedMs: 9000,
          warmupMs: 5000,
          warmupActive: false,
          lowFpsDurationMs: 0,
          stableFpsDurationMs: 3000,
          cooldownRemainingMs: 0,
          downgradeCount: 1,
          recoveryCount: 1,
          lastReason: 'sustained stable FPS recovered performance to balanced',
          lastDowngradeReason:
            'sustained low FPS downgraded cinematic to balanced',
          lastRecoveryReason:
            'sustained stable FPS recovered performance to balanced',
          lastAction: 'recovery',
          qualitySource: 'adaptive',
          canAutoRecover: true,
          sampleCount: 120,
          medianFps: 60,
          p95FrameMs: 18,
          isSoftwareRenderer: false,
          riskLevel: 'normal',
        },
      }),
      getFeatureState: () => ({
        bloomEnabled: true,
        composerEnabled: true,
        activePostprocessingPassCount: 1,
        mirrorEnabled: true,
        mirrorRenderTargetSize: 320,
        mirrorUpdateRateFps: 8,
        mirrorRenderCount: 3,
      }),
      getLastFailoverReason: () => null,
    });

    diagnostics.recordFrame(1 / 60);
    diagnostics.recordFrame(1 / 30);
    diagnostics.recordFrame(1 / 10);
    diagnostics.recordPhase('mainRender', 8);
    diagnostics.recordPhase('mainRender', 16);
    diagnostics.recordPhase('mirror', 4);
    diagnostics.recordPhase('avatarIkAudio', 2);

    const snapshot = diagnostics.methods.getSnapshot();
    expect(snapshot.averageFps).toBeCloseTo(20, 0);
    expect(snapshot.minFps).toBeCloseTo(10, 0);
    expect(snapshot.sampleCount).toBe(3);
    expect(snapshot.rendererSize.pixelRatio).toBe(1.25);
    expect(snapshot.quality.level).toBe('balanced');
    expect(snapshot.quality.source).toBe('adaptive');
    expect(snapshot.quality.adaptiveRecoveryCount).toBe(1);
    expect(snapshot.quality.lastAdaptiveRecoveryReason).toContain('recovered');
    expect(snapshot.quality.adaptivePolicy).toMatchObject({
      warmupActive: false,
      qualitySource: 'adaptive',
      lastAction: 'recovery',
    });
    expect(snapshot.features.activePostprocessingPassCount).toBe(1);
    expect(snapshot.phases.mainRender.sampleCount).toBe(2);
    expect(snapshot.phases.mirror.averageMs).toBe(4);
    expect(snapshot.phases.avatarIkAudio.averageMs).toBe(2);
  });

  it('reports minimum FPS from the slowest sampled frame instead of p95', () => {
    const diagnostics = createPerformanceDiagnostics({
      rendererInfo: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'NVIDIA',
        unmaskedRenderer: 'ANGLE NVIDIA',
        isSoftwareRenderer: false,
        riskLevel: 'normal',
        reason: 'test',
      },
      getRendererSize: () => ({
        pixelRatio: 1,
        viewport: { width: 1280, height: 720 },
        drawingBuffer: { width: 1280, height: 720 },
      }),
      getQualityState: () => ({
        level: 'balanced',
        source: 'initial',
        adaptiveDowngradeCount: 0,
        adaptiveRecoveryCount: 0,
        lastAdaptiveReason: null,
        lastAdaptiveDowngradeReason: null,
        lastAdaptiveRecoveryReason: null,
        adaptivePolicy: null,
      }),
      getFeatureState: () => ({
        bloomEnabled: false,
        composerEnabled: false,
        activePostprocessingPassCount: 0,
        mirrorEnabled: false,
        mirrorRenderTargetSize: 192,
        mirrorUpdateRateFps: 0,
        mirrorRenderCount: 0,
      }),
      getLastFailoverReason: () => null,
    });

    for (let index = 0; index < 19; index += 1) {
      diagnostics.recordFrame(0.016);
    }
    diagnostics.recordFrame(0.1);

    const stats = diagnostics.methods.getFrameStats();
    expect(stats.p95FrameMs).toBe(16);
    expect(stats.minFps).toBe(10);
  });
});
