import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PoiVisitedState } from '../poi/visitedState';

describe('PoiVisitedState', () => {
  const storageKey = 'test::visited';
  let warnings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnings.mockRestore();
  });

  it('loads visited ids from storage and deduplicates entries', () => {
    const storage = {
      getItem: vi
        .fn()
        .mockReturnValue(
          JSON.stringify([
            'futuroptimist-living-room-tv',
            'flywheel-studio-flywheel',
            'flywheel-studio-flywheel',
          ])
        ),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    expect(storage.getItem).toHaveBeenCalledWith(storageKey);
    expect(state.isVisited('futuroptimist-living-room-tv')).toBe(true);
    expect(state.isVisited('flywheel-studio-flywheel')).toBe(true);
    expect(state.snapshot().size).toBe(2);
    expect(warnings).not.toHaveBeenCalled();
  });

  it('ignores malformed storage payloads gracefully', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue('{bad-json'),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    expect(state.snapshot().size).toBe(0);
    expect(warnings).toHaveBeenCalledWith(
      'Failed to load visited POIs from storage.',
      expect.any(SyntaxError)
    );
  });

  it('persists new visits and notifies subscribers once per change', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(new Set());

    state.markVisited('dspace-backyard-rocket');
    expect(storage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(['dspace-backyard-rocket'])
    );
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      new Set(['dspace-backyard-rocket'])
    );

    state.markVisited('dspace-backyard-rocket');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    state.markVisited('jobbot-studio-terminal');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('suppresses persistence errors when storage is unavailable', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn().mockImplementation(() => {
        throw new Error('quota exceeded');
      }),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    state.markVisited('jobbot-studio-terminal');

    expect(warnings).toHaveBeenLastCalledWith(
      'Failed to persist visited POIs to storage.',
      expect.any(Error)
    );
    expect(state.isVisited('jobbot-studio-terminal')).toBe(true);
  });

  it('operates entirely in-memory when storage is null', () => {
    const state = new PoiVisitedState({ storage: null, storageKey });
    const listener = vi.fn();
    state.subscribe(listener);
    state.markVisited('flywheel-studio-flywheel');

    expect(listener).toHaveBeenCalledTimes(2);
    expect(state.snapshot()).toEqual(new Set(['flywheel-studio-flywheel']));
    expect(warnings).not.toHaveBeenCalled();
  });

  it('handles window.localStorage access errors gracefully', () => {
    const storageError = new Error('denied');
    const windowStub = {} as Window;
    Object.defineProperty(windowStub, 'localStorage', {
      configurable: true,
      get() {
        throw storageError;
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: windowStub,
    });

    const state = new PoiVisitedState({ storageKey });
    expect(state.snapshot().size).toBe(0);
    expect(warnings).toHaveBeenLastCalledWith(
      'Accessing localStorage failed, continuing without persistence.',
      storageError
    );

    expect(Reflect.deleteProperty(globalThis, 'window')).toBe(true);
    expect(state.snapshot().size).toBe(0);
  });
});
