export const DEBUG_ID_MIN_LENGTH = 4;
export const DEBUG_ID_MAX_LENGTH = 6;
export const DEBUG_ID_PRECISION = 2;

export const roundDebugValue = (value: number): number =>
  Math.round(value * 10 ** DEBUG_ID_PRECISION) / 10 ** DEBUG_ID_PRECISION;

export const getStableDebugHashValue = (input: string): number => {
  let low = 0xdeadbeef ^ input.length;
  let high = 0x41c6ce57 ^ input.length;

  for (let index = 0; index < input.length; index += 1) {
    const charCode = input.charCodeAt(index);
    low = Math.imul(low ^ charCode, 2_654_435_761);
    high = Math.imul(high ^ charCode, 1_597_334_677);
  }

  low = Math.imul(low ^ (low >>> 16), 2_246_822_507);
  low ^= Math.imul(high ^ (high >>> 13), 3_266_489_909);
  high = Math.imul(high ^ (high >>> 16), 2_246_822_507);
  high ^= Math.imul(low ^ (low >>> 13), 3_266_489_909);

  return 4_294_967_296 * (2_097_151 & high) + (low >>> 0);
};

export const getDebugHash = (seed: string): string =>
  Math.floor(getStableDebugHashValue(seed) % 0x1000000)
    .toString(16)
    .toUpperCase()
    .padStart(DEBUG_ID_MAX_LENGTH, '0');

export const getDebugIdCandidates = (seed: string): string[] => {
  const hash = getDebugHash(seed);
  const candidates: string[] = [];
  for (
    let length = DEBUG_ID_MIN_LENGTH;
    length <= DEBUG_ID_MAX_LENGTH;
    length += 1
  ) {
    candidates.push(hash.slice(0, length));
  }
  return candidates;
};

export const allocateDebugId = (
  primaryCandidate: string,
  retrySeed: string,
  usedIds: ReadonlySet<string>
): string => {
  if (!usedIds.has(primaryCandidate)) {
    return primaryCandidate;
  }

  for (
    let retryIndex = 1;
    retryIndex < Number.MAX_SAFE_INTEGER;
    retryIndex += 1
  ) {
    for (const candidate of getDebugIdCandidates(
      `${retrySeed}|retry:${retryIndex}`
    )) {
      if (!usedIds.has(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error('Unable to allocate a short debug ID');
};
