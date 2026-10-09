import { MathUtils, Vector3, type Object3D } from 'three';

import type { FloorId } from '../../systems/movement/stairs';

import { AVATAR_WALK_SPEED, type SeatAnimation } from './animatedAvatar';

export interface ChairAnchor {
  id: string;
  floorId: FloorId;
  colliderName: string;
  seat: Vector3;
  floorY: number;
  forward: Vector3;
  approach: Vector3;
}
export type ChairPhase =
  | 'free'
  | 'approach'
  | 'entering'
  | 'seated'
  | 'exiting';

/** Only authored, individually collidable chairs are supported; desks/sofas keep their normal interactions. */
export function collectChairAnchors(root: Object3D): ChairAnchor[] {
  const result: ChairAnchor[] = [];
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (!object.name.startsWith('Furnishing:')) return;
    const id = object.name.slice('Furnishing:'.length);
    const lounge =
      id === 'living-room-lounge-chair-north' ||
      id === 'living-room-lounge-chair-east';
    const reading = object.getObjectByName(
      'FurnishingPart:readingChairCushion'
    );
    if (!lounge && !reading) return;
    const localSeat = lounge
      ? new Vector3(0, 0.47, 0.08)
      : new Vector3(0, 0.62, -0.05);
    const seat = object.localToWorld(localSeat);
    const base = object.getWorldPosition(new Vector3());
    const forward = new Vector3(0, 0, -1).transformDirection(
      object.matrixWorld
    );
    // Clear the axis-aligned collision bounds even when the chair is diagonal.
    const approachDistance =
      0.85 + 0.7 * (Math.abs(forward.x) + Math.abs(forward.z));
    result.push({
      id,
      floorId: 'ground',
      colliderName: `LowerFloorFurnishingCollider:${id}`,
      seat,
      floorY: base.y,
      forward,
      approach: seat
        .clone()
        .addScaledVector(forward, approachDistance)
        .setY(base.y),
    });
  });
  return result;
}

export function createChairController(options: {
  player: Object3D;
  chairs: readonly ChairAnchor[];
  canOccupy: (
    position: Vector3,
    chair: ChairAnchor,
    ignoreChair: boolean
  ) => boolean;
  duration: (clip: SeatAnimation) => number;
}) {
  const { player, canOccupy } = options;
  let phase: ChairPhase = 'free';
  let chair: ChairAnchor | null = null;
  let progress = 0;
  let start = new Vector3();
  let exit = new Vector3();
  const segmentClear = (
    a: Vector3,
    b: Vector3,
    target: ChairAnchor,
    ignore: boolean
  ) => {
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 0.15));
    for (let i = 0; i <= steps; i++)
      if (!canOccupy(a.clone().lerp(b, i / steps), target, ignore))
        return false;
    return true;
  };
  const rootAtSeat = (target: ChairAnchor) =>
    target.seat
      .clone()
      .addScaledVector(target.forward, 0.395)
      .setY(target.floorY);
  const nearest = (floor: FloorId) =>
    options.chairs
      .filter(
        (c) =>
          c.floorId === floor &&
          Math.abs(player.position.y - c.floorY) < 0.2 &&
          player.position.distanceTo(c.approach) < 2.1 &&
          segmentClear(player.position, c.approach, c, false) &&
          segmentClear(c.approach, rootAtSeat(c), c, true)
      )
      .sort(
        (a, b) =>
          player.position.distanceToSquared(a.approach) -
          player.position.distanceToSquared(b.approach)
      )[0] ?? null;
  function requestExit(): boolean {
    if (!chair || phase !== 'seated') return false;
    // Recheck every exit; never teleport through a newly closed door or another solid.
    const side = new Vector3(chair.forward.z, 0, -chair.forward.x);
    const candidates = [
      chair.approach,
      chair.approach.clone().add(side),
      chair.approach.clone().sub(side),
    ];
    const candidate = candidates.find(
      (p) =>
        canOccupy(p, chair!, false) &&
        segmentClear(player.position, p, chair!, true)
    );
    if (!candidate) return false;
    exit = candidate.clone();
    start = player.position.clone();
    progress = 0;
    phase = 'exiting';
    return true;
  }
  return {
    nearest,
    interact(floor: FloorId) {
      if (phase === 'seated') return requestExit();
      if (phase !== 'free') return false;
      const candidate = nearest(floor);
      if (!candidate) return false;
      chair = candidate;
      start = player.position.clone();
      progress = 0;
      phase = 'approach';
      return true;
    },
    update(delta: number, reducedMotion: boolean, wantsMove = false) {
      if (!chair || phase === 'free') return;
      if (wantsMove && phase === 'approach') {
        phase = 'free';
        chair = null;
        return;
      }
      if (wantsMove && phase === 'seated') requestExit();
      if (phase === 'seated') return;
      const target =
        phase === 'approach'
          ? chair.approach
          : phase === 'entering'
            ? rootAtSeat(chair)
            : exit;
      const duration =
        phase === 'approach'
          ? Math.max(0.2, start.distanceTo(target) / AVATAR_WALK_SPEED)
          : options.duration(phase === 'entering' ? 'SitDown' : 'StandUp');
      const next = reducedMotion
        ? 1
        : Math.min(1, progress + Math.max(0, Math.min(delta, 0.1)) / duration);
      const position = start
        .clone()
        .lerp(target, MathUtils.smoothstep(next, 0, 1));
      if (
        !segmentClear(player.position, position, chair, phase !== 'approach')
      ) {
        if (phase === 'approach') {
          phase = 'free';
          chair = null;
        }
        return;
      }
      player.position.copy(position);
      player.rotation.y = Math.atan2(chair.forward.x, chair.forward.z);
      progress = next;
      if (progress === 1) {
        if (phase === 'approach') {
          phase = 'entering';
          progress = 0;
          start = player.position.clone();
        } else if (phase === 'entering') {
          phase = 'seated';
          progress = 0;
        } else {
          phase = 'free';
          chair = null;
          progress = 0;
        }
      }
    },
    getAnimation(): {
      clip: SeatAnimation;
      progress: number;
      offsetY: number;
    } | null {
      if (!chair || phase === 'free' || phase === 'approach') return null;
      const amount =
        phase === 'seated' ? 1 : phase === 'entering' ? progress : 1 - progress;
      return {
        clip:
          phase === 'seated'
            ? 'Seated'
            : phase === 'entering'
              ? 'SitDown'
              : 'StandUp',
        progress: phase === 'seated' ? 0 : progress,
        offsetY: (chair.seat.y - chair.floorY - 0.4) * amount,
      };
    },
    getSnapshot: () => ({ phase, chairId: chair?.id ?? null, progress }),
    isActive: () => phase !== 'free',
  };
}
