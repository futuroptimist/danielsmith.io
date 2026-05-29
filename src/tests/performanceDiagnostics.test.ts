import { describe, expect, it } from 'vitest';

import { createPerformanceDiagnostics } from '../systems/performance/performanceDiagnostics';

describe('performance diagnostics', () => {
  it('aggregates frame and phase snapshots without mutating feature state', () => {
    const diagnostics = createPerformanceDiagnostics({
      rendererInfo: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'NVIDIA',
        unmaskedRenderer: 'NVIDIA GeForce',
        tier: 'hardware',
        reason: 'test',
      },
      getQualityLevel: () => 'balanced',
      getDpr: () => 1.25,
      getViewport: () => ({ width: 1280, height: 720 }),
      getDrawingBuffer: () => ({ width: 1600, height: 900 }),
      getFeatureState: () => ({
        bloomEnabled: true,
        composerEnabled: true,
        activePostprocessingPassCount: 1,
        mirrorEnabled: true,
        mirrorRenderTargetSize: 256,
        mirrorUpdateRateFps: 8,
        mirrorRenderCount: 3,
      }),
      getAdaptiveState: () => ({
        downgradeCount: 1,
        lastDowngradeReason: 'test downgrade',
        lastFailoverReason: null,
      }),
    });

    diagnostics.recordFrame(1 / 60);
    diagnostics.recordFrame(1 / 30);
    diagnostics.recordPhase('mainRenderComposer', 4);
    diagnostics.recordPhase('mainRenderComposer', 12);

    const snapshot = diagnostics.getSnapshot();
    expect(snapshot.averageFps).toBeGreaterThan(40);
    expect(snapshot.p95FrameMs).toBeGreaterThan(16);
    expect(snapshot.quality).toMatchObject({
      level: 'balanced',
      dpr: 1.25,
      downgradeCount: 1,
    });
    expect(snapshot.features).toMatchObject({
      composerEnabled: true,
      mirrorUpdateRateFps: 8,
    });
    expect(snapshot.phaseTimings.mainRenderComposer.sampleCount).toBe(2);
    expect(snapshot.renderer.tier).toBe('hardware');
  });
});
