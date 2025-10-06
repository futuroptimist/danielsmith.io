import type { FallbackReason } from '../failover';

export interface ModeAnnouncer {
  readonly element: HTMLElement;
  announceImmersiveReady(): void;
  announceFallback(reason: FallbackReason): void;
  dispose(): void;
}

export interface ModeAnnouncerOptions {
  documentTarget?: Document;
  container?: HTMLElement;
  politeness?: 'polite' | 'assertive';
  immersiveMessage?: string;
  fallbackMessages?: Partial<Record<FallbackReason, string>>;
}

const DEFAULT_IMMERSIVE_MESSAGE =
  'Immersive mode ready. Press T for the text tour or H for help.';

const DEFAULT_FALLBACK_MESSAGES: Record<FallbackReason, string> = {
  manual:
    'Text mode enabled. Activate “Launch immersive mode” to return to the 3D tour.',
  'low-memory':
    'Device memory is constrained, so the fast text tour is now active for stability.',
  'low-performance':
    'Frame rates dipped below target. Switched to the responsive text tour to stay smooth.',
  'immersive-init-error':
    'The immersive scene hit an error. Showing the text portfolio while it recovers.',
  'webgl-unsupported':
    'WebGL is unavailable here, so the accessible text portfolio is now active.',
  'automated-client':
    'Detected an automated client. Presenting the text portfolio for reliable previews.',
};

function applyVisuallyHiddenStyles(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.margin = '-1px';
  element.style.border = '0';
  element.style.padding = '0';
  element.style.overflow = 'hidden';
  element.style.clip = 'rect(0 0 0 0)';
  element.style.clipPath = 'inset(50%)';
  element.style.whiteSpace = 'nowrap';
  element.style.pointerEvents = 'none';
}

function resolveContainer(
  documentTarget: Document,
  container?: HTMLElement
): HTMLElement {
  if (container) {
    return container;
  }
  if (documentTarget.body) {
    return documentTarget.body;
  }
  return documentTarget.documentElement;
}

export function createModeAnnouncer({
  documentTarget = document,
  container,
  politeness = 'polite',
  immersiveMessage = DEFAULT_IMMERSIVE_MESSAGE,
  fallbackMessages = {},
}: ModeAnnouncerOptions = {}): ModeAnnouncer {
  const host = resolveContainer(documentTarget, container);
  const region = documentTarget.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.dataset.modeAnnouncer = 'true';
  applyVisuallyHiddenStyles(region);
  host.appendChild(region);

  const announce = (message: string) => {
    region.textContent = '';
    region.textContent = message;
  };

  return {
    element: region,
    announceImmersiveReady() {
      announce(immersiveMessage);
    },
    announceFallback(reason) {
      const resolved =
        fallbackMessages[reason] ??
        DEFAULT_FALLBACK_MESSAGES[reason] ??
        DEFAULT_FALLBACK_MESSAGES.manual;
      announce(resolved);
    },
    dispose() {
      region.remove();
    },
  };
}

const announcers = new WeakMap<Document, ModeAnnouncer>();
const observers = new WeakMap<Document, MutationObserver>();

function readFallbackReason(documentTarget: Document): FallbackReason {
  const fallback = documentTarget.querySelector<HTMLElement>('.text-fallback');
  const reason = fallback?.dataset.reason as FallbackReason | undefined;
  if (reason && reason in DEFAULT_FALLBACK_MESSAGES) {
    return reason;
  }
  return 'manual';
}

function handleModeChange(documentTarget: Document): void {
  const mode = documentTarget.documentElement.dataset
    .appMode as 'immersive' | 'fallback' | undefined;
  if (!mode) {
    return;
  }
  const announcer = getModeAnnouncer(documentTarget);
  if (mode === 'fallback') {
    announcer.announceFallback(readFallbackReason(documentTarget));
  } else if (mode === 'immersive') {
    announcer.announceImmersiveReady();
  }
}

export function getModeAnnouncer(
  documentTarget: Document = document
): ModeAnnouncer {
  const existing = announcers.get(documentTarget);
  if (existing) {
    return existing;
  }
  const created = createModeAnnouncer({ documentTarget });
  announcers.set(documentTarget, created);
  return created;
}

export function initializeModeAnnouncementObserver(
  documentTarget: Document = document
): void {
  if (observers.has(documentTarget)) {
    return;
  }
  const observer = new MutationObserver(() => {
    handleModeChange(documentTarget);
  });
  observer.observe(documentTarget.documentElement, {
    attributes: true,
    attributeFilter: ['data-app-mode'],
  });
  observers.set(documentTarget, observer);
}

export function __resetModeAnnouncementForTests(
  documentTarget: Document = document
): void {
  const announcer = announcers.get(documentTarget);
  if (announcer) {
    announcer.dispose();
    announcers.delete(documentTarget);
  }
  const observer = observers.get(documentTarget);
  if (observer) {
    observer.disconnect();
    observers.delete(documentTarget);
  }
  const region = documentTarget.querySelector<HTMLElement>(
    '[data-mode-announcer="true"]'
  );
  region?.remove();
}
