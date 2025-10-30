import { MathUtils } from 'three';

export interface AnalyticsGlowRhythmOptions {
  /**
   * Optional element that receives the `--hud-analytics-glow` custom property.
   */
  element?: HTMLElement | null;
  /**
   * Controls how quickly the glow reacts to changing emphasis. Larger numbers respond faster.
   */
  smoothing?: number;
  /**
   * Number of pulse cycles per second used for the shared glow rhythm.
   */
  pulseFrequency?: number;
  /**
   * Scales how strongly the sinusoidal wave influences the final glow value.
   */
  pulseStrength?: number;
  /**
   * Minimum glow intensity when emphasis is non-zero.
   */
  minGlow?: number;
  /**
   * Maximum glow intensity that will be emitted.
   */
  maxGlow?: number;
  /**
   * Optional hook that returns the accessibility pulse scale (0–1).
   */
  getPulseScale?: () => number;
}

export interface AnalyticsGlowRhythmHandle {
  /**
   * Updates the emphasis target in the 0–1 range.
   */
  setTargetEmphasis(emphasis: number): void;
  /**
   * Advances the glow simulation by the provided delta time in seconds.
   */
  update(deltaSeconds: number): void;
  /**
   * Returns the current glow intensity in the 0–1 range.
   */
  getValue(): number;
  /**
   * Returns the normalized pulse wave (0–1) that other systems can sync to.
   */
  getWave(): number;
  /**
   * Reassigns the DOM element that should receive the CSS custom property.
   */
  setElement(element: HTMLElement | null): void;
  /**
   * Clears DOM side effects and resets state.
   */
  dispose(): void;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function applyGlow(element: HTMLElement | null, value: number): void {
  if (!element) {
    return;
  }
  element.style.setProperty('--hud-analytics-glow', value.toFixed(4));
}

function clearGlow(element: HTMLElement | null): void {
  element?.style.removeProperty('--hud-analytics-glow');
}

export function createAnalyticsGlowRhythm(
  options: AnalyticsGlowRhythmOptions = {}
): AnalyticsGlowRhythmHandle {
  const smoothing = Math.max(options.smoothing ?? 6.5, 0);
  const pulseFrequency = Math.max(options.pulseFrequency ?? 1.15, 0);
  const pulseStrength = clamp01(options.pulseStrength ?? 0.6);
  const minGlow = clamp01(options.minGlow ?? 0.08);
  const maxGlow = Math.max(minGlow, clamp01(options.maxGlow ?? 1));
  const glowRange = maxGlow - minGlow;
  const readPulseScale = options.getPulseScale ?? (() => 1);

  let element: HTMLElement | null = options.element ?? null;
  let targetEmphasis = 0;
  let emphasisState = 0;
  let pulsePhase = 0;
  let glowValue = 0;
  let waveValue = 0;

  const updateGlow = () => {
    applyGlow(element, glowValue);
  };

  return {
    setTargetEmphasis(emphasis: number) {
      targetEmphasis = clamp01(emphasis);
    },
    update(deltaSeconds: number) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
        updateGlow();
        return;
      }

      if (smoothing > 0) {
        const smoothingFactor = 1 - Math.exp(-deltaSeconds * smoothing);
        emphasisState = MathUtils.lerp(
          emphasisState,
          targetEmphasis,
          clamp01(smoothingFactor)
        );
      } else {
        emphasisState = targetEmphasis;
      }

      if (pulseFrequency > 0) {
        pulsePhase += deltaSeconds * pulseFrequency * Math.PI * 2;
        pulsePhase %= Math.PI * 2;
      }

      const pulseScale = clamp01(readPulseScale());
      const baseWave = Math.sin(pulsePhase) * 0.5 + 0.5;
      const scaledWave = baseWave * pulseScale;
      const emphasis = clamp01(emphasisState);

      if (emphasis <= 0) {
        waveValue = 0;
        glowValue = 0;
        updateGlow();
        return;
      }

      const waveBlend = MathUtils.lerp(
        emphasis,
        emphasis * scaledWave,
        pulseStrength * pulseScale
      );

      waveValue = clamp01(waveBlend);
      glowValue = minGlow + glowRange * waveValue;
      updateGlow();
    },
    getValue() {
      return glowValue;
    },
    getWave() {
      return waveValue;
    },
    setElement(next: HTMLElement | null) {
      if (element && element !== next) {
        clearGlow(element);
      }
      element = next;
      updateGlow();
    },
    dispose() {
      clearGlow(element);
      element = null;
      targetEmphasis = 0;
      emphasisState = 0;
      glowValue = 0;
      waveValue = 0;
    },
  };
}
