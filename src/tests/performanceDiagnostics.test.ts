import { describe, expect, it } from 'vitest';

import { createPerformanceDiagnostics } from '../systems/performance/performanceDiagnostics';

describe('performance diagnostics', () => {
  it('aggregates frame, feature, quality, and phase snapshots cheaply', () => {
    const diagnostics = createPerformanceDiagnostics({ sampleEveryFrames: 2 });
    diagnostics.recordFrame(1 / 60);
    diagnostics.recordFrame(1 / 30);
    diagnostics.recordPhase('mainRenderComposer', 12);
    diagnostics.setQualityState({
      level: 'performance',
      adaptiveDowngradeCount: 1,
      lastAdaptiveReason: 'test',
    });
    diagnostics.setRendererState({
      dpr: 0.75,
      viewport: { width: 1280, height: 720 },
      drawingBuffer: { width: 960, height: 540 },
      composerEnabled: false,
      bloomEnabled: false,
      activePostprocessingPassCount: 0,
    });
    diagnostics.setMirrorState({
      enabled: false,
      targetSize: 128,
      updateRate: 0,
      renderCount: 0,
      skippedCount: 4,
    });

    expect(diagnostics.shouldSampleFrame()).toBe(true);
    expect(diagnostics.getSnapshot()).toMatchObject({
      sampleCount: 2,
      quality: {
        level: 'performance',
        adaptiveDowngradeCount: 1,
      },
      renderer: {
        dpr: 0.75,
        composerEnabled: false,
        bloomEnabled: false,
      },
      features: {
        mirror: { enabled: false, skippedCount: 4 },
      },
    });
    expect(
      diagnostics.getSnapshot().phaseTimings.mainRenderComposer.sampleCount
    ).toBe(1);
  });
});
