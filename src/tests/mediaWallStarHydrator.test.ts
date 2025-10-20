import { describe, expect, it, vi } from 'vitest';

import type { LivingRoomMediaWallController } from '../scene/structures/mediaWall';
import { refreshMediaWallStarCount } from '../systems/github/mediaWall';

describe('refreshMediaWallStarCount', () => {
  const createController = () => {
    const controller: LivingRoomMediaWallController = {
      update: vi.fn(),
      setStarCount: vi.fn(),
      dispose: vi.fn(),
    };
    return controller;
  };

  const buildStats = (stars: number) => ({
    stars,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    updatedAt: null,
  });

  it('applies star counts returned by the stats loader', async () => {
    const controller = createController();
    const getStats = vi.fn(async () => buildStats(2345));

    const result = await refreshMediaWallStarCount(controller, { getStats });

    expect(result).toBe(2345);
    expect(controller.setStarCount).toHaveBeenCalledWith(2345);
  });

  it('uses fallback counts when the stats loader returns an invalid value', async () => {
    const controller = createController();
    const getStats = vi.fn(async () => buildStats(Number.NaN));

    const result = await refreshMediaWallStarCount(controller, {
      getStats,
      fallbackStarCount: 1280,
    });

    expect(result).toBe(1280);
    expect(controller.setStarCount).toHaveBeenCalledWith(1280);
  });

  it('skips updates when the stats loader produces an invalid value without fallback', async () => {
    const controller = createController();
    const getStats = vi.fn(async () => buildStats(-10));

    const result = await refreshMediaWallStarCount(controller, { getStats });

    expect(result).toBeNull();
    expect(controller.setStarCount).not.toHaveBeenCalled();
  });

  it('logs warnings and applies sanitized fallbacks when fetching fails', async () => {
    const controller = createController();
    const warningLogger = { warn: vi.fn() };
    const getStats = vi.fn(async () => {
      throw new Error('network unavailable');
    });

    const result = await refreshMediaWallStarCount(controller, {
      getStats,
      fallbackStarCount: -24,
      logger: warningLogger,
    });

    expect(result).toBe(0);
    expect(controller.setStarCount).toHaveBeenCalledWith(0);
    expect(warningLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to refresh media wall stars for futuroptimist/'
      ),
      expect.any(Error)
    );
  });

  it('propagates failures without fallbacks by leaving the controller untouched', async () => {
    const controller = createController();
    const getStats = vi.fn(async () => {
      throw new Error('timeout');
    });

    const result = await refreshMediaWallStarCount(controller, { getStats });

    expect(result).toBeNull();
    expect(controller.setStarCount).not.toHaveBeenCalled();
  });

  it('respects abort signals before loading begins', async () => {
    const controller = createController();
    const getStats = vi.fn();
    const abortController = new AbortController();
    abortController.abort();

    const result = await refreshMediaWallStarCount(controller, {
      getStats,
      signal: abortController.signal,
    });

    expect(result).toBeNull();
    expect(getStats).not.toHaveBeenCalled();
    expect(controller.setStarCount).not.toHaveBeenCalled();
  });

  it('cancels updates if the signal aborts after stats resolve', async () => {
    const controller = createController();
    const abortController = new AbortController();
    const getStats = vi.fn(async () => {
      abortController.abort();
      return buildStats(512);
    });

    const result = await refreshMediaWallStarCount(controller, {
      getStats,
      signal: abortController.signal,
    });

    expect(result).toBeNull();
    expect(controller.setStarCount).not.toHaveBeenCalled();
  });
});
