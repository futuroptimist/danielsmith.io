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
        adaptiveDowngradeCount: 1,
        lastAdaptiveReason: 'low FPS downgraded cinematic to balanced',
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
    diagnostics.recordPhase('mainRender', 8);
    diagnostics.recordPhase('mainRender', 16);

    const snapshot = diagnostics.methods.getSnapshot();
    expect(snapshot.averageFps).toBeCloseTo(40, 0);
    expect(snapshot.sampleCount).toBe(2);
    expect(snapshot.rendererSize.pixelRatio).toBe(1.25);
    expect(snapshot.quality.level).toBe('balanced');
    expect(snapshot.features.activePostprocessingPassCount).toBe(1);
    expect(snapshot.phases.mainRender.sampleCount).toBe(2);
  });
});
