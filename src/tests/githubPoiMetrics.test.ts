import { describe, expect, it } from 'vitest';

import { wireGitHubRepoMetrics } from '../scene/poi/githubMetrics';
import type { PoiDefinition } from '../scene/poi/types';
import type {
  GitHubRepoIdentifier,
  GitHubRepoStats,
  GitHubRepoStatsListener,
  GitHubRepoStatsService,
} from '../systems/github/repoStats';

class MockRepoStatsService implements GitHubRepoStatsService {
  private readonly listeners = new Map<string, GitHubRepoStatsListener[]>();
  private readonly cache = new Map<string, GitHubRepoStats>();
  readonly requested: string[] = [];

  private key(identifier: GitHubRepoIdentifier): string {
    return `${identifier.owner}/${identifier.repo}`.toLowerCase();
  }

  getCachedStats(identifier: GitHubRepoIdentifier): GitHubRepoStats | null {
    return this.cache.get(this.key(identifier)) ?? null;
  }

  requestStats(
    identifier: GitHubRepoIdentifier
  ): Promise<GitHubRepoStats | null> {
    const key = this.key(identifier);
    this.requested.push(key);
    return Promise.resolve(this.cache.get(key) ?? null);
  }

  subscribe(
    identifier: GitHubRepoIdentifier,
    listener: GitHubRepoStatsListener
  ): () => void {
    const key = this.key(identifier);
    const bucket = this.listeners.get(key);
    if (bucket) {
      bucket.push(listener);
    } else {
      this.listeners.set(key, [listener]);
    }
    const cached = this.cache.get(key);
    if (cached) {
      queueMicrotask(() => listener(cached));
    }
    return () => {
      const listeners = this.listeners.get(key);
      if (!listeners) {
        return;
      }
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this.listeners.delete(key);
      }
    };
  }

  emit(identifier: GitHubRepoIdentifier, stats: GitHubRepoStats) {
    const key = this.key(identifier);
    this.cache.set(key, stats);
    const listeners = this.listeners.get(key);
    if (!listeners) {
      return;
    }
    listeners.slice().forEach((listener) => listener(stats));
  }

  listenerCount(identifier: GitHubRepoIdentifier): number {
    return this.listeners.get(this.key(identifier))?.length ?? 0;
  }
}

const createPoi = (
  overrides: Partial<PoiDefinition> & { id: PoiDefinition['id'] }
): PoiDefinition => ({
  id: overrides.id,
  title: overrides.title ?? 'Test POI',
  summary:
    overrides.summary ??
    'Interactive exhibit used to validate live GitHub metric wiring.',
  interactionPrompt: overrides.interactionPrompt ?? 'Inspect exhibit',
  category: overrides.category ?? 'project',
  interaction: overrides.interaction ?? 'inspect',
  roomId: overrides.roomId ?? 'studio',
  position: overrides.position ?? { x: 0, y: 0, z: 0 },
  headingRadians: overrides.headingRadians ?? 0,
  interactionRadius: overrides.interactionRadius ?? 2.5,
  footprint: overrides.footprint ?? { width: 2, depth: 2 },
  outcome: overrides.outcome,
  metrics: overrides.metrics,
  links: overrides.links,
  status: overrides.status,
  narration: overrides.narration,
});

describe('wireGitHubRepoMetrics', () => {
  it('refreshes POI metrics when GitHub stats resolve', async () => {
    const definitions: PoiDefinition[] = [
      createPoi({
        id: 'flywheel-studio-flywheel',
        metrics: [
          {
            label: 'Stars',
            value: 'Fallback',
            source: {
              type: 'githubStars',
              owner: 'futuroptimist',
              repo: 'flywheel',
              format: 'standard',
              template: '{value} stars',
              fallback: 'Fallback',
            },
          },
          { label: 'Automation', value: 'CI scaffolds' },
        ],
      }),
      createPoi({
        id: 'jobbot-studio-terminal',
        metrics: [
          {
            label: 'Stars',
            value: 'Pending',
            source: {
              type: 'githubStars',
              owner: 'futuroptimist',
              repo: 'flywheel',
              format: 'compact',
              template: '{value} stars',
              fallback: 'Pending',
            },
          },
        ],
      }),
      createPoi({
        id: 'axel-studio-tracker',
        metrics: [
          {
            label: 'Stars',
            value: 'Awaiting',
            source: {
              type: 'githubStars',
              owner: 'futuroptimist',
              repo: 'axel',
              template: '{value} stars',
              fallback: 'Awaiting',
            },
          },
        ],
      }),
      createPoi({
        id: 'dspace-backyard-rocket',
        metrics: [
          {
            label: 'Stars',
            value: 'Hidden',
            source: {
              type: 'githubStars',
              owner: 'futuroptimist',
              repo: 'dspace',
              visibility: 'private',
              fallback: 'Hidden',
            },
          },
        ],
      }),
    ];

    const service = new MockRepoStatsService();
    const updated: string[] = [];
    const controller = wireGitHubRepoMetrics({
      definitions,
      service,
      onMetricsUpdated: (poiId) => updated.push(poiId),
    });

    await controller.refreshAll();
    expect(service.requested).toEqual([
      'futuroptimist/flywheel',
      'futuroptimist/axel',
    ]);
    expect(definitions[3].metrics?.[0]?.value).toBe('Hidden');

    service.emit(
      { owner: 'futuroptimist', repo: 'flywheel' },
      { stars: 1532, watchers: 0, forks: 0, openIssues: 0, pushedAt: null }
    );

    expect(definitions[0].metrics?.[0]?.value).toBe('1,532 stars');
    expect(definitions[1].metrics?.[0]?.value).toMatch(/1\.5/i);
    expect(definitions[1].metrics?.[0]?.value).toContain('stars');
    expect(updated).toEqual([
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
    ]);

    service.emit(
      { owner: 'futuroptimist', repo: 'axel' },
      { stars: 86, watchers: 0, forks: 0, openIssues: 0, pushedAt: null }
    );
    expect(definitions[2].metrics?.[0]?.value).toBe('86 stars');
    expect(
      service.listenerCount({ owner: 'futuroptimist', repo: 'dspace' })
    ).toBe(0);

    controller.dispose();
    expect(
      service.listenerCount({ owner: 'futuroptimist', repo: 'flywheel' })
    ).toBe(0);
    const previousUpdates = updated.length;
    service.emit(
      { owner: 'futuroptimist', repo: 'flywheel' },
      { stars: 2000, watchers: 0, forks: 0, openIssues: 0, pushedAt: null }
    );
    expect(updated).toHaveLength(previousUpdates);
  });
});
