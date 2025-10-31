import { describe, expect, it } from 'vitest';

import { getBackyardAmbientBedDescriptor } from '../systems/audio/backyardAmbientCatalog';
import { createLanternChimeBuffer } from '../systems/audio/proceduralBuffers';

describe('backyard ambient catalog', () => {
  it('exposes descriptor for greenhouse chimes bed', () => {
    const descriptor = getBackyardAmbientBedDescriptor({
      id: 'backyard-greenhouse-chimes',
    });
    expect(descriptor).not.toBeNull();
    expect(descriptor?.caption).toBe(
      'Greenhouse chimes shimmer around the lantern-lined path.'
    );
    expect(descriptor?.captionPriority).toBe(4);
    expect(descriptor?.bufferFactory).toBe(createLanternChimeBuffer);
  });

  it('exposes descriptor for lantern wave bed with custom threshold', () => {
    const descriptor = getBackyardAmbientBedDescriptor({
      id: 'backyard-lantern-wave',
    });
    expect(descriptor).not.toBeNull();
    expect(descriptor?.caption).toBe(
      'Lantern beacons ring softly as pulses travel toward the greenhouse.'
    );
    expect(descriptor?.captionPriority).toBe(3);
    expect(descriptor?.captionThreshold).toBeCloseTo(0.22, 5);
    expect(descriptor?.bufferFactory).toBe(createLanternChimeBuffer);
  });

  it('returns null when a bed id is not registered', () => {
    expect(getBackyardAmbientBedDescriptor({ id: 'unknown-bed' })).toBeNull();
  });
});
