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

interface BiquadCoefficients {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

interface CricketVoice {
  readonly interval: number;
  readonly chirpsPerCycle: number;
  readonly chirpDuration: number;
  readonly separation: number;
  readonly offset: number;
  readonly gain: number;
  readonly stridulationHz: number;
  readonly microDrift: number;
  readonly decayRate: number;
  readonly prng: () => number;
  readonly filterCoefficients: BiquadCoefficients;
  readonly filterState: BiquadState;
}

function createPrng(seed: number): () => number {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function createBandPassCoefficients(
  sampleRate: number,
  centerFrequency: number,
  q: number
): BiquadCoefficients {
  const omega = (2 * Math.PI * centerFrequency) / sampleRate;
  const sinOmega = Math.sin(omega);
  const cosOmega = Math.cos(omega);
  const alpha = sinOmega / (2 * q);
  const invA0 = 1 / (1 + alpha);
  return {
    b0: alpha * invA0,
    b1: 0,
    b2: -alpha * invA0,
    a1: -2 * cosOmega * invA0,
    a2: (1 - alpha) * invA0,
  };
}

function processBiquad(
  state: BiquadState,
  coefficients: BiquadCoefficients,
  input: number
): number {
  const output =
    coefficients.b0 * input +
    coefficients.b1 * state.x1 +
    coefficients.b2 * state.x2 -
    coefficients.a1 * state.y1 -
    coefficients.a2 * state.y2;
  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = output;
  return output;
}

function createCricketVoice(
  sampleRate: number,
  seed: number,
  {
    interval,
    chirpsPerCycle,
    chirpDuration,
    separation,
    offset,
    gain,
    stridulationHz,
    microDrift,
    decayRate,
    centerFrequency,
    q,
  }: {
    interval: number;
    chirpsPerCycle: number;
    chirpDuration: number;
    separation: number;
    offset: number;
    gain: number;
    stridulationHz: number;
    microDrift: number;
    decayRate: number;
    centerFrequency: number;
    q: number;
  }
): CricketVoice {
  return {
    interval,
    chirpsPerCycle,
    chirpDuration,
    separation,
    offset,
    gain,
    stridulationHz,
    microDrift,
    decayRate,
    prng: createPrng(seed),
    filterCoefficients: createBandPassCoefficients(sampleRate, centerFrequency, q),
    filterState: { x1: 0, x2: 0, y1: 0, y2: 0 },
  };
}

function computeChirpEnvelope(
  timeInChirp: number,
  duration: number,
  decayRate: number
): number {
  if (timeInChirp < 0 || timeInChirp >= duration) {
    return 0;
  }
  const phase = timeInChirp / duration;
  const shaped = Math.sin(Math.PI * phase) ** 2;
  const decay = Math.exp(-timeInChirp * decayRate);
  return shaped * decay;
}

export function createCricketChorusBuffer<T extends BufferContext>(
  context: T
): ReturnType<T['createBuffer']> {
  const durationSeconds = 6;
  const length = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  const voices: CricketVoice[] = [
    createCricketVoice(context.sampleRate, 1337, {
      interval: 0.92,
      chirpsPerCycle: 3,
      chirpDuration: 0.085,
      separation: 0.058,
      offset: 0,
      gain: 0.95,
      stridulationHz: 1820,
      microDrift: 90,
      decayRate: 18,
      centerFrequency: 4250,
      q: 8,
    }),
    createCricketVoice(context.sampleRate, 90210, {
      interval: 1.04,
      chirpsPerCycle: 2,
      chirpDuration: 0.095,
      separation: 0.072,
      offset: 0.31,
      gain: 0.7,
      stridulationHz: 1680,
      microDrift: 120,
      decayRate: 16,
      centerFrequency: 3880,
      q: 7.2,
    }),
    createCricketVoice(context.sampleRate, 4711, {
      interval: 0.78,
      chirpsPerCycle: 4,
      chirpDuration: 0.06,
      separation: 0.045,
      offset: 0.53,
      gain: 0.55,
      stridulationHz: 1940,
      microDrift: 60,
      decayRate: 22,
      centerFrequency: 4550,
      q: 9,
    }),
  ];

  for (let i = 0; i < data.length; i += 1) {
    const t = i / context.sampleRate;
    let chorusSample = 0;

    for (const voice of voices) {
      const noise = voice.prng() * 2 - 1;
      const filteredNoise = processBiquad(voice.filterState, voice.filterCoefficients, noise);
      const voiceTime = (t + voice.offset) % voice.interval;
      let voiceSample = 0;

      for (let chirpIndex = 0; chirpIndex < voice.chirpsPerCycle; chirpIndex += 1) {
        const chirpStart = chirpIndex * voice.separation;
        const timeInChirp = voiceTime - chirpStart;
        const envelope = computeChirpEnvelope(
          timeInChirp,
          voice.chirpDuration,
          voice.decayRate
        );
        if (envelope > 0) {
          const fineMotion =
            0.65 +
            0.35 *
              Math.sin(
                2 *
                  Math.PI *
                  (voice.stridulationHz + voice.microDrift * chirpIndex) *
                  Math.max(timeInChirp, 0)
              );
          voiceSample += envelope * fineMotion * filteredNoise;
        }
      }

      chorusSample += voiceSample * voice.gain;
    }

    const duskBed =
      Math.sin(2 * Math.PI * 1.15 * t) * 0.07 +
      Math.sin(2 * Math.PI * 0.23 * t) * 0.05 +
      Math.sin(2 * Math.PI * 3.7 * t) * 0.02;

    data[i] = chorusSample * 0.32 + duskBed;
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
