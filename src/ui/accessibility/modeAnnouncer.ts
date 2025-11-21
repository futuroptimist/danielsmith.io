import type { FallbackReason } from '../../systems/failover/index';

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
  'low-end-device':
    'Detected a lightweight device profile. Running the text portfolio for a smoother tour.',
  'console-error':
    'We detected a runtime error. Presenting the resilient text tour while the scene resets.',
  'data-saver':
    'Your browser requested a data-saver experience, so the lightweight text tour is active.',
};

const isValidFallbackReason = (value: unknown): value is FallbackReason =>
  typeof value === 'string' && value in DEFAULT_FALLBACK_MESSAGES;

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
type ModeAnnouncementObservers = {
  readonly mode: MutationObserver;
  readonly fallback: MutationObserver;
};

const observers = new WeakMap<Document, ModeAnnouncementObservers>();

function readFallbackReason(documentTarget: Document): FallbackReason {
  const datasetReason = documentTarget.documentElement.dataset
    .fallbackReason as FallbackReason | undefined;
  if (datasetReason && datasetReason in DEFAULT_FALLBACK_MESSAGES) {
    return datasetReason;
  }
  const fallback = documentTarget.querySelector<HTMLElement>('.text-fallback');
  const reason = fallback?.dataset.reason as FallbackReason | undefined;
  if (reason && reason in DEFAULT_FALLBACK_MESSAGES) {
    return reason;
  }
  return 'manual';
}

const resolveActiveMode = (
  documentTarget: Document
): 'immersive' | 'fallback' | null => {
  const declaredMode = documentTarget.documentElement.dataset.appMode as
    | 'immersive'
    | 'fallback'
    | undefined;
  if (declaredMode === 'immersive' || declaredMode === 'fallback') {
    return declaredMode;
  }

  const fallbackView = documentTarget.querySelector('.text-fallback');
  if (fallbackView) {
    return 'fallback';
  }

  return null;
};

function handleModeChange(documentTarget: Document): void {
  const mode = resolveActiveMode(documentTarget);
  if (!mode) {
    return;
  }
  const announcer = getModeAnnouncer(documentTarget);
  if (mode === 'fallback') {
    const reason = readFallbackReason(documentTarget);
    documentTarget.documentElement.dataset.fallbackReason = reason;
    announcer.announceFallback(reason);
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

  const triggerAnnouncement = () => {
    handleModeChange(documentTarget);
  };

  const modeObserver = new MutationObserver(triggerAnnouncement);
  modeObserver.observe(documentTarget.documentElement, {
    attributes: true,
    attributeFilter: ['data-app-mode', 'data-fallback-reason'],
  });

  const fallbackObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        if (
          mutation.attributeName === 'data-reason' &&
          target.classList.contains('text-fallback')
        ) {
          const updatedReason = (target as HTMLElement).dataset.reason;
          if (isValidFallbackReason(updatedReason)) {
            documentTarget.documentElement.dataset.fallbackReason = updatedReason;
          }
          triggerAnnouncement();
          return;
        }
      }

      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        if (
          addedNodes.some(
            (node) => {
              if (
                node instanceof HTMLElement &&
                node.classList.contains('text-fallback')
              ) {
                const updatedReason = node.dataset.reason;
                if (isValidFallbackReason(updatedReason)) {
                  documentTarget.documentElement.dataset.fallbackReason = updatedReason;
                }
                return true;
              }
              return false;
            }
          )
        ) {
          triggerAnnouncement();
          return;
        }
      }
    }
  });

  fallbackObserver.observe(
    documentTarget.body ?? documentTarget.documentElement,
    {
      attributes: true,
      attributeFilter: ['data-reason'],
      childList: true,
      subtree: true,
    }
  );

  handleModeChange(documentTarget);

  observers.set(documentTarget, {
    mode: modeObserver,
    fallback: fallbackObserver,
  });
}

export function __resetModeAnnouncementForTests(
  documentTarget: Document = document
): void {
  const announcer = announcers.get(documentTarget);
  if (announcer) {
    announcer.dispose();
    announcers.delete(documentTarget);
  }
  const observerSet = observers.get(documentTarget);
  if (observerSet) {
    observerSet.mode.disconnect();
    observerSet.fallback.disconnect();
    observers.delete(documentTarget);
  }
  const region = documentTarget.querySelector<HTMLElement>(
    '[data-mode-announcer="true"]'
  );
  region?.remove();
}
