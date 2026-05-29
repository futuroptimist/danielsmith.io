import type { GraphicsQualityLevel } from '../../scene/graphics/qualityManager';

import type { AdaptiveQualityState } from './adaptiveQuality';
import type { RendererInfoSnapshot } from './rendererCapabilities';

export type PhaseName =
  | 'inputMovementCamera'
  | 'avatarIkAudio'
  | 'poiHudTooltips'
  | 'decorativeStructures'
  | 'lightingLedLightmap'
  | 'mirror'
  | 'mainRenderComposer';

export interface RendererMetricsSnapshot {
  dpr: number;
  viewport: { width: number; height: number };
  drawingBuffer: { width: number; height: number };
}

export interface PostprocessingStateSnapshot {
  bloomEnabled: boolean;
  composerEnabled: boolean;
  activePassCount: number;
}

export interface MirrorFeatureSnapshot {
  enabled: boolean;
  renderTargetSize: number;
  updateRate: number;
  renderCount: number;
  skippedCount: number;
}

export interface ImmersivePerformanceSnapshot {
  averageFps: number;
  medianFps: number;
  p95FrameMs: number;
  minFps: number;
  sampleCount: number;
  rendererInfo: RendererInfoSnapshot;
  rendererMetrics: RendererMetricsSnapshot;
  quality: {
    level: GraphicsQualityLevel;
    adaptive: AdaptiveQualityState;
  };
  postprocessing: PostprocessingStateSnapshot;
  mirror: MirrorFeatureSnapshot;
  phaseTimings: Record<
    PhaseName,
    { averageMs: number; p95Ms: number; sampleCount: number }
  >;
  lastFailoverReason: string | null;
}

export interface ImmersiveDiagnosticsOptions {
  rendererInfo: RendererInfoSnapshot;
  getRendererMetrics: () => RendererMetricsSnapshot;
  getQualityLevel: () => GraphicsQualityLevel;
  getAdaptiveState: () => AdaptiveQualityState;
  getPostprocessingState: () => PostprocessingStateSnapshot;
  getMirrorState: () => MirrorFeatureSnapshot;
  getLastFailoverReason: () => string | null;
  maxSamples?: number;
}

interface PhaseBucket {
  samples: number[];
}

const PHASES: readonly PhaseName[] = [
  'inputMovementCamera',
  'avatarIkAudio',
  'poiHudTooltips',
  'decorativeStructures',
  'lightingLedLightmap',
  'mirror',
  'mainRenderComposer',
];

function percentile(sortedValues: readonly number[], fraction: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * fraction) - 1)
  );
  return sortedValues[index];
}

function summarize(values: readonly number[]) {
  if (values.length === 0) {
    return { average: 0, median: 0, p95: 0, min: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    average: total / values.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0],
  };
}

export interface ImmersivePerformanceDiagnostics {
  recordFrame(deltaSeconds: number): void;
  recordPhase(name: PhaseName, durationMs: number): void;
  getSnapshot(): ImmersivePerformanceSnapshot;
  getFrameStats(): Pick<
    ImmersivePerformanceSnapshot,
    'averageFps' | 'medianFps' | 'p95FrameMs' | 'minFps' | 'sampleCount'
  >;
  getRendererInfo(): RendererInfoSnapshot;
  getQualityState(): ImmersivePerformanceSnapshot['quality'];
  getFeatureState(): Pick<
    ImmersivePerformanceSnapshot,
    'postprocessing' | 'mirror' | 'phaseTimings'
  >;
  getLastFailoverReason(): string | null;
}

export function createImmersivePerformanceDiagnostics({
  rendererInfo,
  getRendererMetrics,
  getQualityLevel,
  getAdaptiveState,
  getPostprocessingState,
  getMirrorState,
  getLastFailoverReason,
  maxSamples = 180,
}: ImmersiveDiagnosticsOptions): ImmersivePerformanceDiagnostics {
  const frameSamples: number[] = [];
  const phaseBuckets = PHASES.reduce(
    (buckets, phase) => ({ ...buckets, [phase]: { samples: [] } }),
    {} as Record<PhaseName, PhaseBucket>
  );

  function pushSample(samples: number[], value: number) {
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    samples.push(value);
    if (samples.length > maxSamples) {
      samples.shift();
    }
  }

  function getFrameStats() {
    const frameMsSummary = summarize(frameSamples);
    const fpsValues = frameSamples.map((frameMs) =>
      frameMs > 0 ? 1000 / frameMs : Number.POSITIVE_INFINITY
    );
    const fpsSummary = summarize(fpsValues);
    return {
      averageFps: fpsSummary.average,
      medianFps: fpsSummary.median,
      p95FrameMs: frameMsSummary.p95,
      minFps: fpsSummary.min,
      sampleCount: frameSamples.length,
    };
  }

  function getPhaseTimings() {
    return PHASES.reduce(
      (timings, phase) => {
        const summary = summarize(phaseBuckets[phase].samples);
        timings[phase] = {
          averageMs: summary.average,
          p95Ms: summary.p95,
          sampleCount: phaseBuckets[phase].samples.length,
        };
        return timings;
      },
      {} as ImmersivePerformanceSnapshot['phaseTimings']
    );
  }

  function getSnapshot(): ImmersivePerformanceSnapshot {
    return {
      ...getFrameStats(),
      rendererInfo,
      rendererMetrics: getRendererMetrics(),
      quality: {
        level: getQualityLevel(),
        adaptive: getAdaptiveState(),
      },
      postprocessing: getPostprocessingState(),
      mirror: getMirrorState(),
      phaseTimings: getPhaseTimings(),
      lastFailoverReason: getLastFailoverReason(),
    };
  }

  return {
    recordFrame(deltaSeconds) {
      const frameMs = deltaSeconds * 1000;
      pushSample(frameSamples, Math.min(frameMs, 250));
    },
    recordPhase(name, durationMs) {
      pushSample(phaseBuckets[name].samples, durationMs);
    },
    getSnapshot,
    getFrameStats,
    getRendererInfo() {
      return rendererInfo;
    },
    getQualityState() {
      return getSnapshot().quality;
    },
    getFeatureState() {
      const snapshot = getSnapshot();
      return {
        postprocessing: snapshot.postprocessing,
        mirror: snapshot.mirror,
        phaseTimings: snapshot.phaseTimings,
      };
    },
    getLastFailoverReason,
  };
}
