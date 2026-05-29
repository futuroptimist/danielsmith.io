import { describe, expect, it } from 'vitest';

import { createImmersivePerformanceDiagnostics } from '../systems/performance/immersiveDiagnostics';
import { classifyRendererInfo } from '../systems/performance/rendererCapabilities';

describe('immersive performance diagnostics', () => {
  it('aggregates frame and phase telemetry into a cheap snapshot', () => {
    const diagnostics = createImmersivePerformanceDiagnostics({
      rendererInfo: classifyRendererInfo({
        vendor: 'NVIDIA',
        renderer: 'GeForce',
        unmaskedVendor: null,
        unmaskedRenderer: null,
      }),
      getRendererMetrics: () => ({
        dpr: 1.25,
        viewport: { width: 1280, height: 720 },
        drawingBuffer: { width: 1600, height: 900 },
      }),
      getQualityLevel: () => 'balanced',
      getAdaptiveState: () => ({
        forceLowDpr: false,
        disableComposer: false,
        disableBloom: false,
        throttleMirror: true,
        disableMirror: false,
        throttleDecorations: false,
        downgradeCount: 0,
        lastDowngradeReason: null,
        lastDowngradeAtMs: null,
      }),
      getPostprocessingState: () => ({
        bloomEnabled: true,
        composerEnabled: true,
        activePassCount: 2,
      }),
      getMirrorState: () => ({
        enabled: true,
        renderTargetSize: 256,
        updateRate: 6,
        renderCount: 3,
        skippedCount: 9,
      }),
      getLastFailoverReason: () => null,
    });

    diagnostics.recordFrame(1 / 60);
    diagnostics.recordFrame(1 / 30);
    diagnostics.recordPhase('mainRenderComposer', 6);
    diagnostics.recordPhase('mainRenderComposer', 12);

    const snapshot = diagnostics.getSnapshot();
    expect(snapshot.sampleCount).toBe(2);
    expect(snapshot.averageFps).toBeCloseTo(45);
    expect(snapshot.p95FrameMs).toBeCloseTo(1000 / 30);
    expect(snapshot.postprocessing.activePassCount).toBe(2);
    expect(snapshot.mirror.skippedCount).toBe(9);
    expect(snapshot.phaseTimings.mainRenderComposer.p95Ms).toBe(12);
  });
});
