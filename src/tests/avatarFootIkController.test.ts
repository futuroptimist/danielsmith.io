import { Group, Object3D, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { createAvatarFootIkController } from '../scene/avatar/footIkController';

describe('createAvatarFootIkController', () => {
  it('matches sampled heights per foot and offsets the pelvis', () => {
    const pelvis = new Group();
    pelvis.position.y = 1;

    const leftFoot = new Group();
    leftFoot.position.set(-0.25, 0, 0);
    pelvis.add(leftFoot);

    const rightFoot = new Group();
    rightFoot.position.set(0.25, 0, 0.3);
    pelvis.add(rightFoot);

    const controller = createAvatarFootIkController({
      leftFoot,
      rightFoot,
      pelvis,
      maxFootOffset: 1,
      slopeSampleDistance: 0.3,
      smoothing: {
        foot: Number.POSITIVE_INFINITY,
        rotation: Number.POSITIVE_INFINITY,
        pelvis: Number.POSITIVE_INFINITY,
      },
      pelvisWeight: 1,
      maxPelvisOffset: 0.5,
    });

    controller.update({
      delta: 1 / 60,
      sampleHeight(_position, foot) {
        return foot === 'left' ? 0.05 : 0.2;
      },
    });

    expect(leftFoot.position.y).toBeCloseTo(-0.95, 6);
    expect(rightFoot.position.y).toBeCloseTo(-0.8, 6);
    expect(pelvis.position.y).toBeCloseTo(0.5, 6);

    controller.dispose();
    expect(leftFoot.position.y).toBeCloseTo(0, 6);
    expect(rightFoot.position.y).toBeCloseTo(0, 6);
    expect(pelvis.position.y).toBeCloseTo(1, 6);
  });

  it('tilts feet to follow sampled slope along their forward axis', () => {
    const pelvis = new Group();
    const leftFoot = new Group();
    leftFoot.position.set(-0.2, 0, 0);
    pelvis.add(leftFoot);

    const rightFoot = new Group();
    rightFoot.position.set(0.2, 0, 0);
    pelvis.add(rightFoot);

    const controller = createAvatarFootIkController({
      leftFoot,
      rightFoot,
      pelvis,
      maxFootOffset: 1,
      maxFootPitch: Math.PI / 4,
      slopeSampleDistance: 0.4,
      smoothing: {
        foot: Number.POSITIVE_INFINITY,
        rotation: Number.POSITIVE_INFINITY,
        pelvis: Number.POSITIVE_INFINITY,
      },
      pelvisWeight: 0,
    });

    const baseRotation = rightFoot.rotation.x;

    controller.update({
      delta: 1 / 60,
      sampleHeight({ y }, foot) {
        if (foot === 'right') {
          return y >= 0.4 ? 0.3 : 0.15;
        }
        return 0.1;
      },
    });

    const rotationDiff = rightFoot.rotation.x - baseRotation;
    expect(rotationDiff).toBeGreaterThan(0.3);
    expect(rotationDiff).toBeLessThanOrEqual(Math.PI / 4 + 1e-6);
    expect(Math.abs(leftFoot.rotation.x)).toBeLessThan(1e-6);
  });

  it('falls back to default forward axis when foot orientation points upward', () => {
    const pelvis = new Group();
    const leftFoot = new Group();
    leftFoot.position.set(-0.2, 0, 0);
    pelvis.add(leftFoot);

    const rightFoot = new Group();
    rightFoot.position.set(0.2, 0, 0);
    // Rotate so local forward points upward, forcing zero-length planar projection.
    rightFoot.quaternion.multiply(
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2)
    );
    pelvis.add(rightFoot);

    const controller = createAvatarFootIkController({
      leftFoot,
      rightFoot,
      pelvis,
      maxFootOffset: 1,
      slopeSampleDistance: 0.3,
      smoothing: {
        foot: Number.POSITIVE_INFINITY,
        rotation: Number.POSITIVE_INFINITY,
        pelvis: Number.POSITIVE_INFINITY,
      },
    });

    const baseRotation = rightFoot.rotation.x;

    controller.update({
      delta: 1 / 60,
      sampleHeight({ y }, foot) {
        return foot === 'right' && y >= 0.3 ? 0.2 : 0.1;
      },
    });

    const fallbackDiff = rightFoot.rotation.x - baseRotation;
    expect(fallbackDiff).toBeGreaterThan(0.25);
    expect(fallbackDiff).toBeLessThanOrEqual(Math.PI / 4 + 1e-6);
  });

  it('treats non-finite height samples as ground level', () => {
    const leftFoot = new Group();
    const rightFoot = new Group();
    const controller = createAvatarFootIkController({
      leftFoot,
      rightFoot,
      maxFootOffset: 0.4,
      smoothing: {
        foot: Number.POSITIVE_INFINITY,
        rotation: Number.POSITIVE_INFINITY,
      },
    });

    controller.update({
      delta: 1 / 60,
      sampleHeight() {
        return Number.NaN;
      },
    });

    expect(leftFoot.position.y).toBeCloseTo(0, 6);
    expect(rightFoot.position.y).toBeCloseTo(0, 6);
  });

  it('emits contact events when a foot settles onto a sampled surface', () => {
    const leftFoot = new Group();
    const rightFoot = new Group();
    const contacts: Array<{ foot: string; height: number }> = [];
    let leftSample = 0;
    let rightSample = 0;
    const controller = createAvatarFootIkController({
      leftFoot,
      rightFoot,
      maxFootOffset: 0.5,
      smoothing: {
        foot: 12,
        rotation: Number.POSITIVE_INFINITY,
      },
      contact: { offsetTolerance: 0.01 },
      events: {
        onFootContact: ({ foot, worldHeight }) => {
          contacts.push({ foot, height: worldHeight });
        },
      },
    });

    const performUpdate = () =>
      controller.update({
        delta: 1 / 30,
        sampleHeight(_, foot) {
          return foot === 'left' ? leftSample : rightSample;
        },
      });

    performUpdate();
    expect(contacts).toHaveLength(0);

    leftSample = 0.18;
    for (let i = 0; i < 12; i += 1) {
      performUpdate();
    }
    expect(contacts).toHaveLength(1);
    expect(contacts[0].foot).toBe('left');
    expect(contacts[0].height).toBeCloseTo(0.18, 3);

    leftSample = 0;
    rightSample = 0.12;
    for (let i = 0; i < 14; i += 1) {
      performUpdate();
    }

    expect(contacts.length).toBeGreaterThanOrEqual(3);
    const subsequent = contacts.slice(1);
    const nextLeft = subsequent.find((event) => event.foot === 'left');
    const nextRight = subsequent.find((event) => event.foot === 'right');
    expect(nextLeft?.height ?? Number.NaN).toBeCloseTo(0, 3);
    expect(nextRight?.height ?? Number.NaN).toBeCloseTo(0.12, 3);

    controller.dispose();
  });

  it('throws when foot objects are missing', () => {
    expect(() =>
      createAvatarFootIkController({
        leftFoot: undefined as unknown as Object3D,
        rightFoot: new Group(),
      })
    ).toThrow(/left foot/i);
    expect(() =>
      createAvatarFootIkController({
        leftFoot: new Group(),
        rightFoot: undefined as unknown as Object3D,
      })
    ).toThrow(/right foot/i);
  });
});
