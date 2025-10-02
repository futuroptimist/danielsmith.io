export interface AmbientAudioSource {
  readonly id: string;
  readonly isPlaying: boolean;
  play(): void;
  stop(): void;
  setVolume(volume: number): void;
}

export interface AmbientAudioBedDefinition {
  id: string;
  center: { x: number; z: number };
  innerRadius: number;
  outerRadius: number;
  baseVolume: number;
  source: AmbientAudioSource;
}

export interface AmbientAudioControllerOptions {
  smoothing?: number;
  onEnable?: () => Promise<void> | void;
}

interface AmbientAudioBedState {
  definition: AmbientAudioBedDefinition;
  currentVolume: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function computeAttenuation(
  distance: number,
  innerRadius: number,
  outerRadius: number
): number {
  if (outerRadius <= innerRadius) {
    return distance <= innerRadius ? 1 : 0;
  }
  if (distance <= innerRadius) {
    return 1;
  }
  if (distance >= outerRadius) {
    return 0;
  }
  const range = outerRadius - innerRadius;
  const normalized = (distance - innerRadius) / range;
  return clamp(1 - normalized, 0, 1);
}

function smoothingFactor(rate: number, delta: number): number {
  if (delta <= 0) {
    return 1;
  }
  if (rate <= 0) {
    return 1;
  }
  return 1 - Math.exp(-rate * delta);
}

export class AmbientAudioController {
  private readonly beds: AmbientAudioBedState[];

  private readonly smoothing: number;

  private readonly onEnable?: () => Promise<void> | void;

  private enabled = false;

  private masterVolume = 1;

  private lastListenerPosition: { x: number; z: number } = { x: 0, z: 0 };

  private hasListenerPosition = false;

  constructor(
    beds: AmbientAudioBedDefinition[],
    options: AmbientAudioControllerOptions = {}
  ) {
    this.beds = beds.map((definition) => ({
      definition,
      currentVolume: 0,
    }));
    this.smoothing = options.smoothing ?? 3.5;
    this.onEnable = options.onEnable;

    this.beds.forEach((bed) => {
      bed.definition.source.setVolume(0);
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enable(): Promise<void> {
    if (this.enabled) {
      return;
    }
    if (this.onEnable) {
      await this.onEnable();
    }
    this.beds.forEach((bed) => {
      if (!bed.definition.source.isPlaying) {
        bed.definition.source.play();
      }
    });
    this.enabled = true;
  }

  disable(): void {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    this.beds.forEach((bed) => {
      bed.currentVolume = 0;
      bed.definition.source.setVolume(0);
    });
  }

  dispose(): void {
    this.beds.forEach((bed) => {
      bed.currentVolume = 0;
      bed.definition.source.setVolume(0);
      if (bed.definition.source.isPlaying) {
        bed.definition.source.stop();
      }
    });
    this.enabled = false;
  }

  update(listenerPosition: { x: number; z: number }, delta: number): void {
    this.lastListenerPosition = {
      x: listenerPosition.x,
      z: listenerPosition.z,
    };
    this.hasListenerPosition = true;
    const factor = smoothingFactor(this.smoothing, delta);
    for (const bed of this.beds) {
      const distance = Math.hypot(
        listenerPosition.x - bed.definition.center.x,
        listenerPosition.z - bed.definition.center.z
      );
      const attenuation = computeAttenuation(
        distance,
        bed.definition.innerRadius,
        bed.definition.outerRadius
      );
      const targetVolume = this.enabled
        ? clamp(
            bed.definition.baseVolume * attenuation * this.masterVolume,
            0,
            1
          )
        : 0;
      const nextVolume =
        bed.currentVolume + (targetVolume - bed.currentVolume) * factor;
      const clampedVolume = clamp(nextVolume, 0, 1);
      bed.currentVolume = clampedVolume;
      bed.definition.source.setVolume(clampedVolume);
    }
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    const clamped = clamp(volume, 0, 1);
    if (clamped === this.masterVolume) {
      return;
    }
    this.masterVolume = clamped;
    if (!this.enabled || !this.hasListenerPosition) {
      return;
    }
    this.update(this.lastListenerPosition, 0);
  }
}

export {
  computeAttenuation as _computeAttenuation,
  smoothingFactor as _smoothingFactor,
};
