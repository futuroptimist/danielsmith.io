import { describe, expect, it, vi } from 'vitest';

import { GuidedTourChannel } from '../scene/poi/guidedTourChannel';
import type { GuidedTourSource } from '../scene/poi/guidedTourChannel';
import type { PoiDefinition, PoiId } from '../scene/poi/types';

const ids: PoiId[] = [
  'futuroptimist-living-room-tv',
  'flywheel-studio-flywheel',
  'jobbot-studio-terminal',
  'dspace-backyard-rocket',
];

const samplePoi = (id: PoiId): PoiDefinition => ({
  id,
  title: `POI ${id}`,
  summary: 'Summary',
  category: 'project',
  interaction: 'inspect',
  roomId: 'studio',
  position: { x: 0, y: 0, z: 0 },
  interactionRadius: 1,
  footprint: { width: 1, depth: 1 },
  interactionPrompt: 'Inspect exhibit',
});

const createSource = () => {
  const listeners = new Set<(poi: PoiDefinition | null) => void>();
  return {
    listeners,
    source: {
      subscribe(listener) {
        listeners.add(listener);
        listener(samplePoi(ids[0]));
        return () => {
          listeners.delete(listener);
        };
      },
    } satisfies GuidedTourSource,
    emit(poi: PoiDefinition | null) {
      listeners.forEach((listener) => listener(poi));
    },
  };
};

describe('GuidedTourChannel', () => {
  it('forwards recommendations when enabled', () => {
    const { source, emit } = createSource();
    const channel = new GuidedTourChannel({ source });
    const updates: Array<string | null> = [];

    channel.subscribe((recommendation) => {
      updates.push(recommendation?.id ?? null);
    });

    emit(samplePoi(ids[1]));
    emit(samplePoi(ids[2]));

    expect(updates).toEqual([
      'futuroptimist-living-room-tv',
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
    ]);
    channel.dispose();
  });

  it('suppresses recommendations when disabled', () => {
    const { source, emit } = createSource();
    const channel = new GuidedTourChannel({ source, enabled: false });
    const listener = vi.fn();
    channel.subscribe(listener);

    emit(samplePoi(ids[3]));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(null);

    channel.setEnabled(true);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: ids[3] })
    );

    channel.setEnabled(false);
    expect(listener).toHaveBeenLastCalledWith(null);

    channel.dispose();
  });

  it('unsubscribes from the source on dispose', () => {
    const { source, emit, listeners } = createSource();
    const channel = new GuidedTourChannel({ source });
    const listener = vi.fn();
    channel.subscribe(listener);

    expect(listeners.size).toBe(1);
    channel.dispose();
    expect(listeners.size).toBe(0);

    emit(samplePoi(ids[1]));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
