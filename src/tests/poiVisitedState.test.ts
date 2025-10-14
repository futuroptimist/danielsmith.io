import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';

import { PoiVisitedState } from '../scene/poi/visitedState';

describe('PoiVisitedState', () => {
  const storageKey = 'test::visited';
  let warnings: SpyInstance<
    [message?: unknown, ...optionalParams: unknown[]],
    void
  >;

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

  it('clears visited entries and storage when reset is called without arguments', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    const listener = vi.fn();
    state.subscribe(listener);

    state.markVisited('flywheel-studio-flywheel');
    state.markVisited('jobbot-studio-terminal');

    listener.mockClear();
    storage.setItem.mockClear();

    state.reset();

    expect(storage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify([])
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(new Set());
    expect(state.snapshot().size).toBe(0);
  });

  it('replaces visited entries when reset receives a new list', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    const listener = vi.fn();
    state.subscribe(listener);

    state.markVisited('flywheel-studio-flywheel');
    state.markVisited('jobbot-studio-terminal');

    listener.mockClear();
    storage.setItem.mockClear();

    state.reset([
      'dspace-backyard-rocket',
      'futuroptimist-living-room-tv',
      'dspace-backyard-rocket',
      42 as unknown as string,
    ]);

    expect(storage.setItem).toHaveBeenLastCalledWith(
      storageKey,
      JSON.stringify(['dspace-backyard-rocket', 'futuroptimist-living-room-tv'])
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      new Set(['dspace-backyard-rocket', 'futuroptimist-living-room-tv'])
    );
    expect(state.snapshot()).toEqual(
      new Set(['dspace-backyard-rocket', 'futuroptimist-living-room-tv'])
    );
  });

  it('skips persistence when reset receives the same visited ids', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const state = new PoiVisitedState({ storage, storageKey });
    const listener = vi.fn();
    state.subscribe(listener);

    state.markVisited('flywheel-studio-flywheel');
    state.markVisited('jobbot-studio-terminal');

    listener.mockClear();
    storage.setItem.mockClear();

    state.reset(['jobbot-studio-terminal', 'flywheel-studio-flywheel']);

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(state.snapshot()).toEqual(
      new Set(['flywheel-studio-flywheel', 'jobbot-studio-terminal'])
    );
  });

  it('falls back to sessionStorage when localStorage access is blocked', () => {
    const localError = new Error('denied');
    const sessionStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    } satisfies Pick<Storage, 'getItem' | 'setItem'>;

    const windowStub = {} as Window;
    Object.defineProperty(windowStub, 'localStorage', {
      configurable: true,
      get() {
        throw localError;
      },
    });
    Object.defineProperty(windowStub, 'sessionStorage', {
      configurable: true,
      get() {
        return sessionStorage as unknown as Storage;
      },
    });

    const originalWindow = Reflect.get(globalThis, 'window') as
      | Window
      | undefined;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: windowStub,
    });

    const state = new PoiVisitedState({ storageKey });
    state.markVisited('flywheel-studio-flywheel');

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(['flywheel-studio-flywheel'])
    );
    expect(warnings).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenLastCalledWith(
      'Accessing localStorage failed, continuing without persistence.',
      localError
    );

    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
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
    const originalWindow = Reflect.get(globalThis, 'window') as
      | Window
      | undefined;
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

    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    } else {
      expect(Reflect.deleteProperty(globalThis, 'window')).toBe(true);
    }
    expect(state.snapshot().size).toBe(0);
  });
});
