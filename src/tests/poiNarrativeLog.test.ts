import { beforeEach, describe, expect, it } from 'vitest';

import type { PoiNarrativeLogStrings } from '../assets/i18n';
import type { PoiDefinition } from '../scene/poi/types';
import { createPoiNarrativeLog } from '../ui/hud/poiNarrativeLog';

const STRINGS: PoiNarrativeLogStrings = {
  heading: 'Story log',
  empty: 'Visit exhibits to unlock story entries.',
  defaultVisitedLabel: 'Visited',
  visitedLabelTemplate: 'Visited at {time}',
  liveAnnouncementTemplate: '{title} logged.',
};

const AR_STRINGS: PoiNarrativeLogStrings = {
  heading: 'سجل القصة',
  empty: 'قم بزيارة المعارض لفتح إدخالات جديدة.',
  defaultVisitedLabel: 'تمت الزيارة',
  visitedLabelTemplate: 'تمت الزيارة في {time}',
  liveAnnouncementTemplate: '{title} أضيف.',
};

const createPoi = (overrides: Partial<PoiDefinition> = {}): PoiDefinition => ({
  id: 'futuroptimist-living-room-tv',
  title: 'Futuroptimist Creator Desk',
  summary: 'Default summary',
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
    const empty = document.querySelector('.poi-narrative-log__empty');
    const list = document.querySelector('.poi-narrative-log__list');

    expect(section).toBeInstanceOf(HTMLElement);
    expect(empty).toBeInstanceOf(HTMLElement);
    expect(empty?.textContent).toBe(STRINGS.empty);
    expect(empty?.getAttribute('hidden')).toBeNull();
    expect(list).toBeInstanceOf(HTMLElement);
    expect(list?.getAttribute('hidden')).toBe('');
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
    const empty = document.querySelector('.poi-narrative-log__empty');
    const list = document.querySelector('.poi-narrative-log__list');
    const liveRegion = document.querySelector(
      '.poi-narrative-log__live-region'
    );

    expect(entry).toBeInstanceOf(HTMLElement);
    expect(title?.textContent).toBe(poi.title);
    expect(caption?.textContent).toBe('Narrative caption');
    expect(visited?.textContent).toBe('Visited just now');
    expect(empty?.hidden).toBe(true);
    expect(list?.hidden).toBe(false);
    expect(liveRegion?.textContent).toBe(`${poi.title} logged.`);
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
    const empty = document.querySelector('.poi-narrative-log__empty');
    const visited = document.querySelector('.poi-narrative-log__entry-visited');
    const region = section;

    expect(sectionHeading?.textContent).toBe(AR_STRINGS.heading);
    expect(empty?.textContent).toBe(AR_STRINGS.empty);
    expect(visited?.textContent).toBe(AR_STRINGS.defaultVisitedLabel);
    expect(region?.getAttribute('aria-label')).toBe(AR_STRINGS.heading);
  });
});
