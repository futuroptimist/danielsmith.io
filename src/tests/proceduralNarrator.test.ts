import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PoiDefinition } from '../scene/poi/types';
import { ProceduralNarrator } from '../systems/narrative/proceduralNarrator';
import type { PoiNarrativeLogHandle } from '../ui/hud/poiNarrativeLog';

const createPoi = (overrides: Partial<PoiDefinition> = {}): PoiDefinition => {
  const title = overrides.title ?? 'Test POI';
  return {
    id: 'futuroptimist-living-room-tv',
    title,
    summary: overrides.summary ?? 'Summary',
    interactionPrompt: overrides.interactionPrompt ?? `Inspect ${title}`,
    category: 'project',
    interaction: 'inspect',
    roomId: overrides.roomId ?? 'livingRoom',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    interactionRadius: overrides.interactionRadius ?? 2,
    footprint: overrides.footprint ?? { width: 1, depth: 1 },
    metrics: overrides.metrics,
    links: overrides.links,
    narration: overrides.narration,
    ...overrides,
  };
};

const createLogStub = () => {
  const element = document.createElement('section');
  const stub: PoiNarrativeLogHandle = {
    element,
    recordVisit: vi.fn(),
    recordJourney: vi.fn(),
    clearJourneys: vi.fn(),
    syncVisited: vi.fn(),
    setStrings: vi.fn(),
    dispose: vi.fn(),
  };
  return stub;
};

describe('ProceduralNarrator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('emits a journey after a prior visit is known', () => {
    const fromPoi = createPoi({
      id: 'futuroptimist-living-room-tv',
      title: 'From',
      roomId: 'livingRoom',
    });
    const toPoi = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'To',
      roomId: 'studio',
    });
    const log = createLogStub();
    const narrator = new ProceduralNarrator({
      log,
      definitions: [fromPoi, toPoi],
    });

    narrator.handleVisit(fromPoi);
    const internals = narrator as unknown as {
      lastVisitedId: string | null;
      definitionsById: Map<string, PoiDefinition>;
    };
    expect(internals.lastVisitedId).toBe(fromPoi.id);
    expect(Array.from(internals.definitionsById.keys())).toEqual([
      fromPoi.id,
      toPoi.id,
    ]);
    expect(log.recordJourney).not.toHaveBeenCalled();

    narrator.handleVisit(toPoi);
    expect(internals.lastVisitedId).toBe(toPoi.id);
    expect(log.recordJourney).toHaveBeenCalledTimes(1);
    expect(log.recordJourney).toHaveBeenCalledTimes(1);
    expect(log.recordJourney).toHaveBeenCalledWith(fromPoi, toPoi);
  });

  it('ignores repeat visits to the same exhibit', () => {
    const poi = createPoi({
      id: 'futuroptimist-living-room-tv',
      title: 'Loop',
      roomId: 'livingRoom',
    });
    const log = createLogStub();
    const narrator = new ProceduralNarrator({ log, definitions: [poi] });

    narrator.primeVisited([poi]);
    narrator.handleVisit(poi);

    expect(log.recordJourney).not.toHaveBeenCalled();
  });

  it('primes previously visited exhibits and resets gracefully', () => {
    const firstPoi = createPoi({
      id: 'futuroptimist-living-room-tv',
      title: 'Alpha',
      roomId: 'livingRoom',
    });
    const secondPoi = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'Beta',
      roomId: 'studio',
    });
    const thirdPoi = createPoi({
      id: 'jobbot-studio-terminal',
      title: 'Gamma',
      roomId: 'backyard',
    });
    const log = createLogStub();
    const narrator = new ProceduralNarrator({
      log,
      definitions: [firstPoi, secondPoi, thirdPoi],
    });

    narrator.primeVisited([firstPoi, secondPoi]);
    narrator.handleVisit(thirdPoi);
    expect(log.recordJourney).toHaveBeenLastCalledWith(secondPoi, thirdPoi);

    narrator.reset();
    log.recordJourney.mockClear();
    narrator.handleVisit(firstPoi);
    expect(log.recordJourney).not.toHaveBeenCalled();

    narrator.primeVisited([]);
    narrator.handleVisit(secondPoi);
    expect(log.recordJourney).not.toHaveBeenCalled();
  });

  it('does not emit journeys when the previous definition cannot be resolved', () => {
    const orphanPoi = createPoi({
      id: 'sugarkube-backyard-greenhouse',
      title: 'Orphan',
    });
    const toPoi = createPoi({
      id: 'tokenplace-studio-cluster',
      title: 'Next stop',
      roomId: 'studio',
    });
    const log = createLogStub();
    const narrator = new ProceduralNarrator({ log, definitions: [] });

    (narrator as unknown as { lastVisitedId: string | null }).lastVisitedId =
      orphanPoi.id;

    narrator.handleVisit(toPoi);
    expect(log.recordJourney).not.toHaveBeenCalled();
  });

  it('clears stored state on dispose', () => {
    const firstPoi = createPoi({
      id: 'futuroptimist-living-room-tv',
      title: 'Alpha',
    });
    const secondPoi = createPoi({
      id: 'flywheel-studio-flywheel',
      title: 'Beta',
    });
    const log = createLogStub();
    const narrator = new ProceduralNarrator({
      log,
      definitions: [firstPoi, secondPoi],
    });

    narrator.handleVisit(firstPoi);
    narrator.dispose();

    log.recordJourney.mockClear();
    narrator.handleVisit(secondPoi);

    expect(log.recordJourney).not.toHaveBeenCalled();
  });
});
