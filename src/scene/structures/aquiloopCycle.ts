/** Fictional exhibit bookkeeping, in US gallons. Never controls hardware. */
export const AQUILOOP = {
  tankGallons: 150,
  exchangeFraction: 0.2,
  bucketsPerBank: 8,
  bucketCapacity: 5,
  bucketWorkingVolume: 3.75,
  intervalSeconds: 300,
  drainSeconds: 30,
  refillSeconds: 30,
  replenishSeconds: 30,
} as const;

export type AquiloopPhase = 'idle' | 'drain' | 'refill' | 'replenish';
export function sampleAquiloopCycle(seconds: number) {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  // First drain starts at five minutes; subsequent starts are five minutes apart.
  const local = t < 300 ? -1 : (t - 300) % AQUILOOP.intervalSeconds;
  const exchange = Math.min(
    AQUILOOP.tankGallons * AQUILOOP.exchangeFraction,
    AQUILOOP.bucketsPerBank * AQUILOOP.bucketWorkingVolume
  );
  let phase: AquiloopPhase = 'idle';
  let removed = 0;
  let received = 0;
  let supplied = 0;
  if (local >= 0 && local < 30) {
    phase = 'drain';
    removed = received = exchange * (local / 30);
  } else if (local >= 30 && local < 60) {
    phase = 'refill';
    supplied = exchange * ((local - 30) / 30);
    received = exchange;
    removed = exchange - supplied;
  } else if (local >= 60 && local < 90) {
    phase = 'replenish';
    // Explicit game-only exchange service: equal waste out / fresh water in.
    received = supplied = exchange * (1 - (local - 60) / 30);
  }
  return {
    phase,
    tankGallons: AQUILOOP.tankGallons - removed,
    waterHeightFraction: 1 - removed / AQUILOOP.tankGallons,
    receiverGallons: received / AQUILOOP.bucketsPerBank,
    supplyGallons:
      AQUILOOP.bucketWorkingVolume - supplied / AQUILOOP.bucketsPerBank,
  };
}

/** Active time only: hidden/paused samples reset the baseline, never catch up. */
export function createAquiloopClock() {
  let elapsed = 0;
  let previous: number | null = null;
  return {
    sample(nowSeconds: number, running = true) {
      if (!Number.isFinite(nowSeconds)) return sampleAquiloopCycle(elapsed);
      if (running && previous !== null)
        elapsed += Math.max(0, nowSeconds - previous);
      previous = running ? nowSeconds : null;
      return sampleAquiloopCycle(elapsed);
    },
    suspend() {
      previous = null;
    },
    get elapsed() {
      return elapsed;
    },
  };
}
