import { describe, expect, it, vi } from 'vitest';

import {
  AmbientAudioController,
  type AmbientAudioBedDefinition,
  type AmbientAudioSource,
  type AmbientAudioVolumeModulator,
  _computeAttenuation,
  _smoothingFactor,
} from '../systems/audio/ambientAudio';

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
      falloffCurve: overrides.falloffCurve,
      caption: overrides.caption,
      captionThreshold: overrides.captionThreshold,
      captionPriority: overrides.captionPriority,
      source,
      volumeModulator: overrides.volumeModulator,
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

  it('applies master volume scaling and updates immediately', () => {
    const { bed, source } = createBed();
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.1);
    const baseline = source.volumes.at(-1) ?? 0;
    expect(baseline).toBeCloseTo(bed.baseVolume, 5);
    controller.setMasterVolume(0.5);
    expect(controller.getMasterVolume()).toBeCloseTo(0.5, 5);
    const scaled = source.volumes.at(-1) ?? 0;
    expect(scaled).toBeCloseTo(bed.baseVolume * 0.5, 5);
  });

  it('applies configured falloff curve when computing attenuation', () => {
    const { bed, source } = createBed({ falloffCurve: 'smoothstep' });
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    const midDistance =
      bed.innerRadius + (bed.outerRadius - bed.innerRadius) * 0.7;
    controller.update({ x: midDistance, z: 0 }, 0.1);
    const expected =
      bed.baseVolume *
      _computeAttenuation(
        midDistance,
        bed.innerRadius,
        bed.outerRadius,
        'smoothstep'
      );
    expect(source.volumes.at(-1)).toBeCloseTo(expected, 5);
  });

  it('clamps master volume updates and defers when listener position unknown', () => {
    const { bed, source } = createBed();
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.setMasterVolume(2);
    expect(controller.getMasterVolume()).toBe(1);
    expect(source.volumes).toEqual([0]);
    controller.update({ x: 0, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBeCloseTo(bed.baseVolume, 5);
    controller.disable();
    controller.setMasterVolume(-1);
    expect(controller.getMasterVolume()).toBe(0);
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.1);
    expect(source.volumes.at(-1)).toBe(0);
  });

  it('exposes immutable snapshots with current and target volume metadata', () => {
    const { bed } = createBed({
      caption: 'Interior hum',
      baseVolume: 0.42,
      captionPriority: 3,
    });
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.016);
    const snapshots = controller.getBedSnapshots();
    expect(snapshots).toHaveLength(1);
    const [snapshot] = snapshots;
    expect(snapshot.id).toBe(bed.id);
    expect(snapshot.definition).not.toBe(bed);
    expect(snapshot.definition.caption).toBe('Interior hum');
    expect(snapshot.definition.captionPriority).toBe(3);
    expect(snapshot.currentVolume).toBeCloseTo(0.42, 5);
    expect(snapshot.targetVolume).toBeCloseTo(0.42, 5);
    snapshot.definition.center.x = 999;
    expect(controller.getBedSnapshots()[0].definition.center.x).not.toBe(999);
  });

  it('scales base volume using the configured volume modulator', () => {
    const modulator: AmbientAudioVolumeModulator = () => 0.5;
    const { bed, source } = createBed({ volumeModulator: modulator });
    const controller = new AmbientAudioController([bed], { smoothing: 0 });
    controller.enable();
    controller.update({ x: 0, z: 0 }, 0.1, { elapsed: 2 });
    expect(source.volumes.at(-1)).toBeCloseTo(bed.baseVolume * 0.5, 5);
  });
});

describe('attenuation helpers', () => {
  it('computes attenuation across ranges', () => {
    expect(_computeAttenuation(0, 2, 5)).toBe(1);
    expect(_computeAttenuation(10, 2, 5)).toBe(0);
    expect(_computeAttenuation(3.5, 2, 5)).toBeCloseTo(0.5, 2);
    expect(_computeAttenuation(4.25, 2, 5, 'smoothstep')).toBeCloseTo(
      0.15625,
      5
    );
  });

  it('handles smoothing factor edge cases', () => {
    expect(_smoothingFactor(0, 0.016)).toBe(1);
    expect(_smoothingFactor(2, 0)).toBe(1);
    const factor = _smoothingFactor(2, 0.5);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });
});
