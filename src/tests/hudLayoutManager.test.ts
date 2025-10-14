import { describe, expect, it, vi } from 'vitest';

import { createHudLayoutManager, type HudLayout } from '../ui/hud/layoutManager';

type Listener<T> = (event: T) => void;

const createWindowStub = (initialWidth = 1024) => {
  const listeners = new Map<string, Set<Listener<unknown>>>();

  return {
    innerWidth: initialWidth,
    addEventListener(type: string, listener: Listener<unknown>) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: Listener<unknown>) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string, event: unknown = {}) {
      listeners.get(type)?.forEach((listener) => listener(event));
    },
  };
};

interface MediaQueryStub
  extends Pick<MediaQueryList, 'media'>,
    Record<string, unknown> {
  matches: boolean;
  trigger(next: boolean): void;
}

const createMediaQueryStub = (
  initialMatches: boolean,
  { legacy = false }: { legacy?: boolean } = {}
) => {
  let matches = initialMatches;
  const listeners = new Set<Listener<MediaQueryListEvent>>();

  const notify = () => {
    const event = { matches } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  };

  const stub: Partial<MediaQueryStub> = {
    media: '',
    trigger(next: boolean) {
      matches = next;
      notify();
    },
  };

  Object.defineProperty(stub, 'matches', {
    get: () => matches,
  });

  if (legacy) {
    const addListener = vi.fn((listener: Listener<MediaQueryListEvent>) => {
      listeners.add(listener);
    });
    const removeListener = vi.fn((listener: Listener<MediaQueryListEvent>) => {
      listeners.delete(listener);
    });
    Object.assign(stub, {
      addListener,
      removeListener,
    });
  } else {
    Object.assign(stub, {
      addEventListener: (
        _type: string,
        listener: Listener<MediaQueryListEvent>
      ) => {
        listeners.add(listener);
      },
      removeEventListener: (
        _type: string,
        listener: Listener<MediaQueryListEvent>
      ) => {
        listeners.delete(listener);
      },
    });
  }

  return stub as MediaQueryList & MediaQueryStub;
};

describe('createHudLayoutManager', () => {
  it('responds to media queries and emits layout changes', () => {
    const pointerQuery = createMediaQueryStub(false);
    const widthQuery = createMediaQueryStub(false);
    const matchMedia = vi.fn((query: string) =>
      query.includes('hover') ? pointerQuery : widthQuery
    );
    const windowStub = createWindowStub();
    const root = document.createElement('div');
    const layouts: HudLayout[] = [];

    const manager = createHudLayoutManager({
      root,
      windowTarget: windowStub as unknown as Window,
      matchMedia,
      onLayoutChange: (layout) => {
        layouts.push(layout);
      },
    });

    expect(root.dataset.hudLayout).toBe('desktop');

    pointerQuery.trigger(true);
    expect(root.dataset.hudLayout).toBe('mobile');

    pointerQuery.trigger(false);
    expect(root.dataset.hudLayout).toBe('desktop');

    widthQuery.trigger(true);
    expect(root.dataset.hudLayout).toBe('mobile');

    widthQuery.trigger(false);
    expect(root.dataset.hudLayout).toBe('desktop');
    expect(layouts).toEqual(['mobile', 'desktop', 'mobile', 'desktop']);
    expect(manager.getLayout()).toBe('desktop');

    manager.dispose();
  });

  it('prefers mobile layout after touch pointer interactions', () => {
    const pointerQuery = createMediaQueryStub(false);
    const widthQuery = createMediaQueryStub(false);
    const matchMedia = vi.fn((query: string) =>
      query.includes('hover') ? pointerQuery : widthQuery
    );
    const windowStub = createWindowStub();
    const root = document.createElement('div');

    const manager = createHudLayoutManager({
      root,
      windowTarget: windowStub as unknown as Window,
      matchMedia,
    });

    expect(manager.getLayout()).toBe('desktop');

    windowStub.dispatch('pointerdown', {
      pointerType: 'touch',
    } as PointerEvent);

    expect(root.dataset.hudLayout).toBe('mobile');

    windowStub.dispatch('pointerdown', {
      pointerType: 'mouse',
    } as PointerEvent);

    expect(root.dataset.hudLayout).toBe('desktop');

    manager.dispose();
  });

  it('uses viewport width when matchMedia is unavailable and cleans up on dispose', () => {
    const windowStub = createWindowStub(540);
    const root = document.createElement('div');

    const manager = createHudLayoutManager({
      root,
      windowTarget: windowStub as unknown as Window,
      matchMedia: undefined,
      mobileBreakpoint: 720,
    });

    expect(root.dataset.hudLayout).toBe('mobile');

    windowStub.innerWidth = 900;
    windowStub.dispatch('resize');

    expect(root.dataset.hudLayout).toBe('desktop');

    manager.dispose();
    expect(root.dataset.hudLayout).toBeUndefined();

    windowStub.dispatch('resize');
    expect(root.dataset.hudLayout).toBeUndefined();
  });

  it('supports legacy media query listeners', () => {
    const pointerQuery = createMediaQueryStub(false, { legacy: true });
    const widthQuery = createMediaQueryStub(false, { legacy: true });
    const matchMedia = vi.fn((query: string) =>
      query.includes('hover') ? pointerQuery : widthQuery
    );
    const windowStub = createWindowStub();
    const root = document.createElement('div');

    const manager = createHudLayoutManager({
      root,
      windowTarget: windowStub as unknown as Window,
      matchMedia,
    });

    pointerQuery.trigger(true);
    expect(root.dataset.hudLayout).toBe('mobile');

    manager.dispose();

    expect(pointerQuery.removeListener).toHaveBeenCalled();
    expect(widthQuery.removeListener).toHaveBeenCalled();

    pointerQuery.trigger(false);
    expect(root.dataset.hudLayout).toBeUndefined();
  });
});
