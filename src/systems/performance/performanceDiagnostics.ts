import { createFpsAccumulator } from './fpsAccumulator';

export type PerformancePhase =
  | 'inputMovementCamera'
  | 'avatarIkAudio'
  | 'poiHudTooltips'
  | 'decorativeStructures'
  | 'lightingLedLightmap'
  | 'mirror'
  | 'mainRenderComposer';

export interface DiagnosticsRendererState {
  dpr: number;
  viewport: { width: number; height: number };
  drawingBuffer: { width: number; height: number };
  composerEnabled: boolean;
  bloomEnabled: boolean;
  activePostprocessingPassCount: number;
}

export interface DiagnosticsQualityState {
  level: string;
  adaptiveDowngradeCount: number;
  lastAdaptiveReason: string | null;
}

export interface DiagnosticsMirrorState {
  enabled: boolean;
  targetSize: number;
  updateRate: number;
  renderCount: number;
  skippedCount: number;
}

export interface PerformanceDiagnosticsOptions {
  sampleEveryFrames?: number;
}

interface PhaseBucket {
  totalMs: number;
  samples: number;
  values: number[];
}

const PHASES: readonly PerformancePhase[] = [
  'inputMovementCamera',
  'avatarIkAudio',
  'poiHudTooltips',
  'decorativeStructures',
  'lightingLedLightmap',
  'mirror',
  'mainRenderComposer',
] as const;

export function createPerformanceDiagnostics(
  options: PerformanceDiagnosticsOptions = {}
) {
  const sampleEveryFrames = Math.max(1, options.sampleEveryFrames ?? 12);
  const fpsAccumulator = createFpsAccumulator();
  const phases = new Map<PerformancePhase, PhaseBucket>();
  PHASES.forEach((phase) =>
    phases.set(phase, { totalMs: 0, samples: 0, values: [] })
  );

  let frameCount = 0;
  let lastFailoverReason: string | null = null;
  let rendererState: DiagnosticsRendererState = {
    dpr: 1,
    viewport: { width: 0, height: 0 },
    drawingBuffer: { width: 0, height: 0 },
    composerEnabled: false,
    bloomEnabled: false,
    activePostprocessingPassCount: 0,
  };
  let qualityState: DiagnosticsQualityState = {
    level: 'unknown',
    adaptiveDowngradeCount: 0,
    lastAdaptiveReason: null,
  };
  let mirrorState: DiagnosticsMirrorState = {
    enabled: false,
    targetSize: 0,
    updateRate: 0,
    renderCount: 0,
    skippedCount: 0,
  };
  let rendererInfo: unknown = null;

  function percentile(
    values: readonly number[],
    percentileValue: number
  ): number {
    if (values.length === 0) {
      return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
    );
    return sorted[index];
  }

  return {
    recordFrame(deltaSeconds: number) {
      frameCount += 1;
      if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
        fpsAccumulator.record(1 / deltaSeconds);
      }
    },
    shouldSampleFrame() {
      return frameCount % sampleEveryFrames === 0;
    },
    recordPhase(phase: PerformancePhase, durationMs: number) {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        return;
      }
      const bucket = phases.get(phase);
      if (!bucket) {
        return;
      }
      bucket.totalMs += durationMs;
      bucket.samples += 1;
      bucket.values.push(durationMs);
      if (bucket.values.length > 120) {
        bucket.values.shift();
      }
    },
    setRendererState(next: DiagnosticsRendererState) {
      rendererState = next;
    },
    setQualityState(next: DiagnosticsQualityState) {
      qualityState = next;
    },
    setMirrorState(next: DiagnosticsMirrorState) {
      mirrorState = next;
    },
    setRendererInfo(next: unknown) {
      rendererInfo = next;
    },
    setLastFailoverReason(reason: string | null) {
      lastFailoverReason = reason;
    },
    getFrameStats() {
      const summary = fpsAccumulator.getSummary();
      const fpsValues = summary ? [] : [];
      return {
        averageFps: summary?.averageFps ?? 0,
        medianFps: summary?.medianFps ?? 0,
        p95FrameMs: summary?.p95Fps ? 1000 / summary.p95Fps : 0,
        minFps: summary?.minFps ?? 0,
        sampleCount: summary?.count ?? 0,
        fpsValues,
      };
    },
    getPhaseTimings() {
      return Object.fromEntries(
        PHASES.map((phase) => {
          const bucket = phases.get(phase)!;
          return [
            phase,
            {
              averageMs:
                bucket.samples > 0 ? bucket.totalMs / bucket.samples : 0,
              p95Ms: percentile(bucket.values, 95),
              sampleCount: bucket.samples,
            },
          ];
        })
      );
    },
    getRendererInfo() {
      return rendererInfo;
    },
    getQualityState() {
      return qualityState;
    },
    getFeatureState() {
      return {
        bloomEnabled: rendererState.bloomEnabled,
        composerEnabled: rendererState.composerEnabled,
        activePostprocessingPassCount:
          rendererState.activePostprocessingPassCount,
        mirror: mirrorState,
      };
    },
    getLastFailoverReason() {
      return lastFailoverReason;
    },
    getSnapshot() {
      return {
        ...this.getFrameStats(),
        renderer: rendererState,
        quality: qualityState,
        features: this.getFeatureState(),
        rendererInfo,
        phaseTimings: this.getPhaseTimings(),
        lastFailoverReason,
      };
    },
  };
}

export type PerformanceDiagnostics = ReturnType<
  typeof createPerformanceDiagnostics
>;
