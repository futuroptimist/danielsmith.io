import { MathUtils, MeshStandardMaterial, PointLight } from 'three';

export type LedEase = 'linear' | 'sine-in-out';

export interface LedPulseKeyframe {
  /** Normalized time within the cycle, between 0 and 1 inclusive. */
  time: number;
  /** Multiplier applied to the LED strip emissive intensity. */
  stripMultiplier: number;
  /** Optional multiplier for the paired fill light intensity. */
  fillMultiplier?: number;
  /** Easing applied when interpolating from this keyframe to the next. */
  ease?: LedEase;
}

export interface LedPulseProgram {
  roomId: string;
  /** Total duration of the pulse cycle in seconds. */
  cycleSeconds: number;
  /** Ordered keyframes describing the cycle. */
  keyframes: readonly LedPulseKeyframe[];
}

export interface LedPulseSample {
  stripMultiplier: number;
  fillMultiplier: number;
}

export interface LedAnimatorTarget {
  roomId: string;
  material: MeshStandardMaterial;
  fillLight?: PointLight;
}

export interface LedAnimator {
  update(elapsedSeconds: number): void;
  captureBaseline(): void;
}

const DEFAULT_SAMPLE: LedPulseSample = Object.freeze({
  stripMultiplier: 1,
  fillMultiplier: 1,
});

const DEFAULT_PROGRAM: LedPulseProgram = {
  roomId: '__default__',
  cycleSeconds: 18,
  keyframes: [
    {
      time: 0,
      stripMultiplier: 0.94,
      fillMultiplier: 0.88,
      ease: 'sine-in-out',
    },
    {
      time: 0.35,
      stripMultiplier: 1.1,
      fillMultiplier: 1.02,
      ease: 'sine-in-out',
    },
    {
      time: 0.68,
      stripMultiplier: 0.98,
      fillMultiplier: 0.94,
      ease: 'sine-in-out',
    },
    { time: 1, stripMultiplier: 0.94, fillMultiplier: 0.88 },
  ],
};

const EPSILON = 1e-6;

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

function sanitizeMultiplier(
  value: number | undefined,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  return value;
}

function applyEase(alpha: number, ease: LedEase | undefined): number {
  switch (ease) {
    case 'sine-in-out':
      return 0.5 - Math.cos(Math.PI * alpha) / 2;
    default:
      return alpha;
  }
}

interface PreparedKeyframe {
  time: number;
  stripMultiplier: number;
  fillMultiplier: number;
  ease: LedEase | undefined;
}

function normalizeKeyframes(
  keyframes: readonly LedPulseKeyframe[]
): PreparedKeyframe[] {
  if (!keyframes.length) {
    return [];
  }
  const normalized = keyframes.map((frame) => ({
    time: clamp01(frame.time),
    stripMultiplier: sanitizeMultiplier(frame.stripMultiplier, 1),
    fillMultiplier: sanitizeMultiplier(
      frame.fillMultiplier,
      frame.stripMultiplier
    ),
    ease: frame.ease,
  }));
  normalized.sort((a, b) => a.time - b.time);
  return normalized;
}

export function createLedProgramSampler(
  program: LedPulseProgram
): (elapsedSeconds: number) => LedPulseSample {
  const keyframes = normalizeKeyframes(program.keyframes);
  if (keyframes.length === 0) {
    return () => DEFAULT_SAMPLE;
  }

  const cycle = program.cycleSeconds > EPSILON ? program.cycleSeconds : 1;

  return (elapsedSeconds: number): LedPulseSample => {
    if (!Number.isFinite(elapsedSeconds)) {
      return DEFAULT_SAMPLE;
    }
    const normalizedTime = (((elapsedSeconds / cycle) % 1) + 1) % 1;

    let previous = keyframes[keyframes.length - 1];
    let previousTime = previous.time - 1;

    for (const current of keyframes) {
      const currentTime = current.time;
      if (normalizedTime <= currentTime + EPSILON) {
        const span = currentTime - previousTime;
        if (span <= EPSILON) {
          return {
            stripMultiplier: current.stripMultiplier,
            fillMultiplier: current.fillMultiplier,
          };
        }
        const rawAlpha = (normalizedTime - previousTime) / span;
        const easedAlpha = applyEase(
          MathUtils.clamp(rawAlpha, 0, 1),
          previous.ease
        );
        const strip =
          previous.stripMultiplier +
          (current.stripMultiplier - previous.stripMultiplier) * easedAlpha;
        const fill =
          previous.fillMultiplier +
          (current.fillMultiplier - previous.fillMultiplier) * easedAlpha;
        return {
          stripMultiplier: strip,
          fillMultiplier: fill,
        };
      }
      previous = current;
      previousTime = currentTime;
    }

    // Wrap back to the first keyframe if nothing matched (handles floating point drift).
    const first = keyframes[0];
    const span = first.time + 1 - previousTime;
    const rawAlpha =
      span <= EPSILON ? 0 : (normalizedTime - previousTime) / span;
    const easedAlpha = applyEase(
      MathUtils.clamp(rawAlpha, 0, 1),
      previous.ease
    );
    const strip =
      previous.stripMultiplier +
      (first.stripMultiplier - previous.stripMultiplier) * easedAlpha;
    const fill =
      previous.fillMultiplier +
      (first.fillMultiplier - previous.fillMultiplier) * easedAlpha;
    return {
      stripMultiplier: strip,
      fillMultiplier: fill,
    };
  };
}

interface LedAnimatorEntry {
  roomId: string;
  sampler: (elapsedSeconds: number) => LedPulseSample;
  material: MeshStandardMaterial;
  fillLight?: PointLight;
  baseEmissive: number;
  baseFill: number;
}

export function createLedAnimator(options: {
  programs: Iterable<LedPulseProgram>;
  targets: Iterable<LedAnimatorTarget>;
  defaultProgram?: LedPulseProgram;
}): LedAnimator {
  const programMap = new Map<string, LedPulseProgram>();
  for (const program of options.programs) {
    programMap.set(program.roomId, program);
  }
  const defaultProgram = options.defaultProgram ?? DEFAULT_PROGRAM;
  const defaultSampler = createLedProgramSampler(defaultProgram);

  const entries: LedAnimatorEntry[] = [];
  for (const target of options.targets) {
    const program = programMap.get(target.roomId) ?? defaultProgram;
    const sampler = programMap.has(target.roomId)
      ? createLedProgramSampler(program)
      : defaultSampler;
    entries.push({
      roomId: target.roomId,
      sampler,
      material: target.material,
      fillLight: target.fillLight,
      baseEmissive: target.material.emissiveIntensity,
      baseFill: target.fillLight?.intensity ?? 0,
    });
  }

  const captureBaseline = () => {
    for (const entry of entries) {
      entry.baseEmissive = entry.material.emissiveIntensity;
      entry.baseFill = entry.fillLight?.intensity ?? 0;
    }
  };

  return {
    update(elapsedSeconds) {
      for (const entry of entries) {
        const sample = entry.sampler(elapsedSeconds);
        const emissive = Math.max(
          0,
          entry.baseEmissive * sample.stripMultiplier
        );
        entry.material.emissiveIntensity = emissive;
        if (entry.fillLight) {
          const lightIntensity = Math.max(
            0,
            entry.baseFill * sample.fillMultiplier
          );
          entry.fillLight.intensity = lightIntensity;
        }
      }
    },
    captureBaseline,
  };
}

export const ROOM_LED_PULSE_PROGRAMS: readonly LedPulseProgram[] = [
  {
    roomId: 'livingRoom',
    cycleSeconds: 22,
    keyframes: [
      {
        time: 0,
        stripMultiplier: 0.92,
        fillMultiplier: 0.86,
        ease: 'sine-in-out',
      },
      {
        time: 0.28,
        stripMultiplier: 1.12,
        fillMultiplier: 1.04,
        ease: 'sine-in-out',
      },
      {
        time: 0.55,
        stripMultiplier: 0.97,
        fillMultiplier: 0.92,
        ease: 'sine-in-out',
      },
      {
        time: 0.82,
        stripMultiplier: 1.08,
        fillMultiplier: 1.02,
        ease: 'sine-in-out',
      },
      { time: 1, stripMultiplier: 0.92, fillMultiplier: 0.86 },
    ],
  },
  {
    roomId: 'studio',
    cycleSeconds: 26,
    keyframes: [
      {
        time: 0,
        stripMultiplier: 0.9,
        fillMultiplier: 0.84,
        ease: 'sine-in-out',
      },
      {
        time: 0.18,
        stripMultiplier: 1.08,
        fillMultiplier: 1.02,
        ease: 'sine-in-out',
      },
      {
        time: 0.45,
        stripMultiplier: 0.95,
        fillMultiplier: 0.9,
        ease: 'sine-in-out',
      },
      {
        time: 0.7,
        stripMultiplier: 1.15,
        fillMultiplier: 1.08,
        ease: 'sine-in-out',
      },
      { time: 1, stripMultiplier: 0.9, fillMultiplier: 0.84 },
    ],
  },
  {
    roomId: 'kitchen',
    cycleSeconds: 24,
    keyframes: [
      {
        time: 0,
        stripMultiplier: 0.96,
        fillMultiplier: 0.9,
        ease: 'sine-in-out',
      },
      {
        time: 0.33,
        stripMultiplier: 1.05,
        fillMultiplier: 0.98,
        ease: 'sine-in-out',
      },
      {
        time: 0.58,
        stripMultiplier: 0.93,
        fillMultiplier: 0.9,
        ease: 'sine-in-out',
      },
      {
        time: 0.85,
        stripMultiplier: 1.1,
        fillMultiplier: 1.05,
        ease: 'sine-in-out',
      },
      { time: 1, stripMultiplier: 0.96, fillMultiplier: 0.9 },
    ],
  },
];
