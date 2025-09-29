import { describe, expect, it } from 'vitest';

import {
  createCricketChorusBuffer,
  createDistantHumBuffer,
  type BufferContext,
  type AudioBufferLike,
  _applyLoopFades,
  _normalizeBuffer,
} from '../audio/proceduralBuffers';

class FakeAudioBuffer implements AudioBufferLike {
  public readonly channelData: Float32Array[];

  constructor(
    public readonly length: number,
    public readonly sampleRate: number,
    channels: number
  ) {
    this.channelData = Array.from(
      { length: channels },
      () => new Float32Array(length)
    );
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel];
  }
}

class FakeContext implements BufferContext {
  constructor(public readonly sampleRate: number) {}

  createBuffer(
    channels: number,
    length: number,
    sampleRate: number
  ): AudioBufferLike {
    return new FakeAudioBuffer(length, sampleRate, channels);
  }
}

describe('procedural buffers', () => {
  it('generates a cricket chorus with gentle fades', () => {
    const context = new FakeContext(48000);
    const buffer = createCricketChorusBuffer(context);
    expect(buffer.length).toBeGreaterThan(0);
    const data = buffer.getChannelData(0);
    expect(data.every(Number.isFinite)).toBe(true);
    expect(Math.max(...data)).toBeLessThanOrEqual(1);
    expect(Math.min(...data)).toBeGreaterThanOrEqual(-1);
    expect(Math.abs(data[0])).toBeLessThan(1e-3);
    expect(Math.abs(data.at(-1) ?? 0)).toBeLessThan(1e-3);
  });

  it('creates a distant hum bed with low-frequency emphasis', () => {
    const context = new FakeContext(44100);
    const buffer = createDistantHumBuffer(context);
    expect(buffer.length).toBeGreaterThan(0);
    const data = buffer.getChannelData(0);
    const average = data.reduce((acc, value) => acc + value, 0) / data.length;
    expect(Math.abs(average)).toBeLessThan(0.05);
    const maxMagnitude = data.reduce(
      (acc, value) => Math.max(acc, Math.abs(value)),
      0
    );
    expect(maxMagnitude).toBeLessThanOrEqual(1);
  });

  it('supports tiny sample rates without fading artefacts', () => {
    const context = new FakeContext(5);
    const buffer = createCricketChorusBuffer(context);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('buffer helpers', () => {
  it('applies loop fades when requested', () => {
    const data = new Float32Array([1, 1, 1, 1, 1, 1]);
    _applyLoopFades(data, 2);
    expect(data[0]).toBe(0);
    expect(data[1]).toBeCloseTo(0.5, 5);
    expect(data.at(-1)).toBe(0);
  });

  it('skips fades when fadeSamples is zero', () => {
    const data = new Float32Array([1, 1, 1]);
    _applyLoopFades(data, 0);
    expect(Array.from(data)).toEqual([1, 1, 1]);
  });

  it('normalizes content to requested amplitude', () => {
    const data = new Float32Array([0.2, -0.4, 0.1]);
    _normalizeBuffer(data, 0.5);
    const maxAbs = data.reduce(
      (acc, value) => Math.max(acc, Math.abs(value)),
      0
    );
    expect(maxAbs).toBeCloseTo(0.5, 5);
    expect(Math.min(...data)).toBeCloseTo(-0.5, 5);
  });

  it('leaves silent buffers untouched', () => {
    const data = new Float32Array([0, 0, 0]);
    _normalizeBuffer(data, 0.5);
    expect(Array.from(data)).toEqual([0, 0, 0]);
  });
});
