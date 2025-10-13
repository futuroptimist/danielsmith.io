import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  MathUtils,
  NumberKeyframeTrack,
  type Object3D,
} from 'three';

import type { PoiDefinition } from '../poi/types';

export interface AvatarInteractionAnimatorHandle {
  triggerInteraction(options?: { intensity?: number }): void;
  dispose(): void;
}

export interface AvatarInteractionAnimatorOptions {
  mixer: AnimationMixer;
  targets: {
    rightArm: Object3D;
    leftArm?: Object3D | null;
    torso?: Object3D | null;
  };
  durationSeconds?: number;
  rightArmReachRadians?: number;
  leftArmLiftRadians?: number;
  torsoLeanRadians?: number;
}

export const DEFAULT_INTERACTION_DURATION_SECONDS = 0.9;
export const DEFAULT_RIGHT_ARM_REACH_RADIANS = -0.72;
export const DEFAULT_LEFT_ARM_LIFT_RADIANS = 0.32;
export const DEFAULT_TORSO_LEAN_RADIANS = 0.12;

function assertNamedTarget(
  target: Object3D | null | undefined,
  label: string
): Object3D {
  if (!target) {
    throw new Error(`Avatar interaction animator missing target: ${label}`);
  }
  if (!target.name) {
    throw new Error(`Avatar interaction animator target is unnamed: ${label}`);
  }
  return target;
}

function buildRotationTrack(
  object: Object3D,
  component: 'x' | 'y' | 'z',
  offset: number,
  durationSeconds: number
) {
  const times = [0, durationSeconds * 0.45, durationSeconds];
  const base = object.rotation[component];
  const values = [base, base + offset, base];
  return new NumberKeyframeTrack(
    `${object.name}.rotation[${component}]`,
    times,
    values
  );
}

export function createAvatarInteractionAnimator(
  options: AvatarInteractionAnimatorOptions
): AvatarInteractionAnimatorHandle {
  const duration = Math.max(
    options.durationSeconds ?? DEFAULT_INTERACTION_DURATION_SECONDS,
    0.1
  );
  const rightArm = assertNamedTarget(options.targets.rightArm, 'rightArm');
  const leftArm = options.targets.leftArm
    ? assertNamedTarget(options.targets.leftArm, 'leftArm')
    : null;
  const torso = options.targets.torso
    ? assertNamedTarget(options.targets.torso, 'torso')
    : null;

  const rightArmReach =
    options.rightArmReachRadians ?? DEFAULT_RIGHT_ARM_REACH_RADIANS;
  const leftArmLift =
    options.leftArmLiftRadians ?? DEFAULT_LEFT_ARM_LIFT_RADIANS;
  const torsoLean = options.torsoLeanRadians ?? DEFAULT_TORSO_LEAN_RADIANS;

  const tracks = [buildRotationTrack(rightArm, 'x', rightArmReach, duration)];
  if (leftArm) {
    tracks.push(buildRotationTrack(leftArm, 'x', leftArmLift, duration));
  }
  if (torso) {
    tracks.push(buildRotationTrack(torso, 'z', torsoLean, duration));
  }

  const clip = new AnimationClip('AvatarInteract', duration, tracks);
  const action = options.mixer.clipAction(clip);
  action.loop = LoopOnce;
  action.clampWhenFinished = true;

  let disposed = false;

  const playInteraction = (intensity: number) => {
    if (disposed) {
      return;
    }
    const clampedIntensity = MathUtils.clamp(intensity, 0, 1);
    action.enabled = clampedIntensity > 1e-3;
    action.reset();
    action.setEffectiveWeight(clampedIntensity);
    action.timeScale = 1;
    action.play();
  };

  return {
    triggerInteraction({ intensity = 1 }: { intensity?: number } = {}) {
      playInteraction(intensity);
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      action.stop();
      action.enabled = false;
    },
  };
}

export interface PoiInteractionAnimationBindingOptions {
  source: {
    addSelectionListener(listener: (poi: PoiDefinition) => void): () => void;
  };
  animator: AvatarInteractionAnimatorHandle;
  intensityResolver?: (poi: PoiDefinition) => number;
}

const DEFAULT_RADIUS_INTENSITY_RANGE = { min: 1.6, max: 3.2 } as const;

function defaultIntensityResolver(poi: PoiDefinition): number {
  const radius = Math.max(poi.interactionRadius, 0);
  const normalized = MathUtils.clamp(
    (radius - DEFAULT_RADIUS_INTENSITY_RANGE.min) /
      (DEFAULT_RADIUS_INTENSITY_RANGE.max - DEFAULT_RADIUS_INTENSITY_RANGE.min),
    0,
    1
  );
  const base = 0.45 + normalized * 0.5;
  const interactionBonus = poi.interaction === 'activate' ? 0.12 : 0;
  return MathUtils.clamp(base + interactionBonus, 0.3, 1);
}

export function bindPoiInteractionAnimation(
  options: PoiInteractionAnimationBindingOptions
): () => void {
  const resolveIntensity =
    options.intensityResolver ?? defaultIntensityResolver;
  const unsubscribe = options.source.addSelectionListener((poi) => {
    const intensity = resolveIntensity(poi);
    options.animator.triggerInteraction({ intensity });
  });
  return () => {
    unsubscribe();
  };
}
