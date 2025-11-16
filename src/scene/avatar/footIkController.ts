import { MathUtils, Quaternion, Vector2, Vector3, type Object3D } from 'three';

export type AvatarFoot = 'left' | 'right';

export interface AvatarFootIkControllerOptions {
  leftFoot: Object3D;
  rightFoot: Object3D;
  pelvis?: Object3D;
  maxFootOffset?: number;
  maxFootPitch?: number;
  slopeSampleDistance?: number;
  smoothing?: {
    foot?: number;
    rotation?: number;
    pelvis?: number;
  };
  pelvisWeight?: number;
  maxPelvisOffset?: number;
  contact?: {
    offsetTolerance?: number;
  };
  events?: {
    onFootContact?(event: AvatarFootIkContactEvent): void;
  };
}

export interface AvatarFootIkUpdateContext {
  delta: number;
  sampleHeight(position: Vector2, foot: AvatarFoot): number;
}

export interface AvatarFootIkControllerHandle {
  update(context: AvatarFootIkUpdateContext): void;
  dispose(): void;
}

export interface AvatarFootIkContactEvent {
  foot: AvatarFoot;
  worldHeight: number;
  offset: number;
  targetOffset: number;
  slopeAngle: number;
  distanceToTarget: number;
}

interface FootState {
  label: AvatarFoot;
  node: Object3D;
  basePositionY: number;
  baseRotationX: number;
  offset: number;
  rotationOffset: number;
  targetOffset: number;
  contactActive: boolean;
  worldHeight: number;
}

interface PelvisState {
  node: Object3D;
  basePositionY: number;
  offset: number;
}

const clampFinite = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return MathUtils.clamp(0, min, max);
  }
  return MathUtils.clamp(value, min, max);
};

export function createAvatarFootIkController({
  leftFoot,
  rightFoot,
  pelvis,
  maxFootOffset = 0.18,
  maxFootPitch = Math.PI / 6,
  slopeSampleDistance = 0.42,
  smoothing,
  pelvisWeight = 0.6,
  maxPelvisOffset = 0.12,
  contact,
  events,
}: AvatarFootIkControllerOptions): AvatarFootIkControllerHandle {
  if (!leftFoot?.isObject3D) {
    throw new Error('Avatar foot IK requires a left foot Object3D.');
  }
  if (!rightFoot?.isObject3D) {
    throw new Error('Avatar foot IK requires a right foot Object3D.');
  }

  const footSmoothing = smoothing?.foot ?? 12;
  const rotationSmoothing = smoothing?.rotation ?? 10;
  const pelvisSmoothing = smoothing?.pelvis ?? 8;
  const contactTolerance = Math.max(contact?.offsetTolerance ?? 0.015, 1e-5);

  const footStates: FootState[] = [
    {
      label: 'left',
      node: leftFoot,
      basePositionY: leftFoot.position.y,
      baseRotationX: leftFoot.rotation.x,
      offset: 0,
      rotationOffset: 0,
      targetOffset: 0,
      contactActive: true,
      worldHeight: leftFoot.position.y,
    },
    {
      label: 'right',
      node: rightFoot,
      basePositionY: rightFoot.position.y,
      baseRotationX: rightFoot.rotation.x,
      offset: 0,
      rotationOffset: 0,
      targetOffset: 0,
      contactActive: true,
      worldHeight: rightFoot.position.y,
    },
  ];

  const pelvisState: PelvisState | null = pelvis
    ? {
        node: pelvis,
        basePositionY: pelvis.position.y,
        offset: 0,
      }
    : null;

  const footWorldPosition = new Vector3();
  const aheadPosition = new Vector3();
  const behindPosition = new Vector3();
  const footForward = new Vector3();
  const sampleVector = new Vector2();
  const footQuaternion = new Quaternion();

  let disposed = false;

  const sampleHeight = (
    position: Vector3,
    label: AvatarFoot,
    context: AvatarFootIkUpdateContext
  ): number => {
    sampleVector.set(position.x, position.z);
    const raw = context.sampleHeight(sampleVector, label);
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return raw;
  };

  const updateFoot = (state: FootState, context: AvatarFootIkUpdateContext) => {
    state.node.updateWorldMatrix(true, false);
    state.node.getWorldPosition(footWorldPosition);

    const baseWorldHeight = footWorldPosition.y - state.offset;
    const targetHeight = sampleHeight(footWorldPosition, state.label, context);
    const unclampedOffset = targetHeight - baseWorldHeight;
    state.targetOffset = MathUtils.clamp(
      unclampedOffset,
      -Math.abs(maxFootOffset),
      Math.abs(maxFootOffset)
    );
    state.worldHeight = targetHeight;

    state.offset = MathUtils.damp(
      state.offset,
      state.targetOffset,
      footSmoothing,
      Math.max(context.delta, 0)
    );
    state.node.position.y = state.basePositionY + state.offset;

    state.node.getWorldQuaternion(footQuaternion);
    footForward.set(0, 0, 1).applyQuaternion(footQuaternion);
    footForward.y = 0;
    const forwardLength = footForward.length();
    if (forwardLength < 1e-5) {
      footForward.set(0, 0, 1);
    } else {
      footForward.multiplyScalar(1 / forwardLength);
    }

    aheadPosition.copy(footWorldPosition);
    aheadPosition.addScaledVector(footForward, slopeSampleDistance);
    behindPosition.copy(footWorldPosition);
    behindPosition.addScaledVector(footForward, -slopeSampleDistance);

    const aheadHeight = sampleHeight(aheadPosition, state.label, context);
    const behindHeight = sampleHeight(behindPosition, state.label, context);
    const safeSampleDistance = Math.max(Math.abs(slopeSampleDistance), 1e-3);
    const slopeDelta = aheadHeight - behindHeight;
    const slopeAngle = Math.atan2(slopeDelta, safeSampleDistance * 2);
    const clampedAngle = MathUtils.clamp(
      slopeAngle,
      -Math.abs(maxFootPitch),
      Math.abs(maxFootPitch)
    );
    state.rotationOffset = MathUtils.damp(
      state.rotationOffset,
      clampedAngle,
      rotationSmoothing,
      Math.max(context.delta, 0)
    );
    state.node.rotation.x = state.baseRotationX + state.rotationOffset;

    const distanceToTarget = Math.abs(state.offset - state.targetOffset);
    const inContact = distanceToTarget <= contactTolerance;
    if (inContact && !state.contactActive) {
      events?.onFootContact?.({
        foot: state.label,
        worldHeight: state.worldHeight,
        offset: state.offset,
        targetOffset: state.targetOffset,
        slopeAngle: state.rotationOffset,
        distanceToTarget,
      });
    }
    state.contactActive = inContact;
  };

  return {
    update(context) {
      if (disposed) {
        return;
      }
      const safeDelta = Math.max(context.delta, 0);
      for (const state of footStates) {
        updateFoot(state, context);
      }
      if (pelvisState) {
        const averageOffset =
          footStates.reduce((sum, state) => sum + state.offset, 0) /
          footStates.length;
        const targetPelvisOffset = clampFinite(
          averageOffset * pelvisWeight,
          -Math.abs(maxPelvisOffset),
          Math.abs(maxPelvisOffset)
        );
        pelvisState.offset = MathUtils.damp(
          pelvisState.offset,
          targetPelvisOffset,
          pelvisSmoothing,
          safeDelta
        );
        pelvisState.node.position.y =
          pelvisState.basePositionY + pelvisState.offset;
      }
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const state of footStates) {
        state.node.position.y = state.basePositionY;
        state.node.rotation.x = state.baseRotationX;
      }
      if (pelvisState) {
        pelvisState.node.position.y = pelvisState.basePositionY;
      }
      for (const state of footStates) {
        state.contactActive = true;
      }
    },
  };
}
