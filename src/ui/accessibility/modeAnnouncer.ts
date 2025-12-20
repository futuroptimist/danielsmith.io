import { getModeAnnouncerStrings } from '../../assets/i18n';
import type { FallbackReason } from '../../types/failover';

export interface ModeAnnouncer {
  readonly element: HTMLElement;
  announceImmersiveReady(): void;
  announceFallback(reason: FallbackReason, options?: { force?: boolean }): void;
  setMessages(
    messages: Partial<{
      immersiveReady: string;
      fallbackMessages: Partial<Record<FallbackReason, string>>;
    }>,
    options?: { reannounce?: boolean }
  ): void;
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

const mergeFallbackMessages = (
  custom?: Partial<Record<FallbackReason, string>>
): Record<FallbackReason, string> => ({
  ...DEFAULT_FALLBACK_MESSAGES,
  ...custom,
});

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

  let lastAnnouncement: string | null = null;
  let lastReason: FallbackReason | null = null;
  let lastMode: 'immersive' | 'fallback' | null = null;
  let activeFallbackMessages = mergeFallbackMessages(fallbackMessages);
  let activeImmersiveMessage = immersiveMessage;
  let announcementSequence = 0;

  const announce = (message: string) => {
    const normalized = message.trim();
    lastAnnouncement = normalized;
    announcementSequence += 1;
    region.dataset.announcementSeq = `${announcementSequence}`;
    region.textContent = '';
    region.textContent = normalized;
  };

  return {
    element: region,
    announceImmersiveReady() {
      lastReason = null;
      lastMode = 'immersive';
      announce(activeImmersiveMessage);
    },
    announceFallback(reason, options) {
      const resolved =
        activeFallbackMessages[reason] ??
        DEFAULT_FALLBACK_MESSAGES[reason] ??
        DEFAULT_FALLBACK_MESSAGES.manual;
      if (
        !options?.force &&
        lastReason === reason &&
        lastAnnouncement === resolved.trim()
      ) {
        return;
      }
      lastReason = reason;
      lastMode = 'fallback';
      announce(resolved);
    },
    setMessages(nextMessages, options) {
      if (nextMessages.fallbackMessages) {
        activeFallbackMessages = mergeFallbackMessages(
          nextMessages.fallbackMessages
        );
      }

      if (nextMessages.immersiveReady) {
        activeImmersiveMessage = nextMessages.immersiveReady;
      }

      if (options?.reannounce) {
        lastAnnouncement = null;
        if (lastMode === 'fallback' && lastReason) {
          this.announceFallback(lastReason);
        } else if (lastMode === 'immersive') {
          this.announceImmersiveReady();
        }
      }
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

const syncDocumentFallbackReason = (
  documentTarget: Document,
  reason: FallbackReason
): boolean => {
  const currentReason = documentTarget.documentElement.dataset
    .fallbackReason as FallbackReason | undefined;

  if (currentReason === reason) {
    return false;
  }

  documentTarget.documentElement.dataset.fallbackReason = reason;
  return true;
};

function handleModeChange(
  documentTarget: Document,
  options?: { skipFallbackSync?: boolean; forceReannounce?: boolean }
): void {
  const mode = resolveActiveMode(documentTarget);
  if (!mode) {
    return;
  }
  const announcer = getModeAnnouncer(documentTarget);
  if (mode === 'fallback') {
    const reason = readFallbackReason(documentTarget);
    if (!options?.skipFallbackSync) {
      syncDocumentFallbackReason(documentTarget, reason);
    }
    announcer.announceFallback(reason, { force: options?.forceReannounce });
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

  const announcerStrings = getModeAnnouncerStrings(
    documentTarget.documentElement.lang
  );
  getModeAnnouncer(documentTarget).setMessages({
    fallbackMessages: announcerStrings.fallbackReasons,
  });

  const triggerAnnouncement = (options?: {
    skipFallbackSync?: boolean;
    forceReannounce?: boolean;
  }) => {
    handleModeChange(documentTarget, options);
  };

  const modeObserver = new MutationObserver((mutations) => {
    const fallbackReasonMutation = mutations.find(
      (mutation) =>
        mutation.type === 'attributes' &&
        mutation.attributeName === 'data-fallback-reason'
    );

    if (fallbackReasonMutation) {
      const target = fallbackReasonMutation.target as HTMLElement;
      if (fallbackReasonMutation.oldValue === target.dataset.fallbackReason) {
        return;
      }

      if (!target.dataset.fallbackReason) {
        if (syncDocumentFallbackReason(documentTarget, 'manual')) {
          triggerAnnouncement({ skipFallbackSync: true });
        }
        return;
      }
    }

    triggerAnnouncement({
      skipFallbackSync: Boolean(fallbackReasonMutation),
    });
  });
  modeObserver.observe(documentTarget.documentElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['data-app-mode', 'data-fallback-reason'],
  });

  const fallbackObserver = new MutationObserver((mutations) => {
    const hasRelevantMutation = mutations.some((mutation) => {
      if (mutation.type === 'attributes') {
        return (
          mutation.attributeName === 'data-reason' &&
          (mutation.target as Element).classList.contains('text-fallback')
        );
      }

      if (mutation.type === 'childList') {
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) {
            return false;
          }
          return (
            node.classList.contains('text-fallback') ||
            Boolean(node.querySelector('.text-fallback'))
          );
        });
      }

      return false;
    });

    if (!hasRelevantMutation) {
      return;
    }

    let shouldTriggerFallbackAnnouncement = false;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        if (
          mutation.attributeName === 'data-reason' &&
          target.classList.contains('text-fallback')
        ) {
          const updatedReason = (target as HTMLElement).dataset.reason;
          const nextReason = isValidFallbackReason(updatedReason)
            ? updatedReason
            : 'manual';

          if (syncDocumentFallbackReason(documentTarget, nextReason)) {
            triggerAnnouncement({ skipFallbackSync: true });
          }
          return;
        }
      }

      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        let addedFallback = false;

        for (const node of addedNodes) {
          if (!(node instanceof Element)) {
            continue;
          }

          const fallbackNode = node.classList.contains('text-fallback')
            ? (node as HTMLElement)
            : node.querySelector<HTMLElement>('.text-fallback');

          if (!fallbackNode) {
            continue;
          }

          addedFallback = true;

          const updatedReason = fallbackNode.dataset.reason;
          const nextReason = isValidFallbackReason(updatedReason)
            ? updatedReason
            : 'manual';
          syncDocumentFallbackReason(documentTarget, nextReason);
        }

        if (addedFallback) {
          shouldTriggerFallbackAnnouncement = true;
        }
      }
    }

    if (shouldTriggerFallbackAnnouncement) {
      triggerAnnouncement({
        skipFallbackSync: true,
        forceReannounce: true,
      });
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
