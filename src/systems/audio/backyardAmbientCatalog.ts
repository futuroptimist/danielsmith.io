import type { BackyardAmbientAudioBed } from '../../scene/environments/backyard';

import { createLanternChimeBuffer } from './proceduralBuffers';

type BufferFactory = (context: AudioContext) => AudioBuffer;

export interface BackyardAmbientBedDescriptor {
  caption: string;
  captionPriority?: number;
  captionThreshold?: number;
  bufferFactory: BufferFactory;
}

const BACKYARD_AMBIENT_BED_REGISTRY: Record<
  string,
  BackyardAmbientBedDescriptor
> = {
  'backyard-greenhouse-chimes': {
    caption: 'Greenhouse chimes shimmer around the lantern-lined path.',
    captionPriority: 4,
    bufferFactory: createLanternChimeBuffer,
  },
  'backyard-lantern-wave': {
    caption:
      'Lantern beacons ring softly as pulses travel toward the greenhouse.',
    captionPriority: 3,
    captionThreshold: 0.22,
    bufferFactory: createLanternChimeBuffer,
  },
};

export const getBackyardAmbientBedDescriptor = (
  bed: Pick<BackyardAmbientAudioBed, 'id'>
): BackyardAmbientBedDescriptor | null => {
  return BACKYARD_AMBIENT_BED_REGISTRY[bed.id] ?? null;
};
