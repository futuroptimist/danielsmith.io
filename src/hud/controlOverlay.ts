export type ControlOverlayMode = 'all' | 'desktop' | 'touch';

export interface ControlOverlayOptions {
  window?: Window & typeof globalThis;
  initialMode?: ControlOverlayMode;
}

function normalizePointerType(pointerType: string | undefined | null): string {
  if (!pointerType) {
    return '';
  }
  return pointerType.toLowerCase();
}

function pointerTypeToMode(pointerType: string): ControlOverlayMode | null {
  switch (normalizePointerType(pointerType)) {
    case 'mouse':
      return 'desktop';
    case 'touch':
    case 'pen':
      return 'touch';
    default:
      return null;
  }
}

function isNavigatorMobile(navigatorLike: Navigator | undefined): boolean {
  if (!navigatorLike) {
    return false;
  }
  const { userAgentData } = navigatorLike as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  if (userAgentData && typeof userAgentData.mobile === 'boolean') {
    return userAgentData.mobile;
  }
  return false;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export class ControlOverlay {
  private readonly overlay: HTMLElement;

  private readonly windowRef?: Window & typeof globalThis;

  private readonly desktopItems: HTMLElement[];

  private readonly touchItems: HTMLElement[];

  private mode: ControlOverlayMode = 'all';

  private readonly pointerListener: (event: PointerEvent) => void;

  constructor(overlay: HTMLElement, options: ControlOverlayOptions = {}) {
    this.overlay = overlay;
    this.windowRef =
      options.window ?? (typeof window !== 'undefined' ? window : undefined);

    this.desktopItems = Array.from(
      this.overlay.querySelectorAll<HTMLElement>('.overlay__item--desktop')
    );
    this.touchItems = Array.from(
      this.overlay.querySelectorAll<HTMLElement>('.overlay__item--touch')
    );

    const initialMode = options.initialMode ?? this.detectInitialMode();
    this.setMode(initialMode);

    this.pointerListener = (event: PointerEvent) => {
      const nextMode = pointerTypeToMode(event.pointerType);
      if (!nextMode) {
        return;
      }
      this.setMode(nextMode);
    };

    if (this.windowRef) {
      this.windowRef.addEventListener('pointerdown', this.pointerListener, {
        passive: true,
      });
    }
  }

  getMode(): ControlOverlayMode {
    return this.mode;
  }

  setMode(mode: ControlOverlayMode): void {
    if (mode === this.mode) {
      return;
    }
    this.mode = mode;
    this.updateVisibility();
  }

  dispose(): void {
    if (this.windowRef) {
      this.windowRef.removeEventListener('pointerdown', this.pointerListener);
    }
  }

  private detectInitialMode(): ControlOverlayMode {
    const coarse = this.matchesMedia('(pointer: coarse)');
    const fine = this.matchesMedia('(pointer: fine)');

    if (coarse && !fine) {
      return 'touch';
    }
    if (fine && !coarse) {
      return 'desktop';
    }
    if (coarse && fine) {
      return 'all';
    }

    const navigatorRef = this.windowRef?.navigator;
    if (
      navigatorRef &&
      isFiniteNumber((navigatorRef as Navigator).maxTouchPoints) &&
      (navigatorRef as Navigator).maxTouchPoints > 0
    ) {
      return fine ? 'all' : 'touch';
    }

    if (isNavigatorMobile(navigatorRef)) {
      return 'touch';
    }

    return 'all';
  }

  private matchesMedia(query: string): boolean {
    if (!this.windowRef || typeof this.windowRef.matchMedia !== 'function') {
      return false;
    }
    try {
      return this.windowRef.matchMedia(query).matches;
    } catch {
      return false;
    }
  }

  private updateVisibility(): void {
    const showDesktop = this.mode === 'all' || this.mode === 'desktop';
    const showTouch = this.mode === 'all' || this.mode === 'touch';

    this.overlay.dataset.inputMode = this.mode;

    this.desktopItems.forEach((item) => {
      this.applyVisibility(item, showDesktop);
    });
    this.touchItems.forEach((item) => {
      this.applyVisibility(item, showTouch);
    });
  }

  private applyVisibility(element: HTMLElement, visible: boolean): void {
    element.hidden = !visible;
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
}
