import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type GraphicsQualityPreset = 'cinematic' | 'performance';

interface PixelRatioTarget {
  readonly preset: GraphicsQualityPreset;
  readonly cap: number;
}

interface BloomState {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

export interface GraphicsQualityManagerOptions {
  renderer: { setPixelRatio: (ratio: number) => void };
  composer?: { setPixelRatio?: (ratio: number) => void } | null;
  bloomPass?: UnrealBloomPass | null;
  getDevicePixelRatio?: () => number;
}

const PIXEL_RATIO_TARGETS: PixelRatioTarget[] = [
  { preset: 'cinematic', cap: 2 },
  { preset: 'performance', cap: 1.3 },
];

function clampRatio(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getPixelRatioCap(preset: GraphicsQualityPreset): number {
  return PIXEL_RATIO_TARGETS.find((target) => target.preset === preset)?.cap ?? 2;
}

export class GraphicsQualityManager {
  private preset: GraphicsQualityPreset = 'cinematic';

  private readonly renderer;

  private readonly composer;

  private readonly bloomPass;

  private readonly getDevicePixelRatio;

  private readonly baselineBloomState: BloomState | null;

  private storedBloomState: BloomState | null = null;

  constructor({
    renderer,
    composer = null,
    bloomPass = null,
    getDevicePixelRatio = () =>
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1,
  }: GraphicsQualityManagerOptions) {
    this.renderer = renderer;
    this.composer = composer;
    this.bloomPass = bloomPass;
    this.getDevicePixelRatio = getDevicePixelRatio;
    this.baselineBloomState = bloomPass
      ? {
          enabled: bloomPass.enabled,
          strength: bloomPass.strength,
          radius: bloomPass.radius,
          threshold: bloomPass.threshold,
        }
      : null;
    this.applyCurrentPreset();
  }

  getQuality(): GraphicsQualityPreset {
    return this.preset;
  }

  setQuality(next: GraphicsQualityPreset): void {
    if (this.preset === next) {
      this.applyCurrentPreset();
      return;
    }
    this.preset = next;
    this.applyCurrentPreset();
  }

  handleResize(): void {
    this.applyPixelRatio();
  }

  private applyCurrentPreset(): void {
    this.applyPixelRatio();
    this.applyBloomState();
  }

  private applyPixelRatio(): void {
    const deviceRatio = clampRatio(this.getDevicePixelRatio(), 0.5, 4);
    const cap = getPixelRatioCap(this.preset);
    const target = clampRatio(deviceRatio, 0.5, cap);
    this.renderer.setPixelRatio(target);
    if (this.composer && typeof this.composer.setPixelRatio === 'function') {
      this.composer.setPixelRatio(target);
    }
  }

  private applyBloomState(): void {
    if (!this.bloomPass) {
      return;
    }

    if (this.preset === 'performance') {
      if (!this.storedBloomState) {
        this.storedBloomState = {
          enabled: this.bloomPass.enabled,
          strength: this.bloomPass.strength,
          radius: this.bloomPass.radius,
          threshold: this.bloomPass.threshold,
        };
      }
      this.bloomPass.enabled = false;
      this.bloomPass.strength = 0;
      return;
    }

    const restoreState = this.storedBloomState ?? this.baselineBloomState;
    if (restoreState) {
      this.bloomPass.enabled = restoreState.enabled;
      this.bloomPass.strength = restoreState.strength;
      this.bloomPass.radius = restoreState.radius;
      this.bloomPass.threshold = restoreState.threshold;
    }
    this.storedBloomState = null;
  }
}

export function isGraphicsQualityPreset(value: unknown): value is GraphicsQualityPreset {
  return value === 'cinematic' || value === 'performance';
}
