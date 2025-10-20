import { beforeEach, describe, expect, it } from 'vitest';

import { formatMessage } from '../assets/i18n';
import type { PoiNarrativeLogStrings } from '../assets/i18n';
import type { PoiDefinition } from '../scene/poi/types';
import { createPoiNarrativeLog } from '../ui/hud/poiNarrativeLog';

const STRINGS: PoiNarrativeLogStrings = {
  heading: 'Story log',
  visitedHeading: 'Visited exhibits',
  empty: 'Visit exhibits to unlock story entries.',
  defaultVisitedLabel: 'Visited',
  visitedLabelTemplate: 'Visited at {time}',
  liveAnnouncementTemplate: '{title} logged.',
  journey: {
    heading: 'Journey beats',
    empty: 'Explore new exhibits to unlock journey narration.',
    entryLabelTemplate: '{from} -> {to}',
    sameRoomTemplate: '{room} {descriptor}: {fromPoi} to {toPoi}.',
    crossRoomTemplate:
      'From {fromRoom} {fromDescriptor} to {toRoom} {toDescriptor} for {toPoi}.',
    crossSectionTemplate:
      'Stepping {direction}, the story moves to {toRoom} {toDescriptor} for {toPoi}.',
    fallbackTemplate: 'Heading toward {toPoi}.',
    announcementTemplate: 'Journey — {label}: {story}',
    directions: {
      indoors: 'indoors',
      outdoors: 'outdoors',
    },
  },
  rooms: {
    livingRoom: {
      label: 'Living room',
      descriptor: 'lounge',
      zone: 'interior',
    },
    studio: { label: 'Studio', descriptor: 'lab', zone: 'interior' },
    kitchen: { label: 'Kitchen', descriptor: 'lab', zone: 'interior' },
    backyard: { label: 'Backyard', descriptor: 'garden', zone: 'exterior' },
  },
};

const AR_STRINGS: PoiNarrativeLogStrings = {
  heading: 'سجل القصة',
  visitedHeading: 'المعارض التي تمت زيارتها',
  empty: 'قم بزيارة المعارض لفتح إدخالات جديدة.',
  defaultVisitedLabel: 'تمت الزيارة',
  visitedLabelTemplate: 'تمت الزيارة في {time}',
  liveAnnouncementTemplate: '{title} أضيف.',
  journey: {
    heading: 'محطات الرحلة',
    empty: 'استكشف معارض جديدة لنسج سرد الرحلة.',
    entryLabelTemplate: '{from} → {to}',
    sameRoomTemplate:
      '{room} {descriptor}: ينتقل السرد من {fromPoi} إلى {toPoi}.',
    crossRoomTemplate:
      'من {fromRoom} {fromDescriptor} إلى {toRoom} {toDescriptor} لإبراز {toPoi}.',
    crossSectionTemplate:
      'بالعبور {direction} يصل المسار إلى {toRoom} {toDescriptor} نحو {toPoi}.',
    fallbackTemplate: 'يتجه السرد نحو {toPoi}.',
    announcementTemplate: 'تحديث الرحلة — {label}: {story}',
    directions: {
      indoors: 'إلى الداخل',
      outdoors: 'إلى الخارج',
    },
  },
  rooms: {
    livingRoom: {
      label: 'غرفة المعيشة',
      descriptor: 'الاستراحة',
      zone: 'interior',
    },
    studio: { label: 'الاستوديو', descriptor: 'المختبر', zone: 'interior' },
    kitchen: { label: 'مختبر المطبخ', descriptor: 'الجناح', zone: 'interior' },
    backyard: {
      label: 'الفناء الخلفي',
      descriptor: 'الحديقة',
      zone: 'exterior',
    },
  },
};

const createPoi = (overrides: Partial<PoiDefinition> = {}): PoiDefinition => ({
  id: 'futuroptimist-living-room-tv',
  title: 'Futuroptimist Creator Desk',
  summary: 'Default summary',
  interactionPrompt: `Inspect ${overrides.title ?? 'Futuroptimist Creator Desk'}`,
  category: 'project',
  interaction: 'inspect',
  roomId: 'livingRoom',
  position: { x: 0, y: 0, z: 0 },
  interactionRadius: 2,
  footprint: { width: 1, depth: 1 },
  ...overrides,
});

describe('createPoiNarrativeLog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const setup = () =>
    createPoiNarrativeLog({ container: document.body, strings: STRINGS });

  it('renders placeholder state before any visits are recorded', () => {
    setup();

    const section = document.querySelector('.poi-narrative-log');
    const journeyEmpty = document.querySelector(
      '.poi-narrative-log__journey-empty'
    );
    const journeyList = document.querySelector(
      '.poi-narrative-log__journey-list'
    );
    const visitedEmpty = document.querySelector('.poi-narrative-log__empty');
    const visitedList = document.querySelector('.poi-narrative-log__list');

    expect(section).toBeInstanceOf(HTMLElement);
    expect(journeyEmpty).toBeInstanceOf(HTMLElement);
    expect(journeyEmpty?.textContent).toBe(STRINGS.journey.empty);
    expect(journeyEmpty?.getAttribute('hidden')).toBeNull();
    expect(journeyList).toBeInstanceOf(HTMLElement);
    expect(journeyList?.getAttribute('hidden')).toBe('');
    expect(visitedEmpty).toBeInstanceOf(HTMLElement);
    expect(visitedEmpty?.textContent).toBe(STRINGS.empty);
    expect(visitedEmpty?.getAttribute('hidden')).toBeNull();
    expect(visitedList).toBeInstanceOf(HTMLElement);
    expect(visitedList?.getAttribute('hidden')).toBe('');
  });

  it('records narrative entries and announces new visits', () => {
    const log = setup();

    const poi = createPoi({
      narration: { caption: 'Narrative caption' },
    });

    log.recordVisit(poi, { visitedLabel: 'Visited just now' });

    const entry = document.querySelector('.poi-narrative-log__entry');
    const title = entry?.querySelector('.poi-narrative-log__entry-title');
    const caption = entry?.querySelector('.poi-narrative-log__entry-caption');
    const visited = entry?.querySelector('.poi-narrative-log__entry-visited');
    const visitedEmpty = document.querySelector('.poi-narrative-log__empty');
    const visitedList = document.querySelector('.poi-narrative-log__list');
    const journeyEmpty = document.querySelector(
      '.poi-narrative-log__journey-empty'
    );
    const journeyList = document.querySelector(
      '.poi-narrative-log__journey-list'
    );
    const liveRegion = document.querySelector(
      '.poi-narrative-log__live-region'
    );

    expect(entry).toBeInstanceOf(HTMLElement);
    expect(title?.textContent).toBe(poi.title);
    expect(caption?.textContent).toBe('Narrative caption');
    expect(visited?.textContent).toBe('Visited just now');
    expect(visitedEmpty?.hidden).toBe(true);
    expect(visitedList?.hidden).toBe(false);
    expect(journeyEmpty?.hidden).toBe(false);
    expect(journeyList?.hidden).toBe(true);
    expect(liveRegion?.textContent).toBe(`${poi.title} logged.`);
  });

  it('records journey beats with contextual narration', () => {
    const log = setup();

    const fromPoi = createPoi({
      id: 'futuroptimist-living-room-tv',
      title: 'Futuroptimist Creator Desk',
      roomId: 'livingRoom',
    });
    const toPoi = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Kinetic Hub',
      roomId: 'studio',
    });

    log.recordJourney(fromPoi, toPoi);

    const journeyEntry = document.querySelector(
      '.poi-narrative-log__journey-entry'
    );
    const journeyLabel = journeyEntry?.querySelector(
      '.poi-narrative-log__journey-label'
    );
    const journeyCaption = journeyEntry?.querySelector(
      '.poi-narrative-log__journey-caption'
    );
    const journeyEmpty = document.querySelector(
      '.poi-narrative-log__journey-empty'
    );
    const journeyList = document.querySelector(
      '.poi-narrative-log__journey-list'
    );
    const liveRegion = document.querySelector(
      '.poi-narrative-log__live-region'
    );

    const expectedLabel = formatMessage(STRINGS.journey.entryLabelTemplate, {
      from: STRINGS.rooms.livingRoom.label,
      to: STRINGS.rooms.studio.label,
    });
    const expectedStory = formatMessage(STRINGS.journey.crossRoomTemplate, {
      fromRoom: STRINGS.rooms.livingRoom.label,
      fromDescriptor: STRINGS.rooms.livingRoom.descriptor,
      toRoom: STRINGS.rooms.studio.label,
      toDescriptor: STRINGS.rooms.studio.descriptor,
      toPoi: toPoi.title,
    });

    expect(journeyEntry).toBeInstanceOf(HTMLElement);
    expect(journeyLabel?.textContent).toBe(expectedLabel);
    expect(journeyCaption?.textContent).toBe(expectedStory);
    expect(journeyEmpty?.hidden).toBe(true);
    expect(journeyList?.hidden).toBe(false);
    expect(liveRegion?.textContent).toBe(
      formatMessage(STRINGS.journey.announcementTemplate, {
        label: expectedLabel,
        story: expectedStory,
      })
    );
  });

  it('supports silent entries and summary fallbacks when narration is missing', () => {
    const log = setup();
    const liveRegion = document.querySelector(
      '.poi-narrative-log__live-region'
    );

    const narrated = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Kinetic Hub',
      narration: { caption: 'Flywheel narration' },
    });

    log.recordVisit(narrated);
    expect(liveRegion?.textContent).toBe('Flywheel Kinetic Hub logged.');

    const silent = createPoi({
      id: 'jobbot-studio-terminal',
      title: 'Jobbot Terminal',
      summary: 'Jobbot summary fallback',
      narration: undefined,
    });

    if (liveRegion) {
      liveRegion.textContent = '';
    }

    log.recordVisit(silent, {
      visitedLabel: 'Pinned from history',
      announce: false,
    });

    const silentEntry = document.querySelector(
      '.poi-narrative-log__entry[data-poi-id="jobbot-studio-terminal"]'
    );
    const caption = silentEntry?.querySelector(
      '.poi-narrative-log__entry-caption'
    );
    const visited = silentEntry?.querySelector(
      '.poi-narrative-log__entry-visited'
    );

    expect(caption?.textContent).toBe('Jobbot summary fallback');
    expect(visited?.textContent).toBe('Pinned from history');
    expect(liveRegion?.textContent).toBe('');

    log.recordVisit(silent, { visitedLabel: 'Revisited' });
    expect(visited?.textContent).toBe('Revisited');
    expect(liveRegion?.textContent).toBe('');
  });

  it('enforces the journey history limit and clears entries', () => {
    const log = setup();

    const makePoi = (index: number, overrides: Partial<PoiDefinition> = {}) =>
      createPoi({
        id: `poi-${index}`,
        title: `POI ${index}`,
        ...overrides,
      });

    for (let i = 0; i < 7; i += 1) {
      const fromPoi = makePoi(i, {
        roomId: i % 2 === 0 ? 'livingRoom' : 'studio',
        title: `From ${i}`,
      });
      const toPoi = makePoi(i + 20, {
        roomId: i % 3 === 0 ? 'backyard' : 'studio',
        title: `To ${i}`,
      });
      log.recordJourney(fromPoi, toPoi);
    }

    const journeyEntries = document.querySelectorAll(
      '.poi-narrative-log__journey-entry'
    );
    expect(journeyEntries).toHaveLength(6);

    log.clearJourneys();
    const journeyEmpty = document.querySelector(
      '.poi-narrative-log__journey-empty'
    );
    const journeyList = document.querySelector(
      '.poi-narrative-log__journey-list'
    );
    expect(journeyEmpty?.hidden).toBe(false);
    expect(journeyList?.hidden).toBe(true);
  });

  it('synchronizes visited entries and removes stale items', () => {
    const log = setup();
    const liveRegion = document.querySelector(
      '.poi-narrative-log__live-region'
    );

    const first = createPoi({
      id: 'gitshelves-living-room-installation',
      title: 'Gitshelves Installation',
    });
    const second = createPoi({
      id: 'dspace-backyard-rocket',
      title: 'Model Rocket',
    });

    log.recordVisit(first);
    log.recordVisit(second);

    log.syncVisited([first], { visitedLabel: 'Persisted' });

    const entriesAfterSync = Array.from(
      document.querySelectorAll('.poi-narrative-log__entry')
    );
    expect(entriesAfterSync).toHaveLength(1);
    expect(entriesAfterSync[0]?.getAttribute('data-poi-id')).toBe(first.id);
    expect(
      entriesAfterSync[0]?.querySelector('.poi-narrative-log__entry-visited')
        ?.textContent
    ).toBe('Persisted');

    if (liveRegion) {
      liveRegion.textContent = '';
    }

    log.syncVisited([], { visitedLabel: 'Cleared' });
    const empty = document.querySelector('.poi-narrative-log__empty');
    const list = document.querySelector('.poi-narrative-log__list');

    expect(empty?.hidden).toBe(false);
    expect(list?.hidden).toBe(true);

    log.syncVisited([second], { visitedLabel: 'Restored' });
    const restored = document.querySelector(
      '.poi-narrative-log__entry[data-poi-id="dspace-backyard-rocket"]'
    );
    expect(restored).toBeInstanceOf(HTMLElement);
    expect(
      restored?.querySelector('.poi-narrative-log__entry-visited')?.textContent
    ).toBe('Restored');
    expect(liveRegion?.textContent).toBe('');
  });

  it('re-renders journey narration when strings change', () => {
    const log = setup();
    const fromPoi = createPoi();
    const toPoi = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Kinetic Hub',
      roomId: 'studio',
    });

    log.recordJourney(fromPoi, toPoi);

    log.setStrings(AR_STRINGS);

    const journeyLabel = document.querySelector(
      '.poi-narrative-log__journey-label'
    );
    const journeyCaption = document.querySelector(
      '.poi-narrative-log__journey-caption'
    );

    const expectedLabel = formatMessage(AR_STRINGS.journey.entryLabelTemplate, {
      from: AR_STRINGS.rooms.livingRoom.label,
      to: AR_STRINGS.rooms.studio.label,
    });
    const expectedStory = formatMessage(AR_STRINGS.journey.crossRoomTemplate, {
      fromRoom: AR_STRINGS.rooms.livingRoom.label,
      fromDescriptor: AR_STRINGS.rooms.livingRoom.descriptor,
      toRoom: AR_STRINGS.rooms.studio.label,
      toDescriptor: AR_STRINGS.rooms.studio.descriptor,
      toPoi: toPoi.title,
    });

    expect(journeyLabel?.textContent).toBe(expectedLabel);
    expect(journeyCaption?.textContent).toBe(expectedStory);
  });

  it('disposes the log and removes elements from the DOM', () => {
    const log = setup();
    log.dispose();

    expect(document.querySelector('.poi-narrative-log')).toBeNull();
  });

  it('updates headings and visited labels when strings change', () => {
    const log = setup();
    const poi = createPoi();
    log.recordVisit(poi);

    log.setStrings(AR_STRINGS);

    const section = document.querySelector('.poi-narrative-log');
    const sectionHeading = section?.querySelector(
      '.help-modal__section-heading'
    );
    const journeyHeading = section?.querySelector(
      '.poi-narrative-log__journey-heading'
    );
    const visitedHeading = section?.querySelector(
      '.poi-narrative-log__visited-heading'
    );
    const empty = document.querySelector('.poi-narrative-log__empty');
    const journeyEmpty = document.querySelector(
      '.poi-narrative-log__journey-empty'
    );
    const visited = document.querySelector('.poi-narrative-log__entry-visited');
    const region = section;

    expect(sectionHeading?.textContent).toBe(AR_STRINGS.heading);
    expect(journeyHeading?.textContent).toBe(AR_STRINGS.journey.heading);
    expect(visitedHeading?.textContent).toBe(AR_STRINGS.visitedHeading);
    expect(empty?.textContent).toBe(AR_STRINGS.empty);
    expect(journeyEmpty?.textContent).toBe(AR_STRINGS.journey.empty);
    expect(visited?.textContent).toBe(AR_STRINGS.defaultVisitedLabel);
    expect(region?.getAttribute('aria-label')).toBe(AR_STRINGS.heading);
  });
});
