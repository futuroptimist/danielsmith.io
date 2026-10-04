import type {
  DoorDefinition,
  DoorSnapshot,
} from '../../src/systems/doors/controller';

export interface DoorMotionSample {
  time: number;
  x: number;
  z: number;
  floor: string;
  door: DoorSnapshot;
}

type Passage = Pick<
  DoorDefinition,
  'id' | 'center' | 'width' | 'clearanceProgress'
>;

/** Validate observed motion; deterministic collision tests cover unsampled intervals. */
export function validateDoorMotion(
  motion: readonly DoorMotionSample[],
  passage: Passage,
  reducedMotion: boolean
) {
  const assertClear = (sample: DoorMotionSample) => {
    if (
      sample.floor !== 'ground' ||
      sample.door.blocked ||
      sample.door.progress < passage.clearanceProgress
    )
      throw new Error('Observed obstructed doorway passage');
  };
  for (const sample of motion) {
    if (
      ![sample.time, sample.x, sample.z, sample.door.progress].every(
        Number.isFinite
      ) ||
      sample.door.id !== passage.id ||
      sample.door.progress < 0 ||
      sample.door.progress > 1
    )
      throw new Error('Invalid doorway observation');
    if (Math.abs(sample.x - passage.center.x) <= 1.2) assertClear(sample);
  }
  const crossings: Array<{
    before: DoorMotionSample;
    after: DoorMotionSample;
  }> = [];
  for (let index = 1; index < motion.length; index++) {
    const before = motion[index - 1];
    const after = motion[index];
    const from = before.x - passage.center.x;
    const to = after.x - passage.center.x;
    if (from === to || from * to > 0) continue;
    const fraction = -from / (to - from);
    const z = before.z + (after.z - before.z) * fraction;
    if (Math.abs(z - passage.center.z) > passage.width / 2 - 0.75)
      throw new Error('Observed crossing bypassed the doorway aperture');
    // A coarse native frame can cross the entire threshold between RAF samples.
    // Keep every sampled threshold check and inspect every adjacent crossing;
    // safe outer endpoints never discard an obstructed intermediate sample.
    if (before.floor !== 'ground')
      throw new Error('Observed obstructed doorway passage');
    assertClear(after);
    crossings.push({ before, after });
  }
  if (!crossings.length) throw new Error('No observed native doorway crossing');
  if (motion.at(-1)?.door.state !== 'closed')
    throw new Error('Departure did not finish closing the door');
  if (!reducedMotion) {
    const closing = motion.filter((sample) => sample.door.state === 'closing');
    if (
      closing.some(
        (sample) =>
          sample.door.progress <= 0 ||
          sample.door.progress >= 1 ||
          sample.door.target !== 0
      )
    )
      throw new Error('Invalid intermediate closing observation');
    if (new Set(closing.map((sample) => sample.door.progress)).size < 2)
      throw new Error('Insufficient intermediate closing observations');
    const start = motion.findIndex((sample) => sample.door.state === 'closing');
    for (let index = start; index < motion.length; index++) {
      const current = motion[index].door;
      const previous = motion[index - 1]?.door;
      if (
        current.target !== 0 ||
        !['closing', 'closed'].includes(current.state) ||
        (previous &&
          (current.progress > previous.progress ||
            previous.progress - current.progress >= 0.7))
      )
        throw new Error('Observed discontinuous or reversed departure closure');
    }
  }
  return crossings;
}
