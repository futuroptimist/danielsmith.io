import {
  AnimationClip,
  AnimationMixer,
  Box3,
  Color,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  Quaternion,
  Vector3,
  type AnimationAction,
  type Object3D,
} from 'three';

import { AVATAR_RUN_SPEED } from '../../systems/movement/avatarGait';

import type { AvatarImportResult } from './importer';
import { createAvatarLocomotionAnimator } from './locomotionAnimator';
import type { PortfolioMannequinPalette } from './mannequin';

export const DANIEL_AVATAR_URL = `${import.meta.env.BASE_URL}assets/avatar/daniel-animated-avatar.glb`;
export const AVATAR_CLIPS = [
  'Idle',
  'Walk',
  'Run',
  'SitDown',
  'Seated',
  'StandUp',
] as const;
export {
  AVATAR_WALK_SPEED,
  AVATAR_RUN_SPEED,
} from '../../systems/movement/avatarGait';
export type SeatAnimation = 'SitDown' | 'Seated' | 'StandUp';

/** Blender actions start at frame one. Shift every track by the same origin, not individually. */
export function normalizeAvatarClip(source: AnimationClip): AnimationClip {
  const clip = source.clone();
  const start = Math.min(
    ...clip.tracks.filter((t) => t.times.length).map((t) => t.times[0])
  );
  if (!Number.isFinite(start) || !clip.validate())
    throw new Error(`Invalid avatar clip: ${source.name}`);
  clip.tracks.forEach((track) => track.shift(-start));
  clip.resetDuration();
  if (clip.duration <= 0) throw new Error(`Empty avatar clip: ${source.name}`);
  return clip;
}

/** Two-segment solve preserves bone lengths; never translate individual deform bones like the placeholder. */
export function groundSeatedLeg(
  hip: Object3D,
  knee: Object3D,
  foot: Object3D,
  floorY: number
): void {
  const a = hip.getWorldPosition(new Vector3());
  const b = knee.getWorldPosition(new Vector3());
  const c = foot.getWorldPosition(new Vector3());
  const footRotation = foot.getWorldQuaternion(new Quaternion());
  const target = c.clone();
  target.y = floorY + 0.12;
  const upper = a.distanceTo(b),
    lower = b.distanceTo(c);
  const direction = target.clone().sub(a);
  const distance = Math.min(
    Math.max(direction.length(), Math.abs(upper - lower) + 1e-5),
    upper + lower - 1e-5
  );
  direction.normalize();
  target.copy(a).addScaledVector(direction, distance);
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = b
    .clone()
    .sub(a)
    .addScaledVector(direction, -b.clone().sub(a).dot(direction));
  if (bend.lengthSq() < 1e-8)
    bend.set(0, 0, 1).addScaledVector(direction, -direction.z);
  bend.normalize();
  const kneeTarget = a
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(
      bend,
      Math.sqrt(Math.max(0, upper * upper - along * along))
    );
  const rotateTowards = (joint: Object3D, end: Object3D, goal: Vector3) => {
    const origin = joint.getWorldPosition(new Vector3());
    const from = end.getWorldPosition(new Vector3()).sub(origin).normalize();
    const to = goal.clone().sub(origin).normalize();
    const world = new Quaternion()
      .setFromUnitVectors(from, to)
      .multiply(joint.getWorldQuaternion(new Quaternion()));
    const parent =
      joint.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
    joint.quaternion.copy(parent.invert().multiply(world));
    joint.updateWorldMatrix(false, true);
  };
  rotateTowards(hip, knee, kneeTarget);
  rotateTowards(knee, foot, target);
  const parent =
    foot.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion();
  foot.quaternion.copy(parent.invert().multiply(footRotation));
  foot.updateWorldMatrix(false, true);
}

export function createAnimatedAvatar(asset: AvatarImportResult) {
  if (asset.skinnedMeshes.length !== 1 || asset.skeletons.length !== 1)
    throw new Error('Expected one avatar skin.');
  const clips = new Map(
    asset.animations.map((clip) => [clip.name, normalizeAvatarClip(clip)])
  );
  for (const name of AVATAR_CLIPS)
    if (!clips.has(name)) throw new Error(`Missing avatar clip ${name}`);
  const model = asset.scene;
  const outfitTint = { value: new Color(1, 1, 1) };
  model.name = 'DanielAnimatedAvatar';
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    // Animated extents exceed the bind-pose sphere; one small avatar is cheaper to draw than to cull incorrectly.
    object.frustumCulled = false;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (material instanceof MeshStandardMaterial && material.map) {
        // Keep the pixel silhouette readable in the house's deliberately dim ambient lighting.
        material.emissiveMap = material.map;
        material.emissive.set(0xffffff);
        material.emissiveIntensity = 0.3;
        // Only the shirt/collar tiles are tinted; skin, hair and beard keep the approved colors.
        material.onBeforeCompile = (shader) => {
          shader.uniforms.avatarOutfitTint = outfitTint;
          shader.fragmentShader =
            'uniform vec3 avatarOutfitTint;\n' + shader.fragmentShader;
          const tint =
            'mix(vec3(1.0), avatarOutfitTint, step(0.5, vMapUv.y) * (1.0 - step(0.75, vMapUv.y)) * (1.0 - step(0.5, vMapUv.x)))';
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <map_fragment>',
              `#include <map_fragment>\n#ifdef USE_MAP\ndiffuseColor.rgb *= ${tint};\n#endif`
            )
            .replace(
              '#include <emissivemap_fragment>',
              `#include <emissivemap_fragment>\n#ifdef USE_MAP\ntotalEmissiveRadiance *= ${tint};\n#endif`
            );
        };
        material.customProgramCacheKey = () => 'avatar-outfit-atlas-v1';
        material.map.magFilter = NearestFilter;
        material.map.minFilter = NearestFilter;
        material.map.generateMipmaps = false;
        material.map.needsUpdate = true;
      }
    }
  });
  model.updateMatrixWorld(true);
  const height = new Box3().setFromObject(model).getSize(new Vector3()).y;
  if (!Number.isFinite(height) || height < 1.5 || height > 2.1)
    throw new Error('Unexpected avatar height.');
  const mixer = new AnimationMixer(model);
  const locomotion = createAvatarLocomotionAnimator({
    mixer,
    clips: {
      idle: clips.get('Idle')!,
      walk: clips.get('Walk')!,
      run: clips.get('Run')!,
    },
    maxLinearSpeed: AVATAR_RUN_SPEED,
    thresholds: { idleToWalk: 0.2, walkToRun: 1.4 },
    timeScale: {
      // Measured from the exported foot travel and loop duration, in world units/second.
      walkReferenceSpeed: 0.85446,
      runReferenceSpeed: 1.57199,
      min: 0.3,
      max: 1.8,
    },
  });
  let activeSeat: SeatAnimation | null = null;
  let seatAction: AnimationAction | null = null;
  return {
    model,
    height,
    applyPalette(palette: PortfolioMannequinPalette) {
      const base = new Color('#283347');
      const next = new Color(palette.base);
      outfitTint.value.setRGB(
        next.r / base.r,
        next.g / base.g,
        next.b / base.b
      );
    },
    duration: (name: SeatAnimation) => clips.get(name)!.duration,
    update(
      delta: number,
      speed: number,
      angularSpeed: number,
      reducedMotion: boolean,
      seat: { clip: SeatAnimation; progress: number; offsetY: number } | null,
      floorY: number
    ) {
      model.position.y = seat?.offsetY ?? 0;
      if (seat) {
        if (activeSeat !== seat.clip) {
          mixer.stopAllAction();
          seatAction = mixer.clipAction(clips.get(seat.clip)!);
          seatAction.reset().setLoop(LoopOnce, 1).play();
          seatAction.clampWhenFinished = true;
          activeSeat = seat.clip;
        }
        seatAction!.time =
          Math.min(1, Math.max(0, seat.progress)) *
          clips.get(seat.clip)!.duration;
        mixer.update(0);
        if (seat.clip === 'Seated') {
          model.updateWorldMatrix(true, true);
          for (const side of ['L', 'R']) {
            const hip =
              asset.bones.get(`UpperLeg${side}`) ??
              model.getObjectByName(`UpperLeg.${side}`);
            const knee =
              asset.bones.get(`LowerLeg${side}`) ??
              model.getObjectByName(`LowerLeg.${side}`);
            const foot =
              asset.bones.get(`Foot${side}`) ??
              model.getObjectByName(`Foot.${side}`);
            if (hip && knee && foot) groundSeatedLeg(hip, knee, foot, floorY);
          }
        }
      } else {
        if (activeSeat) {
          mixer.stopAllAction();
          activeSeat = null;
          seatAction = null;
        }
        // Reduced motion keeps a stable idle pose while the controller remains fully usable.
        locomotion.update({
          delta: reducedMotion ? 1 : delta,
          linearSpeed: reducedMotion ? 0 : speed,
          angularSpeed,
        });
        if (reducedMotion) {
          mixer.setTime(0);
        }
      }
    },
    getSnapshot: () => ({
      loaded: true,
      height,
      seated: activeSeat,
      locomotion: locomotion.getSnapshot(),
    }),
    dispose() {
      locomotion.dispose();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.removeFromParent();
      const textures = new Set<MeshStandardMaterial['map']>();
      const materials = new Set<MeshStandardMaterial>();
      model.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (m instanceof MeshStandardMaterial) {
            materials.add(m);
            if (m.map) textures.add(m.map);
          }
        }
      });
      textures.forEach((t) => t?.dispose());
      materials.forEach((m) => m.dispose());
      asset.skeletons.forEach((s) => s.dispose());
    },
  };
}
export type AnimatedAvatar = ReturnType<typeof createAnimatedAvatar>;
