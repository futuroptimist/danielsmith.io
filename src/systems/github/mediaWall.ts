import type { LivingRoomMediaWallController } from '../../scene/structures/mediaWall';

import { getGitHubRepoStats } from './repoStats';

export interface RefreshMediaWallStarCountOptions {
  owner?: string;
  repo?: string;
  fallbackStarCount?: number;
  getStats?: typeof getGitHubRepoStats;
  logger?: Pick<Console, 'warn'>;
  signal?: AbortSignal;
}

const sanitizeStarCount = (
  value: unknown,
  fallback?: number
): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (
    typeof fallback === 'number' &&
    Number.isFinite(fallback) &&
    fallback >= 0
  ) {
    return fallback;
  }
  return null;
};

const sanitizeFallback = (fallback: number): number =>
  Number.isFinite(fallback) && fallback > 0 ? fallback : 0;

export async function refreshMediaWallStarCount(
  controller: LivingRoomMediaWallController,
  options: RefreshMediaWallStarCountOptions = {}
): Promise<number | null> {
  const owner = (options.owner ?? 'futuroptimist').trim();
  const repo = (options.repo ?? 'futuroptimist').trim();
  const getStats = options.getStats ?? getGitHubRepoStats;
  const fallback = options.fallbackStarCount;
  const { signal } = options;

  if (signal?.aborted) {
    return null;
  }

  if (!owner || !repo) {
    if (typeof fallback === 'number') {
      const sanitizedFallback = sanitizeFallback(fallback);
      controller.setStarCount(sanitizedFallback);
      return sanitizedFallback;
    }
    return null;
  }

  try {
    const stats = await getStats({ owner, repo, signal });
    if (signal?.aborted) {
      return null;
    }
    const starCount = sanitizeStarCount(stats.stars, fallback);
    if (starCount === null) {
      return null;
    }
    controller.setStarCount(starCount);
    return starCount;
  } catch (error) {
    if (signal?.aborted) {
      return null;
    }
    if (options.logger?.warn) {
      options.logger.warn(
        `Failed to refresh media wall stars for ${owner}/${repo}`,
        error
      );
    }
    if (typeof fallback === 'number') {
      const sanitizedFallback = sanitizeFallback(fallback);
      controller.setStarCount(sanitizedFallback);
      return sanitizedFallback;
    }
    return null;
  }
}
