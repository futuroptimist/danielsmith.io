import type {
  GraphicsQualityLevel,
  GraphicsQualitySelectionSource,
} from '../graphics/qualityManager';

import type { AdaptiveQualityPolicySnapshot } from './adaptiveQuality';
import type { SoftwareRendererPolicyState } from './qualityPolicy';
import type { RendererInfoSnapshot } from './rendererCapabilities';

export type PhaseName =
  | 'inputMovementCamera'
  | 'avatarIkAudio'
  | 'poiHudTooltips'
  | 'decorativeStructures'
  | 'lightingLedLightmap'
  | 'mirror'
  | 'mainRender';

export interface RendererSizeSnapshot {
  pixelRatio: number;
  viewport: { width: number; height: number };
  drawingBuffer: { width: number; height: number };
}

export interface QualityStateSnapshot {
  level: GraphicsQualityLevel;
  selectionSource: GraphicsQualitySelectionSource;
  adaptiveDowngradeCount: number;
  adaptiveRecoveryCount: number;
  lastAdaptiveReason: string | null;
  lastAdaptiveDowngradeReason: string | null;
  lastAdaptiveRecoveryReason: string | null;
  adaptivePolicy: AdaptiveQualityPolicySnapshot | null;
}

export interface FeatureStateSnapshot {
  bloomEnabled: boolean;
  composerEnabled: boolean;
  activePostprocessingPassCount: number;
  mirrorEnabled: boolean;
  mirrorRenderTargetSize: number;
  mirrorUpdateRateFps: number;
  mirrorRenderCount: number;
}

export interface FrameStatsSnapshot {
  averageFps: number;
  medianFps: number;
  p95FrameMs: number;
  minFps: number;
  sampleCount: number;
  phases: Record<
    PhaseName,
    { averageMs: number; p95Ms: number; sampleCount: number }
  >;
}

export interface PerformanceDiagnosticsSnapshot extends FrameStatsSnapshot {
  renderer: RendererInfoSnapshot;
  softwareRendererPolicy: SoftwareRendererPolicyState;
  rendererSize: RendererSizeSnapshot;
  quality: QualityStateSnapshot;
  features: FeatureStateSnapshot;
  lastFailoverReason: string | null;
}

export interface PerformanceCrashLogApi {
  exportCrashLog(): string;
  copyCrashLog(): Promise<boolean>;
}

export interface PerformanceCrashBreadcrumbApi extends PerformanceCrashLogApi {
  recordSnapshot(snapshot: PerformanceDiagnosticsSnapshot): void;
}

export interface PerformanceDiagnosticsApi {
  getSnapshot(): PerformanceDiagnosticsSnapshot;
  getFrameStats(): FrameStatsSnapshot;
  getRendererInfo(): RendererInfoSnapshot;
  getQualityState(): QualityStateSnapshot;
  getFeatureState(): FeatureStateSnapshot;
  getLastFailoverReason(): string | null;
  exportCrashLog?(): string;
  copyCrashLog?(): Promise<boolean>;
  recordSnapshot?(snapshot: PerformanceDiagnosticsSnapshot): void;
}

interface PerformanceDiagnosticsOptions {
  rendererInfo: RendererInfoSnapshot;
  getRendererSize: () => RendererSizeSnapshot;
  getQualityState: () => QualityStateSnapshot;
  getFeatureState: () => FeatureStateSnapshot;
  getLastFailoverReason: () => string | null;
  getSoftwareRendererPolicy?: () => SoftwareRendererPolicyState;
  exportCrashLog?: () => string;
  copyCrashLog?: () => Promise<boolean>;
  recordSnapshot?: (snapshot: PerformanceDiagnosticsSnapshot) => void;
  maxSamples?: number;
}

const PHASES: readonly PhaseName[] = [
  'inputMovementCamera',
  'avatarIkAudio',
  'poiHudTooltips',
  'decorativeStructures',
  'lightingLedLightmap',
  'mirror',
  'mainRender',
] as const;

function percentile(
  sorted: readonly number[],
  percentileValue: number
): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function summarize(values: readonly number[]): {
  average: number;
  median: number;
  p95: number;
  max: number;
} {
  if (values.length === 0) {
    return { average: 0, median: 0, p95: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    average: total / values.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

export function createPerformanceDiagnostics({
  rendererInfo,
  getRendererSize,
  getQualityState,
  getFeatureState,
  getLastFailoverReason,
  getSoftwareRendererPolicy = () => ({
    mode: 'continuous',
    safeMode: false,
    renderCadenceFps: null,
    reason: 'software renderer policy unavailable',
  }),
  exportCrashLog,
  copyCrashLog,
  recordSnapshot,
  maxSamples = 180,
}: PerformanceDiagnosticsOptions) {
  const frameMsSamples: number[] = [];
  const phaseSamples = new Map<PhaseName, number[]>();
  PHASES.forEach((phase) => phaseSamples.set(phase, []));

  const pushSample = (samples: number[], value: number) => {
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    samples.push(value);
    if (samples.length > maxSamples) {
      samples.shift();
    }
  };

  const diagnosticsMethods: PerformanceDiagnosticsApi = {
    getSnapshot() {
      return {
        ...diagnosticsMethods.getFrameStats(),
        renderer: diagnosticsMethods.getRendererInfo(),
        softwareRendererPolicy: getSoftwareRendererPolicy(),
        rendererSize: getRendererSize(),
        quality: diagnosticsMethods.getQualityState(),
        features: diagnosticsMethods.getFeatureState(),
        lastFailoverReason: diagnosticsMethods.getLastFailoverReason(),
      };
    },
    getFrameStats() {
      const frameSummary = summarize(frameMsSamples);
      const phases = {} as FrameStatsSnapshot['phases'];
      PHASES.forEach((phase) => {
        const samples = phaseSamples.get(phase) ?? [];
        const phaseSummary = summarize(samples);
        phases[phase] = {
          averageMs: phaseSummary.average,
          p95Ms: phaseSummary.p95,
          sampleCount: samples.length,
        };
      });
      return {
        averageFps: frameSummary.average > 0 ? 1000 / frameSummary.average : 0,
        medianFps: frameSummary.median > 0 ? 1000 / frameSummary.median : 0,
        p95FrameMs: frameSummary.p95,
        minFps: frameSummary.max > 0 ? 1000 / frameSummary.max : 0,
        sampleCount: frameMsSamples.length,
        phases,
      };
    },
    getRendererInfo() {
      return rendererInfo;
    },
    getQualityState() {
      return getQualityState();
    },
    getFeatureState() {
      return getFeatureState();
    },
    getLastFailoverReason() {
      return getLastFailoverReason();
    },
    exportCrashLog,
    copyCrashLog,
    recordSnapshot,
  };

  return {
    methods: diagnosticsMethods,
    recordFrame(deltaSeconds: number) {
      if (
        Number.isFinite(deltaSeconds) &&
        deltaSeconds > 0 &&
        deltaSeconds < 1
      ) {
        pushSample(frameMsSamples, deltaSeconds * 1000);
      }
    },
    recordPhase(phase: PhaseName, durationMs: number) {
      const samples = phaseSamples.get(phase);
      if (samples) {
        pushSample(samples, durationMs);
      }
    },
  };
}
