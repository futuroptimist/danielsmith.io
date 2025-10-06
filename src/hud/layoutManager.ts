export type HudLayout = 'desktop' | 'mobile';

export interface HudLayoutManagerHandle {
  getLayout(): HudLayout;
  refresh(): void;
  dispose(): void;
}

export interface HudLayoutManagerOptions {
  root?: HTMLElement;
  windowTarget?: Window;
  matchMedia?: (query: string) => MediaQueryList;
  mobileBreakpoint?: number;
  pointerQuery?: string;
  dataAttribute?: string;
  onLayoutChange?: (layout: HudLayout) => void;
}

type MediaQueryListListener = (event: MediaQueryListEvent) => void;

const DEFAULT_BREAKPOINT = 900;
const DEFAULT_POINTER_QUERY = '(hover: none) and (pointer: coarse)';
const DEFAULT_DATA_ATTRIBUTE = 'hudLayout';

function addMediaQueryListener(
  mediaQueryList: MediaQueryList | null,
  listener: MediaQueryListListener
): () => void {
  if (!mediaQueryList) {
    return () => {
      /* noop */
    };
  }

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', listener);
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(listener);
    return () => {
      mediaQueryList.removeListener(listener);
    };
  }

  return () => {
    /* noop */
  };
}

function setDatasetValue(
  element: HTMLElement,
  key: string,
  value: string
): void {
  (element.dataset as Record<string, string>)[key] = value;
}

export function createHudLayoutManager({
  root = document.documentElement,
  windowTarget = window,
  matchMedia: providedMatchMedia,
  mobileBreakpoint = DEFAULT_BREAKPOINT,
  pointerQuery = DEFAULT_POINTER_QUERY,
  dataAttribute = DEFAULT_DATA_ATTRIBUTE,
  onLayoutChange,
}: HudLayoutManagerOptions = {}): HudLayoutManagerHandle {
  const matchMedia =
    providedMatchMedia ?? windowTarget.matchMedia?.bind(windowTarget) ?? null;

  const pointerMedia = matchMedia ? matchMedia(pointerQuery) : null;
  const widthMedia = matchMedia
    ? matchMedia(`(max-width: ${mobileBreakpoint}px)`)
    : null;

  const mediaListeners: Array<() => void> = [];

  let preferMobileFromTouch = false;
  let layout: HudLayout = 'desktop';

  const computeLayout = (): HudLayout => {
    const pointerMobile = pointerMedia?.matches ?? false;
    const widthMobile =
      widthMedia?.matches ??
      (typeof windowTarget.innerWidth === 'number'
        ? windowTarget.innerWidth <= mobileBreakpoint
        : false);

    const shouldUseMobile =
      preferMobileFromTouch || pointerMobile || widthMobile;

    return shouldUseMobile ? 'mobile' : 'desktop';
  };

  const applyLayout = (next: HudLayout) => {
    if (layout !== next) {
      layout = next;
      onLayoutChange?.(layout);
    }
    if (root) {
      setDatasetValue(root, dataAttribute, layout);
    }
  };

  const updateLayout = () => {
    const nextLayout = computeLayout();
    applyLayout(nextLayout);
  };

  const handleMediaChange: MediaQueryListListener = (event) => {
    if (event.matches !== undefined) {
      updateLayout();
    }
  };

  mediaListeners.push(addMediaQueryListener(pointerMedia, handleMediaChange));
  mediaListeners.push(addMediaQueryListener(widthMedia, handleMediaChange));

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      if (!preferMobileFromTouch) {
        preferMobileFromTouch = true;
        updateLayout();
      }
      return;
    }

    if (event.pointerType === 'mouse' && preferMobileFromTouch) {
      preferMobileFromTouch = false;
      updateLayout();
    }
  };

  const handleResize = () => {
    updateLayout();
  };

  windowTarget.addEventListener('pointerdown', handlePointerDown, {
    passive: true,
  });
  windowTarget.addEventListener('resize', handleResize);
  windowTarget.addEventListener('orientationchange', handleResize);

  updateLayout();

  return {
    getLayout(): HudLayout {
      return layout;
    },
    refresh(): void {
      updateLayout();
    },
    dispose(): void {
      mediaListeners.forEach((cleanup) => cleanup());
      windowTarget.removeEventListener('pointerdown', handlePointerDown);
      windowTarget.removeEventListener('resize', handleResize);
      windowTarget.removeEventListener('orientationchange', handleResize);
      if (root) {
        delete (root.dataset as Record<string, string | undefined>)[
          dataAttribute
        ];
      }
    },
  };
}
