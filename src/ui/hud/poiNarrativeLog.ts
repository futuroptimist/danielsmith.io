import { formatMessage } from '../../assets/i18n';
import type { PoiNarrativeLogStrings } from '../../assets/i18n';
import type { PoiDefinition } from '../../scene/poi/types';

export interface PoiNarrativeLogOptions {
  container: HTMLElement;
  strings: PoiNarrativeLogStrings;
  documentTarget?: Document;
}

export interface PoiNarrativeLogRecordOptions {
  visitedLabel?: string;
  announce?: boolean;
}

export interface PoiNarrativeLogSyncOptions {
  visitedLabel?: string;
}

export interface PoiNarrativeLogHandle {
  readonly element: HTMLElement;
  recordVisit(
    poi: PoiDefinition,
    options?: PoiNarrativeLogRecordOptions
  ): void;
  syncVisited(
    pois: Iterable<PoiDefinition>,
    options?: PoiNarrativeLogSyncOptions
  ): void;
  dispose(): void;
}

interface PoiNarrativeLogEntryElements {
  container: HTMLLIElement;
  visitedLabel: HTMLSpanElement;
  caption: HTMLParagraphElement;
}

const VISUALLY_HIDDEN_STYLES: Partial<CSSStyleDeclaration> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  border: '0',
  padding: '0',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

export function createPoiNarrativeLog(
  options: PoiNarrativeLogOptions
): PoiNarrativeLogHandle {
  const { container, strings } = options;
  const documentTarget = options.documentTarget ?? container.ownerDocument ?? document;

  const section = documentTarget.createElement('section');
  section.className = 'help-modal__section poi-narrative-log';
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', strings.heading);

  const heading = documentTarget.createElement('h3');
  heading.className = 'help-modal__section-heading';
  heading.textContent = strings.heading;
  section.appendChild(heading);

  const emptyMessage = documentTarget.createElement('p');
  emptyMessage.className = 'poi-narrative-log__empty';
  emptyMessage.textContent = strings.empty;
  section.appendChild(emptyMessage);

  const list = documentTarget.createElement('ol');
  list.className = 'poi-narrative-log__list';
  list.hidden = true;
  section.appendChild(list);

  const liveRegion = documentTarget.createElement('div');
  liveRegion.className = 'poi-narrative-log__live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  Object.assign(liveRegion.style, VISUALLY_HIDDEN_STYLES);
  section.appendChild(liveRegion);

  container.appendChild(section);

  const entries = new Map<string, PoiNarrativeLogEntryElements>();

  const updateEmptyState = () => {
    const hasEntries = entries.size > 0;
    emptyMessage.hidden = hasEntries;
    list.hidden = !hasEntries;
  };

  const getCaption = (poi: PoiDefinition) =>
    poi.narration?.caption ?? poi.summary ?? '';

  const createEntryElements = (
    poi: PoiDefinition,
    visitedLabel: string
  ): PoiNarrativeLogEntryElements => {
    const item = documentTarget.createElement('li');
    item.className = 'poi-narrative-log__entry';
    item.dataset.poiId = poi.id;

    const header = documentTarget.createElement('div');
    header.className = 'poi-narrative-log__entry-header';

    const title = documentTarget.createElement('h4');
    title.className = 'poi-narrative-log__entry-title';
    title.textContent = poi.title;
    header.appendChild(title);

    const visited = documentTarget.createElement('span');
    visited.className = 'poi-narrative-log__entry-visited';
    visited.textContent = visitedLabel;
    header.appendChild(visited);

    const caption = documentTarget.createElement('p');
    caption.className = 'poi-narrative-log__entry-caption';
    caption.textContent = getCaption(poi);

    item.append(header, caption);

    return {
      container: item,
      visitedLabel: visited,
      caption,
    };
  };

  const recordVisit = (
    poi: PoiDefinition,
    options?: PoiNarrativeLogRecordOptions
  ) => {
    const visitedLabel =
      options?.visitedLabel ?? strings.defaultVisitedLabel;
    const announce = options?.announce ?? true;
    const existing = entries.get(poi.id);

    if (existing) {
      existing.caption.textContent = getCaption(poi);
      existing.visitedLabel.textContent = visitedLabel;
      if (list.firstChild !== existing.container) {
        list.insertBefore(existing.container, list.firstChild);
      }
      updateEmptyState();
      return;
    }

    const entry = createEntryElements(poi, visitedLabel);
    entries.set(poi.id, entry);
    if (list.firstChild) {
      list.insertBefore(entry.container, list.firstChild);
    } else {
      list.appendChild(entry.container);
    }
    updateEmptyState();

    if (!announce) {
      return;
    }

    const message = formatMessage(strings.liveAnnouncementTemplate, {
      title: poi.title,
    }).trim();
    if (!message) {
      return;
    }
    liveRegion.textContent = '';
    liveRegion.textContent = message;
  };

  const syncVisited = (
    pois: Iterable<PoiDefinition>,
    options?: PoiNarrativeLogSyncOptions
  ) => {
    const visitedLabel =
      options?.visitedLabel ?? strings.defaultVisitedLabel;
    const activeIds = new Set<string>();
    for (const poi of pois) {
      activeIds.add(poi.id);
      const existing = entries.get(poi.id);
      if (existing) {
        existing.caption.textContent = getCaption(poi);
        existing.visitedLabel.textContent = visitedLabel;
        continue;
      }
      const entry = createEntryElements(poi, visitedLabel);
      entries.set(poi.id, entry);
      list.appendChild(entry.container);
    }

    for (const [id, entry] of entries) {
      if (activeIds.has(id)) {
        continue;
      }
      entry.container.remove();
      entries.delete(id);
    }

    updateEmptyState();
  };

  const dispose = () => {
    entries.clear();
    section.remove();
  };

  return {
    element: section,
    recordVisit,
    syncVisited,
    dispose,
  };
}
