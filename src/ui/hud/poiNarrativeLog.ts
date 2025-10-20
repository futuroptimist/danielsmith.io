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
  recordVisit(poi: PoiDefinition, options?: PoiNarrativeLogRecordOptions): void;
  recordJourney(fromPoi: PoiDefinition, toPoi: PoiDefinition): void;
  clearJourneys(): void;
  syncVisited(
    pois: Iterable<PoiDefinition>,
    options?: PoiNarrativeLogSyncOptions
  ): void;
  setStrings(strings: PoiNarrativeLogStrings): void;
  dispose(): void;
}

interface PoiNarrativeLogEntryElements {
  container: HTMLLIElement;
  visitedLabel: HTMLSpanElement;
  caption: HTMLParagraphElement;
}

interface JourneyEntryRecord {
  container: HTMLLIElement;
  label: HTMLSpanElement;
  caption: HTMLParagraphElement;
  fromPoi: PoiDefinition;
  toPoi: PoiDefinition;
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

const MAX_JOURNEY_ENTRIES = 6;

export function createPoiNarrativeLog(
  options: PoiNarrativeLogOptions
): PoiNarrativeLogHandle {
  const { container, strings } = options;
  const documentTarget =
    options.documentTarget ?? container.ownerDocument ?? document;

  let activeStrings = strings;

  const section = documentTarget.createElement('section');
  section.className = 'help-modal__section poi-narrative-log';
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', activeStrings.heading);

  const heading = documentTarget.createElement('h3');
  heading.className = 'help-modal__section-heading';
  heading.textContent = activeStrings.heading;
  section.appendChild(heading);

  const journeyHeading = documentTarget.createElement('h4');
  journeyHeading.className = 'poi-narrative-log__journey-heading';
  journeyHeading.textContent = activeStrings.journey.heading;
  section.appendChild(journeyHeading);

  const journeyEmpty = documentTarget.createElement('p');
  journeyEmpty.className = 'poi-narrative-log__journey-empty';
  journeyEmpty.textContent = activeStrings.journey.empty;
  section.appendChild(journeyEmpty);

  const journeyList = documentTarget.createElement('ol');
  journeyList.className = 'poi-narrative-log__journey-list';
  journeyList.hidden = true;
  section.appendChild(journeyList);

  const visitedHeading = documentTarget.createElement('h4');
  visitedHeading.className = 'poi-narrative-log__visited-heading';
  visitedHeading.textContent = activeStrings.visitedHeading;
  section.appendChild(visitedHeading);

  const visitedEmpty = documentTarget.createElement('p');
  visitedEmpty.className = 'poi-narrative-log__empty';
  visitedEmpty.textContent = activeStrings.empty;
  section.appendChild(visitedEmpty);

  const visitedList = documentTarget.createElement('ol');
  visitedList.className = 'poi-narrative-log__list';
  visitedList.hidden = true;
  section.appendChild(visitedList);

  const liveRegion = documentTarget.createElement('div');
  liveRegion.className = 'poi-narrative-log__live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  Object.assign(liveRegion.style, VISUALLY_HIDDEN_STYLES);
  section.appendChild(liveRegion);

  container.appendChild(section);

  const entries = new Map<string, PoiNarrativeLogEntryElements>();
  const journeyEntries: JourneyEntryRecord[] = [];

  const updateEmptyState = () => {
    const hasVisitedEntries = entries.size > 0;
    visitedEmpty.hidden = hasVisitedEntries;
    visitedList.hidden = !hasVisitedEntries;

    const hasJourneys = journeyEntries.length > 0;
    journeyEmpty.hidden = hasJourneys;
    journeyList.hidden = !hasJourneys;
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

  const getRoomStrings = (poi: PoiDefinition) => {
    return (
      activeStrings.rooms[poi.roomId] ?? {
        label: poi.roomId,
        descriptor: '',
        zone: 'interior' as const,
      }
    );
  };

  const createJourneyEntry = (
    fromPoi: PoiDefinition,
    toPoi: PoiDefinition
  ): JourneyEntryRecord => {
    const item = documentTarget.createElement('li');
    item.className = 'poi-narrative-log__journey-entry';

    const label = documentTarget.createElement('span');
    label.className = 'poi-narrative-log__journey-label';
    item.appendChild(label);

    const caption = documentTarget.createElement('p');
    caption.className = 'poi-narrative-log__journey-caption';
    item.appendChild(caption);

    return { container: item, label, caption, fromPoi, toPoi };
  };

  const renderJourney = (
    entry: JourneyEntryRecord
  ): { label: string; story: string } => {
    const { journey } = activeStrings;
    const fromRoom = getRoomStrings(entry.fromPoi);
    const toRoom = getRoomStrings(entry.toPoi);

    const labelText = formatMessage(journey.entryLabelTemplate, {
      from: fromRoom.label || entry.fromPoi.title,
      to: toRoom.label || entry.toPoi.title,
    }).trim();

    const fromZone = fromRoom.zone ?? 'interior';
    const toZone = toRoom.zone ?? 'interior';

    let template = journey.fallbackTemplate;
    if (entry.fromPoi.roomId === entry.toPoi.roomId) {
      template = journey.sameRoomTemplate;
    } else if (fromZone !== toZone) {
      template = journey.crossSectionTemplate;
    } else {
      template = journey.crossRoomTemplate;
    }

    const directionKey = toZone === 'exterior' ? 'outdoors' : 'indoors';
    const direction = journey.directions[directionKey];

    const story = formatMessage(template, {
      room: fromRoom.label || entry.fromPoi.roomId,
      descriptor: fromRoom.descriptor || '',
      fromPoi: entry.fromPoi.title,
      toPoi: entry.toPoi.title,
      fromRoom: fromRoom.label || entry.fromPoi.roomId,
      fromDescriptor: fromRoom.descriptor || '',
      toRoom: toRoom.label || entry.toPoi.roomId,
      toDescriptor: toRoom.descriptor || '',
      direction,
    }).trim();

    entry.label.textContent = labelText;
    entry.caption.textContent = story;

    return { label: labelText, story };
  };

  const recordJourneyEntry = (fromPoi: PoiDefinition, toPoi: PoiDefinition) => {
    const entry = createJourneyEntry(fromPoi, toPoi);
    journeyEntries.unshift(entry);
    journeyList.insertBefore(entry.container, journeyList.firstChild);

    const { label, story } = renderJourney(entry);
    updateEmptyState();

    const announcement = formatMessage(
      activeStrings.journey.announcementTemplate,
      { label, story }
    ).trim();
    if (announcement) {
      liveRegion.textContent = '';
      liveRegion.textContent = announcement;
    }

    while (journeyEntries.length > MAX_JOURNEY_ENTRIES) {
      const removed = journeyEntries.pop();
      removed?.container.remove();
    }
  };

  const clearJourneyEntries = () => {
    while (journeyEntries.length > 0) {
      const removed = journeyEntries.pop();
      removed?.container.remove();
    }
    updateEmptyState();
  };

  const recordVisit = (
    poi: PoiDefinition,
    options?: PoiNarrativeLogRecordOptions
  ) => {
    const visitedLabel =
      options?.visitedLabel ?? activeStrings.defaultVisitedLabel;
    const announce = options?.announce ?? true;
    const existing = entries.get(poi.id);

    if (existing) {
      existing.caption.textContent = getCaption(poi);
      existing.visitedLabel.textContent = visitedLabel;
      if (visitedList.firstChild !== existing.container) {
        visitedList.insertBefore(existing.container, visitedList.firstChild);
      }
      updateEmptyState();
      return;
    }

    const entry = createEntryElements(poi, visitedLabel);
    entries.set(poi.id, entry);
    visitedList.insertBefore(entry.container, visitedList.firstChild);
    updateEmptyState();

    if (!announce) {
      return;
    }

    const message = formatMessage(activeStrings.liveAnnouncementTemplate, {
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
      options?.visitedLabel ?? activeStrings.defaultVisitedLabel;
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
      visitedList.appendChild(entry.container);
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

  return {
    element: section,
    recordVisit,
    recordJourney: recordJourneyEntry,
    clearJourneys: clearJourneyEntries,
    syncVisited,
    setStrings(nextStrings) {
      activeStrings = nextStrings;
      section.setAttribute('aria-label', nextStrings.heading);
      heading.textContent = nextStrings.heading;
      visitedHeading.textContent = nextStrings.visitedHeading;
      visitedEmpty.textContent = nextStrings.empty;
      journeyHeading.textContent = nextStrings.journey.heading;
      journeyEmpty.textContent = nextStrings.journey.empty;
      entries.forEach((entry) => {
        entry.visitedLabel.textContent = nextStrings.defaultVisitedLabel;
      });
      journeyEntries.forEach((entry) => {
        renderJourney(entry);
      });
      updateEmptyState();
    },
    dispose() {
      entries.clear();
      journeyEntries.splice(0, journeyEntries.length);
      section.remove();
    },
  };
}
