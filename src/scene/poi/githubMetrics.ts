import type {
  GitHubRepoStats,
  GitHubRepoStatsService,
} from '../../systems/github/repoStats';

import type {
  PoiDefinition,
  PoiId,
  PoiMetric,
  PoiMetricGitHubStarsSource,
  PoiMetricSource,
} from './types';

interface MetricEntry {
  poi: PoiDefinition;
  metric: PoiMetric;
  source: PoiMetricGitHubStarsSource;
}

interface RepoBucket {
  identifier: { owner: string; repo: string };
  entries: MetricEntry[];
  lastStars?: number;
}

export interface WireGitHubRepoMetricsOptions {
  definitions: PoiDefinition[];
  service: GitHubRepoStatsService;
  onMetricsUpdated?(poiId: PoiId): void;
  onRepoStatsUpdated?(update: {
    poiId: PoiId;
    source: PoiMetricGitHubStarsSource;
    stats: GitHubRepoStats;
  }): void;
}

export interface GitHubRepoMetricsController {
  refreshAll(): Promise<void>;
  dispose(): void;
}

const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const standardNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const clampStars = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

const formatStars = (
  count: number,
  source: PoiMetricGitHubStarsSource
): string => {
  const normalized = clampStars(count);
  const formatter =
    source.format === 'standard'
      ? standardNumberFormatter
      : compactNumberFormatter;
  const formatted = formatter.format(normalized);
  if (source.template) {
    return source.template.replace('{value}', formatted);
  }
  return formatted;
};

const isGitHubStarsSource = (
  source: PoiMetricSource | undefined
): source is PoiMetricGitHubStarsSource =>
  !!source && source.type === 'githubStars';

export function wireGitHubRepoMetrics({
  definitions,
  service,
  onMetricsUpdated,
  onRepoStatsUpdated,
}: WireGitHubRepoMetricsOptions): GitHubRepoMetricsController {
  const repoMap = new Map<string, RepoBucket>();
  const disposables: Array<() => void> = [];

  const getBucket = (source: PoiMetricGitHubStarsSource): RepoBucket => {
    const key = `${source.owner.toLowerCase()}/${source.repo.toLowerCase()}`;
    let bucket = repoMap.get(key);
    if (!bucket) {
      bucket = {
        identifier: { owner: source.owner, repo: source.repo },
        entries: [],
      };
      repoMap.set(key, bucket);
    }
    return bucket;
  };

  definitions.forEach((poi) => {
    poi.metrics?.forEach((metric) => {
      if (!isGitHubStarsSource(metric.source)) {
        return;
      }
      const fallback = metric.source.fallback ?? metric.value;
      if (fallback) {
        metric.value = fallback;
      }
      if (metric.source.visibility === 'private') {
        return;
      }
      const bucket = getBucket(metric.source);
      bucket.entries.push({ poi, metric, source: metric.source });
      const cached = service.getCachedStats(bucket.identifier);
      if (cached) {
        metric.value = formatStars(cached.stars, metric.source);
        bucket.lastStars = cached.stars;
        onRepoStatsUpdated?.({
          poiId: poi.id,
          source: metric.source,
          stats: cached,
        });
      }
    });
  });

  repoMap.forEach((bucket) => {
    const unsubscribe = service.subscribe(bucket.identifier, (stats) => {
      const previousStars = bucket.lastStars;
      bucket.lastStars = stats.stars;
      const starChanged = previousStars !== stats.stars;
      const updated = new Set<PoiId>();
      bucket.entries.forEach(({ poi, metric, source }) => {
        metric.value = formatStars(stats.stars, source);
        updated.add(poi.id);
        if (starChanged) {
          onRepoStatsUpdated?.({ poiId: poi.id, source, stats });
        }
      });
      if (onMetricsUpdated) {
        updated.forEach((poiId) => onMetricsUpdated(poiId));
      }
    });
    disposables.push(unsubscribe);
  });

  const refreshAll = async () => {
    await Promise.all(
      Array.from(repoMap.values()).map((bucket) =>
        service.requestStats(bucket.identifier)
      )
    );
  };

  const dispose = () => {
    disposables.splice(0).forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
  };

  return {
    refreshAll,
    dispose,
  };
}
