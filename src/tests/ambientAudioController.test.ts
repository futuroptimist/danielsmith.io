import { describe, expect, it, vi } from 'vitest';

import {
  AmbientAudioController,
  type AmbientAudioBedDefinition,
  type AmbientAudioSource,
  _computeAttenuation,
  _smoothingFactor,
} from '../audio/ambientAudio';

class FakeSource implements AmbientAudioSource {
  public isPlaying = false;

  public readonly volumes: number[] = [];

  constructor(public readonly id: string) {}

  play(): void {
    this.isPlaying = true;
  }

  stop(): void {
    this.isPlaying = false;
  }

  setVolume(volume: number): void {
    this.volumes.push(volume);
  }
}

describe('AmbientAudioController', () => {
  const createBed = (overrides: Partial<AmbientAudioBedDefinition> = {}) => {
    const source = new FakeSource(overrides.id ?? 'test');
    const bed: AmbientAudioBedDefinition = {
      id: overrides.id ?? 'bed',
      center: overrides.center ?? { x: 0, z: 0 },
      innerRadius: overrides.innerRadius ?? 2,
      outerRadius: overrides.outerRadius ?? 6,
      baseVolume: overrides.baseVolume ?? 0.8,
      source,
    };
    return { bed, source };
  };

  it('does not start playback until enabled', () => {
    const { bed, source } = createBed();
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.update({ x: 0, z: 0 }, 0.016);
    expect(source.isPlaying).toBe(false);
    expect(source.volumes.at(-1)).toBe(0);
  });

  it('starts playback and resumes context when enabled', async () => {
    const { bed, source } = createBed();
    const resume = vi.fn();
    const controller = new AmbientAudioController([bed], {
      smoothing: 0,
      onEnable: resume,
    });
    await controller.enable();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(source.isPlaying).toBe(true);
  });

  it('smoothly approaches the target volume based on distance', () => {
    const { bed, source } = createBed();
    const controller = new AmbientAudioController([bed], { smoothing: 2 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 1 / 60);
    const firstVolume = source.volumes.at(-1);
    expect(firstVolume).toBeGreaterThan(0);
    controller.update({ x: 0, z: 0 }, 1);
    const secondVolume = source.volumes.at(-1);
    expect(secondVolume).toBeGreaterThan(firstVolume ?? 0);
    expect(secondVolume).toBeLessThanOrEqual(bed.baseVolume);
  });

  it('drops volume when listener leaves the outer radius', () => {
    const { bed, source } = createBed({ outerRadius: 4 });
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBeCloseTo(bed.baseVolume, 5);
    controller.update({ x: 10, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBe(0);
  });

  it('handles degenerate radius definitions gracefully', () => {
    const { bed, source } = createBed({ innerRadius: 3, outerRadius: 3 });
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBeCloseTo(bed.baseVolume, 5);
    controller.update({ x: 4, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBe(0);
  });

  it('stops playback when disposed', () => {
    const { bed, source } = createBed();
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.dispose();
    expect(source.isPlaying).toBe(false);
    expect(source.volumes.at(-1)).toBe(0);
  });
});

describe('attenuation helpers', () => {
  it('computes attenuation across ranges', () => {
    expect(_computeAttenuation(0, 2, 5)).toBe(1);
    expect(_computeAttenuation(10, 2, 5)).toBe(0);
    expect(_computeAttenuation(3.5, 2, 5)).toBeCloseTo(0.5, 2);
  });

  it('handles smoothing factor edge cases', () => {
    expect(_smoothingFactor(0, 0.016)).toBe(1);
    expect(_smoothingFactor(2, 0)).toBe(1);
    const factor = _smoothingFactor(2, 0.5);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });
});
