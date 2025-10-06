import { describe, expect, it } from 'vitest';

import { PoiTourGuide } from '../poi/tourGuide';
import type { PoiDefinition } from '../poi/types';
import { PoiVisitedState } from '../poi/visitedState';

const DEFINITIONS: PoiDefinition[] = [
  {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist TV Wall',
    summary: 'Living room media wall with immersive tooling.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2.4,
    footprint: { width: 3, depth: 2 },
  },
  {
    id: 'flywheel-studio-flywheel',
    title: 'Flywheel Kinetic Hub',
    summary: 'Automation centerpiece with responsive rotation.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 2, y: 0, z: 4 },
    interactionRadius: 2.2,
    footprint: { width: 2, depth: 2 },
  },
  {
    id: 'jobbot-studio-terminal',
    title: 'Jobbot Holographic Terminal',
    summary: 'Telemetry console broadcasting automation metrics.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 4, y: 0, z: 6 },
    interactionRadius: 2.3,
    footprint: { width: 2.4, depth: 2 },
  },
  {
    id: 'dspace-backyard-rocket',
    title: 'dSpace Launch Pad',
    summary: 'Backyard launch gantry staging the dSpace model rocket.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: -4, y: 0, z: 8 },
    interactionRadius: 2.6,
    footprint: { width: 3.4, depth: 3.4 },
  },
];

const createVisitedState = () => new PoiVisitedState({ storage: null });

describe('PoiTourGuide', () => {
  it('recommends the first unvisited POI using the configured priority order', () => {
    const visitedState = createVisitedState();
    const guide = new PoiTourGuide({
      definitions: DEFINITIONS,
      visitedState,
      priorityOrder: [
        'flywheel-studio-flywheel',
        'futuroptimist-living-room-tv',
        'flywheel-studio-flywheel',
        'sugarkube-backyard-greenhouse',
      ],
    });

    const recommendations: Array<string | null> = [];
    const unsubscribe = guide.subscribe((recommendation) => {
      recommendations.push(recommendation?.id ?? null);
    });

    expect(recommendations.at(-1)).toBe('flywheel-studio-flywheel');

    visitedState.markVisited('flywheel-studio-flywheel');
    expect(recommendations.at(-1)).toBe('futuroptimist-living-room-tv');

    visitedState.markVisited('futuroptimist-living-room-tv');
    expect(recommendations.at(-1)).toBe('dspace-backyard-rocket');

    visitedState.markVisited('dspace-backyard-rocket');
    expect(recommendations.at(-1)).toBe('jobbot-studio-terminal');

    visitedState.markVisited('jobbot-studio-terminal');
    expect(recommendations.at(-1)).toBe(null);

    unsubscribe();
    guide.dispose();
  });

  it('updates recommendation when the priority order changes', () => {
    const visitedState = createVisitedState();
    const guide = new PoiTourGuide({
      definitions: DEFINITIONS,
      visitedState,
    });

    let latest: string | null = null;
    const unsubscribe = guide.subscribe((recommendation) => {
      latest = recommendation?.id ?? null;
    });

    expect(latest).toBe('futuroptimist-living-room-tv');

    guide.setPriorityOrder([
      'jobbot-studio-terminal',
      'futuroptimist-living-room-tv',
      'jobbot-studio-terminal',
    ]);
    expect(latest).toBe('jobbot-studio-terminal');

    guide.setPriorityOrder([
      'jobbot-studio-terminal',
      'futuroptimist-living-room-tv',
      'jobbot-studio-terminal',
    ]);
    expect(latest).toBe('jobbot-studio-terminal');

    unsubscribe();
    guide.dispose();
  });

  it('stops notifying listeners after dispose', () => {
    const visitedState = createVisitedState();
    const guide = new PoiTourGuide({
      definitions: DEFINITIONS,
      visitedState,
    });

    const recommendations: Array<string | null> = [];
    guide.subscribe((recommendation) => {
      recommendations.push(recommendation?.id ?? null);
    });

    guide.dispose();
    visitedState.markVisited('futuroptimist-living-room-tv');

    expect(recommendations).toEqual(['futuroptimist-living-room-tv']);
  });
});
