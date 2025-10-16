export interface FootstepPlaybackOptions {
  volume: number;
  playbackRate: number;
  pan?: number;
}

export interface FootstepPlayer {
  play(options: FootstepPlaybackOptions): void;
}

export interface FootstepControllerOptions {
  player: FootstepPlayer;
  maxLinearSpeed: number;
  /** Speed threshold below which no footsteps are triggered. Defaults to 12% of max speed. */
  minActivationSpeed?: number;
  /** Interval range in seconds. `min` is the fastest cadence, `max` the slowest. */
  intervalRange?: { min: number; max: number };
  /** Volume range applied before master volume scaling. */
  volumeRange?: { min: number; max: number };
  /** Playback-rate range applied to the buffer. */
  pitchRange?: { min: number; max: number };
  /** Stereo separation applied per step. */
  stereoSeparation?: number;
  /** Interval jitter amount expressed as a fraction of the base interval. */
  intervalJitter?: number;
  /** Volume jitter amount expressed as a fraction of the base volume. */
  volumeJitter?: number;
  /** Pitch jitter amount expressed as a fraction of the base pitch. */
  pitchJitter?: number;
  /** Optional deterministic random generator returning values in [0, 1). */
  random?: () => number;
}

export interface FootstepControllerUpdate {
  delta: number;
  linearSpeed: number;
  masterVolume?: number;
  surfaceMultiplier?: number;
  isGrounded?: boolean;
}

type FootLabel = 'left' | 'right';

export interface FootstepAudioControllerHandle {
  update(update: FootstepControllerUpdate): void;
  notifyFootfall(foot: FootLabel): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  dispose(): void;
}

const clamp = (value: number, min: number, max: number): number => {
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
};

const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

const MIN_INTERVAL = 0.12;
const MAX_INTERVAL = 1.2;
const MIN_PITCH = 0.25;
const MAX_PITCH = 4;
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;

export function createFootstepAudioController(
  options: FootstepControllerOptions
): FootstepAudioControllerHandle {
  const randomFn = options.random ?? Math.random;
  const intervalRange = {
    min: clamp(options.intervalRange?.min ?? 0.32, MIN_INTERVAL, MAX_INTERVAL),
    max: clamp(options.intervalRange?.max ?? 0.58, MIN_INTERVAL, MAX_INTERVAL),
  };
  const volumeRange = {
    min: clamp(options.volumeRange?.min ?? 0.32, MIN_VOLUME, MAX_VOLUME),
    max: clamp(options.volumeRange?.max ?? 0.68, MIN_VOLUME, MAX_VOLUME),
  };
  const pitchRange = {
    min: clamp(options.pitchRange?.min ?? 0.9, MIN_PITCH, MAX_PITCH),
    max: clamp(options.pitchRange?.max ?? 1.22, MIN_PITCH, MAX_PITCH),
  };
  const intervalJitter = clamp(options.intervalJitter ?? 0.12, 0, 0.9);
  const volumeJitter = clamp(options.volumeJitter ?? 0.18, 0, 1);
  const pitchJitter = clamp(options.pitchJitter ?? 0.1, 0, 0.9);
  const stereoSeparation = clamp(options.stereoSeparation ?? 0.18, 0, 1);

  const maxLinearSpeed = Math.max(options.maxLinearSpeed, 0.1);
  const minActivationSpeed = clamp(
    options.minActivationSpeed ?? maxLinearSpeed * 0.12,
    0,
    maxLinearSpeed - 1e-3
  );

  let enabled = true;
  let timeUntilNextStep = 0;
  let lastFoot: FootLabel = 'right';
  let lastNormalizedSpeed = 0;
  let lastMasterVolume = 1;
  let lastSurfaceMultiplier = 1;
  let lastGrounded = true;

  const centeredRandom = (): number => randomFn() * 2 - 1;

  const computeNormalizedSpeed = (speed: number): number => {
    if (!Number.isFinite(speed) || speed <= minActivationSpeed) {
      return 0;
    }
    const normalized =
      (speed - minActivationSpeed) / (maxLinearSpeed - minActivationSpeed);
    return clamp(normalized, 0, 1);
  };

  const computeBaseInterval = (normalizedSpeed: number): number => {
    const base = lerp(intervalRange.max, intervalRange.min, normalizedSpeed);
    return clamp(base, MIN_INTERVAL, MAX_INTERVAL);
  };

  const computeBaseVolume = (normalizedSpeed: number): number => {
    const base = lerp(volumeRange.min, volumeRange.max, normalizedSpeed);
    return clamp(base, MIN_VOLUME, MAX_VOLUME);
  };

  const computeBasePitch = (normalizedSpeed: number): number => {
    const base = lerp(pitchRange.min, pitchRange.max, normalizedSpeed);
    return clamp(base, MIN_PITCH, MAX_PITCH);
  };

  const scheduleNextStep = (
    normalizedSpeed: number,
    { allowJitter }: { allowJitter?: boolean } = {}
  ): void => {
    const baseInterval = computeBaseInterval(normalizedSpeed);
    const jitterFactor =
      allowJitter !== false ? centeredRandom() * intervalJitter : 0;
    const jittered = baseInterval * (1 + jitterFactor);
    timeUntilNextStep = Math.max(jittered, MIN_INTERVAL);
  };

  const triggerStep = (
    normalizedSpeed: number,
    masterVolume: number,
    surfaceMultiplier: number,
    foot?: FootLabel,
    optionsOverride?: { allowJitter?: boolean }
  ): void => {
    const baseVolume = computeBaseVolume(normalizedSpeed);
    const basePitch = computeBasePitch(normalizedSpeed);
    const jitteredVolume = baseVolume * (1 + centeredRandom() * volumeJitter);
    const jitteredPitch = basePitch * (1 + centeredRandom() * pitchJitter);
    const volume = clamp(
      jitteredVolume * masterVolume * surfaceMultiplier,
      MIN_VOLUME,
      MAX_VOLUME
    );
    const playbackRate = clamp(jitteredPitch, MIN_PITCH, MAX_PITCH);
    const resolvedFoot = foot ?? (lastFoot === 'left' ? 'right' : 'left');
    const pan = resolvedFoot === 'left' ? -stereoSeparation : stereoSeparation;
    options.player.play({ volume, playbackRate, pan });
    lastFoot = resolvedFoot;
    scheduleNextStep(normalizedSpeed, optionsOverride);
  };

  return {
    update(update) {
      if (!enabled) {
        return;
      }
      const delta =
        Number.isFinite(update.delta) && update.delta > 0 ? update.delta : 0;
      const isGrounded = update.isGrounded ?? true;
      const speed = update.linearSpeed;
      const normalizedSpeed = computeNormalizedSpeed(speed);
      if (!isGrounded || normalizedSpeed <= 0) {
        timeUntilNextStep = 0;
        lastNormalizedSpeed = 0;
        lastGrounded = isGrounded;
        return;
      }
      const masterVolume = clamp(update.masterVolume ?? 1, 0, 1);
      const surfaceMultiplier = clamp(update.surfaceMultiplier ?? 1, 0, 2);
      if (timeUntilNextStep <= 0) {
        scheduleNextStep(normalizedSpeed);
      }
      timeUntilNextStep -= delta;
      let safety = 0;
      while (timeUntilNextStep <= 0 && safety < 6) {
        const overshoot = -timeUntilNextStep;
        triggerStep(
          normalizedSpeed,
          masterVolume,
          surfaceMultiplier,
          undefined,
          {
            allowJitter: true,
          }
        );
        timeUntilNextStep -= overshoot;
        safety += 1;
      }
      lastNormalizedSpeed = normalizedSpeed;
      lastMasterVolume = masterVolume;
      lastSurfaceMultiplier = surfaceMultiplier;
      lastGrounded = isGrounded;
    },
    notifyFootfall(foot) {
      if (!enabled) {
        return;
      }
      if (foot !== 'left' && foot !== 'right') {
        return;
      }
      if (!lastGrounded || lastNormalizedSpeed <= 0) {
        return;
      }
      triggerStep(
        lastNormalizedSpeed,
        lastMasterVolume,
        lastSurfaceMultiplier,
        foot,
        { allowJitter: false }
      );
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (!enabled) {
        timeUntilNextStep = 0;
        lastNormalizedSpeed = 0;
        lastGrounded = true;
      }
    },
    isEnabled() {
      return enabled;
    },
    dispose() {
      enabled = false;
      timeUntilNextStep = 0;
      lastNormalizedSpeed = 0;
    },
  };
}
