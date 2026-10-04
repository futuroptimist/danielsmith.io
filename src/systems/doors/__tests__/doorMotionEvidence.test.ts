import { describe, expect, it } from 'vitest';

import {
  validateDoorMotion,
  type DoorMotionSample,
} from '../../../../playwright/helpers/doorMotionEvidence';
import type { DoorSnapshot } from '../controller';

const passage = {
  id: 'door',
  center: { x: 32, z: 0 },
  width: 6,
  clearanceProgress: 1,
};
const sample = (
  x: number,
  progress: number,
  state: DoorSnapshot['state'],
  time: number,
  z = 0
): DoorMotionSample => ({
  time,
  x,
  z,
  floor: 'ground',
  door: {
    id: 'door',
    sourceId: 'test.door',
    progress,
    state,
    target: state === 'closed' || state === 'closing' ? 0 : 1,
    blocked: progress < 1,
    occupied: false,
  },
});
const coarseMotion = () => [
  sample(26, 0, 'closed', 0),
  sample(29.96, 1, 'open', 350),
  sample(34.4, 1, 'open', 719.5),
  sample(39, 1, 'open', 1100),
  sample(39, 0.4387, 'closing', 1556.4),
  sample(39, 0.0199, 'closing', 1873.1),
  sample(39, 0, 'closed', 2201),
];

describe('sampled native doorway evidence', () => {
  it.each([-1, 1])(
    'retains coarse-frame crossing proof in direction %s',
    (side) => {
      const motion = coarseMotion().map((entry) => ({
        ...entry,
        x: passage.center.x + (entry.x - passage.center.x) * side,
      }));
      expect(
        motion.filter((entry) => Math.abs(entry.x - 32) <= 1.2)
      ).toHaveLength(0);
      expect(validateDoorMotion(motion, passage, false)).toHaveLength(1);
    }
  );

  it('rejects an obstructed intermediate sample between clear outer endpoints', () => {
    const motion = coarseMotion();
    motion.splice(2, 0, sample(32, 0, 'closed', 500));
    expect(() => validateDoorMotion(motion, passage, false)).toThrow(
      'obstructed'
    );
  });

  it('rejects a blocked crossing endpoint even outside the narrow sample region', () => {
    const motion = coarseMotion();
    motion[2] = sample(34.4, 0, 'closed', 719.5);
    expect(() => validateDoorMotion(motion, passage, false)).toThrow(
      'obstructed'
    );
  });

  it('rejects crossing around the aperture and through an incorrect floor', () => {
    const motion = coarseMotion().map((entry) => ({ ...entry, z: 4 }));
    expect(() => validateDoorMotion(motion, passage, false)).toThrow(
      'aperture'
    );
    const wrongFloor = coarseMotion();
    wrongFloor[2].floor = 'upper';
    expect(() => validateDoorMotion(wrongFloor, passage, false)).toThrow(
      'obstructed'
    );
  });

  it('rejects missing closure, an abrupt closure and a single intermediate point', () => {
    const motion = coarseMotion();
    expect(() =>
      validateDoorMotion(motion.slice(0, -1), passage, false)
    ).toThrow('finish');
    expect(() =>
      validateDoorMotion([...motion.slice(0, 4), motion[6]], passage, false)
    ).toThrow('intermediate');
    expect(() =>
      validateDoorMotion([...motion.slice(0, 5), motion[6]], passage, false)
    ).toThrow('intermediate');
  });

  it('rejects an observed reopening between decreasing closing samples', () => {
    const motion = coarseMotion();
    motion.splice(5, 0, sample(39, 0.9, 'opening', 1700));
    expect(() => validateDoorMotion(motion, passage, false)).toThrow(
      'reversed'
    );
  });

  it('rejects reversed progress and a large sampled jump', () => {
    const reversed = coarseMotion();
    reversed[5].door.progress = 0.8;
    expect(() => validateDoorMotion(reversed, passage, false)).toThrow(
      'reversed'
    );
    const jump = coarseMotion();
    jump[4].door.progress = 0.9;
    expect(() => validateDoorMotion(jump, passage, false)).toThrow(
      'discontinuous'
    );
  });

  it('retains immediate reduced-motion closure and native crossing requirements', () => {
    const motion = coarseMotion();
    expect(
      validateDoorMotion([...motion.slice(0, 4), motion[6]], passage, true)
    ).toHaveLength(1);
    expect(() =>
      validateDoorMotion(
        [motion[0], motion[6]].map((entry) => ({ ...entry, x: 26 })),
        passage,
        true
      )
    ).toThrow('crossing');
  });
});
