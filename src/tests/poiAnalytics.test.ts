import { describe, expect, it, beforeEach } from 'vitest';

import { createWindowPoiAnalytics } from '../scene/poi/analytics';
import type { PoiDefinition } from '../scene/poi/types';

describe('createWindowPoiAnalytics', () => {
  let poi: PoiDefinition;

  beforeEach(() => {
    poi = {
      id: 'futuroptimist-living-room-tv',
      title: 'Futuroptimist Creator Desk',
      summary:
        'Triple-monitor editing suite showcasing Futuroptimist workflows.',
      category: 'project',
      interaction: 'inspect',
      roomId: 'livingRoom',
      position: { x: 0, y: 0, z: 0 },
      interactionRadius: 2,
      footprint: { width: 1, depth: 1 },
    };
  });

  it('dispatches hover lifecycle events with POI details', () => {
    const analytics = createWindowPoiAnalytics();
    const started: CustomEvent[] = [];
    const ended: CustomEvent[] = [];

    const hoverStartedHandler = (event: Event) => {
      started.push(event as CustomEvent);
    };
    const hoverEndedHandler = (event: Event) => {
      ended.push(event as CustomEvent);
    };

    window.addEventListener('poi:hover-started', hoverStartedHandler);
    window.addEventListener('poi:hover-ended', hoverEndedHandler);

    analytics.hoverStarted?.(poi);
    analytics.hoverEnded?.(poi);

    expect(started).toHaveLength(1);
    expect(started[0].detail.poi).toEqual(poi);
    expect(ended).toHaveLength(1);
    expect(ended[0].detail.poi).toEqual(poi);

    window.removeEventListener('poi:hover-started', hoverStartedHandler);
    window.removeEventListener('poi:hover-ended', hoverEndedHandler);
  });

  it('dispatches selection analytics events with POI details', () => {
    const analytics = createWindowPoiAnalytics();
    const selected: CustomEvent[] = [];
    const cleared: CustomEvent[] = [];

    const selectedHandler = (event: Event) => {
      selected.push(event as CustomEvent);
    };
    const clearedHandler = (event: Event) => {
      cleared.push(event as CustomEvent);
    };

    window.addEventListener('poi:selected:analytics', selectedHandler);
    window.addEventListener('poi:selection-cleared', clearedHandler);

    analytics.selected?.(poi);
    analytics.selectionCleared?.(poi);

    expect(selected).toHaveLength(1);
    expect(selected[0].detail.poi).toEqual(poi);
    expect(cleared).toHaveLength(1);
    expect(cleared[0].detail.poi).toEqual(poi);

    window.removeEventListener('poi:selected:analytics', selectedHandler);
    window.removeEventListener('poi:selection-cleared', clearedHandler);
  });
});
