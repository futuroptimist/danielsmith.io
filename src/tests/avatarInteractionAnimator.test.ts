import { AnimationMixer, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_INTERACTION_DURATION_SECONDS,
  DEFAULT_LEFT_ARM_LIFT_RADIANS,
  DEFAULT_RIGHT_ARM_REACH_RADIANS,
  DEFAULT_TORSO_LEAN_RADIANS,
  bindPoiInteractionAnimation,
  createAvatarInteractionAnimator,
  type AvatarInteractionAnimatorHandle,
} from '../scene/avatar/interactionAnimator';
import type { PoiDefinition } from '../scene/poi/types';

function createRig() {
  const root = new Object3D();
  root.name = 'RigRoot';

  const torso = new Object3D();
  torso.name = 'PortfolioMannequinTorso';
  root.add(torso);

  const rightArm = new Object3D();
  rightArm.name = 'PortfolioMannequinArmRight';
  torso.add(rightArm);

  const leftArm = new Object3D();
  leftArm.name = 'PortfolioMannequinArmLeft';
  torso.add(leftArm);

  const mixer = new AnimationMixer(root);

  const animator = createAvatarInteractionAnimator({
    mixer,
    targets: {
      rightArm,
      leftArm,
      torso,
    },
  });

  return {
    root,
    torso,
    rightArm,
    leftArm,
    mixer,
    animator,
  };
}

describe('createAvatarInteractionAnimator', () => {
  it('animates arms and torso toward interaction poses', () => {
    const rig = createRig();
    rig.animator.triggerInteraction();

    const peakTime = DEFAULT_INTERACTION_DURATION_SECONDS * 0.45;
    rig.mixer.update(peakTime);

    expect(rig.rightArm.rotation.x).toBeCloseTo(
      DEFAULT_RIGHT_ARM_REACH_RADIANS,
      5
    );
    expect(rig.leftArm.rotation.x).toBeCloseTo(
      DEFAULT_LEFT_ARM_LIFT_RADIANS,
      5
    );
    expect(rig.torso.rotation.z).toBeCloseTo(DEFAULT_TORSO_LEAN_RADIANS, 5);

    rig.mixer.update(DEFAULT_INTERACTION_DURATION_SECONDS);

    expect(rig.rightArm.rotation.x).toBeCloseTo(0, 5);
    expect(rig.leftArm.rotation.x).toBeCloseTo(0, 5);
    expect(rig.torso.rotation.z).toBeCloseTo(0, 5);
  });

  it('scales the interaction intensity', () => {
    const rig = createRig();
    const halfIntensity = 0.5;
    rig.animator.triggerInteraction({ intensity: halfIntensity });

    rig.mixer.update(DEFAULT_INTERACTION_DURATION_SECONDS * 0.45);

    expect(rig.rightArm.rotation.x).toBeCloseTo(
      DEFAULT_RIGHT_ARM_REACH_RADIANS * halfIntensity,
      5
    );
    expect(rig.leftArm.rotation.x).toBeCloseTo(
      DEFAULT_LEFT_ARM_LIFT_RADIANS * halfIntensity,
      5
    );
    expect(rig.torso.rotation.z).toBeCloseTo(
      DEFAULT_TORSO_LEAN_RADIANS * halfIntensity,
      5
    );
  });

  it('ignores triggers after disposal', () => {
    const rig = createRig();
    rig.animator.dispose();
    rig.animator.triggerInteraction();

    rig.mixer.update(DEFAULT_INTERACTION_DURATION_SECONDS * 0.45);

    expect(rig.rightArm.rotation.x).toBe(0);
    expect(rig.leftArm.rotation.x).toBe(0);
    expect(rig.torso.rotation.z).toBe(0);
  });
});

describe('bindPoiInteractionAnimation', () => {
  const basePoi: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Test',
    summary: 'Summary',
    interactionPrompt: 'Inspect Test',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2.4,
    footprint: { width: 1, depth: 1 },
  };

  it('maps POI selections to interaction triggers with normalized intensity', () => {
    const triggerMock = vi.fn();
    const animator: AvatarInteractionAnimatorHandle = {
      triggerInteraction: triggerMock,
      dispose: vi.fn(),
    };
    const listeners: Array<(poi: PoiDefinition) => void> = [];
    const unsubscribe = vi.fn();
    const source = {
      addSelectionListener(listener: (poi: PoiDefinition) => void) {
        listeners.push(listener);
        return unsubscribe;
      },
    };

    const unbind = bindPoiInteractionAnimation({ source, animator });

    expect(listeners).toHaveLength(1);

    listeners[0](basePoi);
    listeners[0]({ ...basePoi, interactionRadius: 1.2 });
    listeners[0]({
      ...basePoi,
      interaction: 'activate',
      interactionRadius: 3.4,
    });

    expect(triggerMock).toHaveBeenCalledTimes(3);
    const calls = triggerMock.mock.calls;
    expect(calls[0][0].intensity).toBeGreaterThan(0.3);
    expect(calls[0][0].intensity).toBeLessThanOrEqual(1);
    expect(calls[1][0].intensity).toBeGreaterThanOrEqual(0.3);
    expect(calls[1][0].intensity).toBeLessThan(calls[0][0].intensity);
    expect(calls[2][0].intensity).toBeLessThanOrEqual(1);
    expect(calls[2][0].intensity).toBeGreaterThan(calls[0][0].intensity);

    unbind();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('supports custom intensity resolvers', () => {
    const triggerMock = vi.fn();
    const animator: AvatarInteractionAnimatorHandle = {
      triggerInteraction: triggerMock,
      dispose: vi.fn(),
    };
    const source = {
      addSelectionListener(listener: (poi: PoiDefinition) => void) {
        listener(basePoi);
        return () => {};
      },
    };

    bindPoiInteractionAnimation({
      source,
      animator,
      intensityResolver: () => 0.84,
    });

    expect(triggerMock).toHaveBeenCalledWith({ intensity: 0.84 });
  });
});
