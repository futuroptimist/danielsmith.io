import type { GraphicsQualityLevel } from '../../scene/graphics/qualityManager';
import type { RendererInfoSnapshot } from '../../scene/graphics/rendererCapabilities';

export type PerformancePhase =
  | 'inputMovementCamera'
  | 'avatarIkAudio'
  | 'poiHudTooltips'
  | 'decorativeStructures'
  | 'lightingLedLightmap'
  | 'mirror'
  | 'mainRenderComposer';

export interface PhaseTimingSnapshot {
  averageMs: number;
  p95Ms: number;
  sampleCount: number;
}

export interface PerformanceDiagnosticsState {
  rendererInfo: RendererInfoSnapshot;
  getQualityLevel(): GraphicsQualityLevel;
  getDpr(): number;
  getViewport(): { width: number; height: number };
  getDrawingBuffer(): { width: number; height: number };
  getFeatureState(): {
    bloomEnabled: boolean;
    composerEnabled: boolean;
    activePostprocessingPassCount: number;
    mirrorEnabled: boolean;
    mirrorRenderTargetSize: number;
    mirrorUpdateRateFps: number;
    mirrorRenderCount: number;
  };
  getAdaptiveState(): {
    downgradeCount: number;
    lastDowngradeReason: string | null;
    lastFailoverReason: string | null;
  };
}

const MAX_FRAME_SAMPLES = 240;
const MAX_PHASE_SAMPLES = 160;

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
  );
  return sortedValues[index];
}

function summarize(values: readonly number[]) {
  if (values.length === 0) {
    return { average: 0, median: 0, p95: 0, min: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    average: total / values.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0],
    count: values.length,
  };
}

export function createPerformanceDiagnostics(
  state: PerformanceDiagnosticsState
) {
  const frameMsSamples: number[] = [];
  const phaseSamples = new Map<PerformancePhase, number[]>();

  function pushSample(samples: number[], value: number, maxSamples: number) {
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    samples.push(value);
    if (samples.length > maxSamples) {
      samples.splice(0, samples.length - maxSamples);
    }
  }

  function getFrameStats() {
    const summary = summarize(frameMsSamples);
    const fpsSamples = frameMsSamples.map((frameMs) =>
      frameMs > 0 ? 1000 / frameMs : 0
    );
    const fpsSummary = summarize(fpsSamples);
    return {
      averageFps: fpsSummary.average,
      medianFps: fpsSummary.median,
      p95FrameMs: summary.p95,
      minFps: fpsSummary.min,
      sampleCount: summary.count,
    };
  }

  function getPhaseTimings(): Record<PerformancePhase, PhaseTimingSnapshot> {
    const phases: PerformancePhase[] = [
      'inputMovementCamera',
      'avatarIkAudio',
      'poiHudTooltips',
      'decorativeStructures',
      'lightingLedLightmap',
      'mirror',
      'mainRenderComposer',
    ];
    return Object.fromEntries(
      phases.map((phase) => {
        const summary = summarize(phaseSamples.get(phase) ?? []);
        return [
          phase,
          {
            averageMs: summary.average,
            p95Ms: summary.p95,
            sampleCount: summary.count,
          },
        ];
      })
    ) as Record<PerformancePhase, PhaseTimingSnapshot>;
  }

  return {
    recordFrame(deltaSeconds: number) {
      pushSample(frameMsSamples, deltaSeconds * 1000, MAX_FRAME_SAMPLES);
    },
    recordPhase(phase: PerformancePhase, durationMs: number) {
      const samples = phaseSamples.get(phase) ?? [];
      pushSample(samples, durationMs, MAX_PHASE_SAMPLES);
      phaseSamples.set(phase, samples);
    },
    getFrameStats,
    getRendererInfo() {
      return { ...state.rendererInfo };
    },
    getQualityState() {
      return {
        level: state.getQualityLevel(),
        dpr: state.getDpr(),
        ...state.getAdaptiveState(),
      };
    },
    getFeatureState() {
      return state.getFeatureState();
    },
    getLastFailoverReason() {
      return state.getAdaptiveState().lastFailoverReason;
    },
    getSnapshot() {
      return {
        ...getFrameStats(),
        dpr: state.getDpr(),
        viewport: state.getViewport(),
        drawingBuffer: state.getDrawingBuffer(),
        quality: this.getQualityState(),
        features: state.getFeatureState(),
        renderer: this.getRendererInfo(),
        phaseTimings: getPhaseTimings(),
        lastFailoverReason: state.getAdaptiveState().lastFailoverReason,
      };
    },
  };
}

export type PerformanceDiagnostics = ReturnType<
  typeof createPerformanceDiagnostics
>;
