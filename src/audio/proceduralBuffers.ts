export interface AudioBufferLike {
  readonly length: number;
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export interface BufferContext {
  sampleRate: number;
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ): AudioBufferLike;
}

function applyLoopFades(data: Float32Array, fadeSamples: number): void {
  if (fadeSamples <= 0) {
    return;
  }
  const limit = Math.min(fadeSamples, Math.floor(data.length / 2));
  for (let i = 0; i < limit; i += 1) {
    const fadeIn = i / limit;
    const fadeOut = (limit - i) / limit;
    data[i] *= fadeIn;
    data[data.length - 1 - i] *= fadeOut;
  }
  if (data.length > 0) {
    data[0] = 0;
    data[data.length - 1] = 0;
  }
}

function normalizeBuffer(data: Float32Array, maxAmplitude: number): void {
  if (maxAmplitude <= 0) {
    return;
  }
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak === 0) {
    return;
  }
  const scale = maxAmplitude / peak;
  for (let i = 0; i < data.length; i += 1) {
    data[i] *= scale;
  }
}

export function createCricketChorusBuffer<T extends BufferContext>(
  context: T
): ReturnType<T['createBuffer']> {
  const durationSeconds = 6;
  const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  const chirpInterval = 0.9;
  const chirpDuration = 0.12;
  const chirpsPerCycle = 3;
  const baseFrequency = 4200;

  for (let i = 0; i < data.length; i += 1) {
    const t = i / context.sampleRate;
    const cycleTime = t % chirpInterval;
    let sample = 0;
    for (let chirpIndex = 0; chirpIndex < chirpsPerCycle; chirpIndex += 1) {
      const chirpStart = chirpIndex * (chirpDuration * 0.7);
      const chirpEnd = chirpStart + chirpDuration;
      if (cycleTime >= chirpStart && cycleTime < chirpEnd) {
        const localTime = cycleTime - chirpStart;
        const envelope = Math.sin((Math.PI * localTime) / chirpDuration) ** 2;
        const harmonicSpread = 1 + chirpIndex * 0.08;
        sample +=
          envelope *
          (Math.sin(2 * Math.PI * baseFrequency * harmonicSpread * t) * 0.7 +
            Math.sin(2 * Math.PI * baseFrequency * 0.5 * harmonicSpread * t) *
              0.3);
      }
    }
    const duskBed = Math.sin(2 * Math.PI * 1.2 * t) * 0.12;
    data[i] = sample * 0.25 + duskBed;
  }

  applyLoopFades(data, Math.floor(context.sampleRate * 0.1));
  normalizeBuffer(data, 0.9);
  return buffer;
}

export function createDistantHumBuffer<T extends BufferContext>(
  context: T
): ReturnType<T['createBuffer']> {
  const durationSeconds = 8;
  const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const t = i / context.sampleRate;
    const fundamental = Math.sin(2 * Math.PI * 58 * t);
    const harmonic = Math.sin(2 * Math.PI * 116 * t) * 0.4;
    const airy = Math.sin(2 * Math.PI * 240 * t) * 0.18;
    const slowDrift = Math.sin(2 * Math.PI * 0.25 * t) * 0.15;
    const shimmer = Math.sin(2 * Math.PI * 12 * t) * 0.05;
    data[i] = fundamental * 0.6 + harmonic + airy + slowDrift + shimmer;
  }

  applyLoopFades(data, Math.floor(context.sampleRate * 0.2));
  normalizeBuffer(data, 0.7);
  return buffer;
}

export {
  applyLoopFades as _applyLoopFades,
  normalizeBuffer as _normalizeBuffer,
};
