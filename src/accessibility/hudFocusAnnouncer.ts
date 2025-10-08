export type HudFocusAnnouncePoliteness = 'polite' | 'assertive';

export interface HudFocusAnnouncerOptions {
  documentTarget?: Document;
  container?: HTMLElement | null;
  politeness?: HudFocusAnnouncePoliteness;
  datasetKey?: string;
}

export interface HudFocusAnnouncerHandle {
  readonly element: HTMLElement;
  announce(message: string): void;
  dispose(): void;
}

const DEFAULT_DATASET_KEY = 'hudAnnounce';
const DEFAULT_POLITENESS: HudFocusAnnouncePoliteness = 'polite';

type DatasetRecord = Record<string, string | undefined>;

function applyVisuallyHiddenStyles(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.padding = '0';
  element.style.margin = '-1px';
  element.style.overflow = 'hidden';
  element.style.clip = 'rect(0, 0, 0, 0)';
  element.style.whiteSpace = 'nowrap';
  element.style.border = '0';
}

function findDatasetElement(
  element: Element | null,
  datasetKey: string
): HTMLElement | null {
  let current: Element | null = element;
  while (current) {
    if (current instanceof HTMLElement) {
      const datasetValue = (current.dataset as DatasetRecord)[datasetKey];
      if (typeof datasetValue === 'string' && datasetValue.trim()) {
        return current;
      }
    }
    current = current.parentElement;
  }
  return element instanceof HTMLElement ? element : null;
}

function appendClause(base: string, addition: string): string {
  const trimmedBase = base.trim();
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) {
    return trimmedBase;
  }
  if (!trimmedBase) {
    return trimmedAddition;
  }
  const needsSeparator = /[.!?]\s*$/.test(trimmedBase) ? ' ' : '. ';
  return `${trimmedBase}${needsSeparator}${trimmedAddition}`;
}

function collectDescription(
  element: HTMLElement,
  documentTarget: Document
): string {
  const describedBy = element.getAttribute('aria-describedby');
  if (!describedBy) {
    return '';
  }
  const ids = describedBy
    .split(/\s+/)
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return '';
  }
  const parts: string[] = [];
  for (const id of ids) {
    const describedElement = documentTarget.getElementById(id);
    const text = describedElement?.textContent?.trim();
    if (text) {
      parts.push(text);
    }
  }
  return parts.join(' ');
}

function resolveMessage(
  focusTarget: HTMLElement,
  datasetKey: string,
  documentTarget: Document
): string | null {
  const datasetElement = findDatasetElement(focusTarget, datasetKey);
  const datasetValue = datasetElement
    ? ((datasetElement.dataset as DatasetRecord)[datasetKey] ?? '').trim()
    : '';

  let message = datasetValue;
  if (!message) {
    const ariaLabel = focusTarget.getAttribute('aria-label')?.trim();
    if (ariaLabel) {
      message = ariaLabel;
    }
  }
  if (!message) {
    const title = focusTarget.getAttribute('title')?.trim();
    if (title) {
      message = title;
    }
  }
  if (!message) {
    const textContent = focusTarget.textContent?.replace(/\s+/g, ' ').trim();
    if (textContent) {
      message = textContent;
    }
  }

  const valueText =
    focusTarget.getAttribute('aria-valuetext')?.trim() ??
    focusTarget.getAttribute('aria-valuenow')?.trim() ??
    '';
  if (valueText) {
    message = appendClause(message, `Current value ${valueText}.`);
  }

  const description = collectDescription(focusTarget, documentTarget);
  if (description) {
    message = appendClause(message, description);
  }

  return message.trim() ? message.trim() : null;
}

export function createHudFocusAnnouncer({
  documentTarget = document,
  container = documentTarget.body ?? documentTarget.documentElement,
  politeness = DEFAULT_POLITENESS,
  datasetKey = DEFAULT_DATASET_KEY,
}: HudFocusAnnouncerOptions = {}): HudFocusAnnouncerHandle {
  const host = container ?? documentTarget.body ?? documentTarget.documentElement;
  if (!host) {
    throw new Error('Unable to determine host element for HUD focus announcer.');
  }

  const liveRegion = documentTarget.createElement('div');
  liveRegion.dataset.hudFocusAnnouncer = 'true';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', politeness);
  liveRegion.setAttribute('aria-atomic', 'true');
  applyVisuallyHiddenStyles(liveRegion);
  host.appendChild(liveRegion);

  let lastMessage = '';

  const announce = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || trimmed === lastMessage) {
      return;
    }
    liveRegion.textContent = '';
    liveRegion.textContent = trimmed;
    lastMessage = trimmed;
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const message = resolveMessage(target, datasetKey, documentTarget);
    if (message) {
      announce(message);
    }
  };

  documentTarget.addEventListener('focusin', handleFocusIn);

  return {
    element: liveRegion,
    announce,
    dispose() {
      documentTarget.removeEventListener('focusin', handleFocusIn);
      if (liveRegion.parentElement) {
        liveRegion.remove();
      }
      liveRegion.textContent = '';
      lastMessage = '';
    },
  };
}
