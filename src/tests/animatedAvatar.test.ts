import { readFileSync } from 'node:fs';

import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  BoxGeometry,
  NumberKeyframeTrack,
  Vector3,
  Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';

import {
  AVATAR_CLIPS,
  AVATAR_WALK_SPEED,
  AVATAR_RUN_SPEED,
  createAnimatedAvatar,
  groundSeatedLeg,
  normalizeAvatarClip,
} from '../scene/avatar/animatedAvatar';
import {
  collectChairAnchors,
  createChairController,
} from '../scene/avatar/chairController';
import { createAvatarImporter } from '../scene/avatar/importer';
import { createLowerFloorFurnishings } from '../scene/structures/lowerFloorFurnishings';

describe('approved animated avatar', () => {
  it('keeps grounded knees clear of the actual tall reading-chair cushion', async () => {
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: 'TestTexture',
      loadTexture: async () => new Texture(),
    }));
    const bytes = readFileSync(
      'public/assets/avatar/daniel-animated-avatar.glb'
    );
    const importer = createAvatarImporter({
      createLoader: () => ({
        loadAsync: () => loader.parseAsync(new Uint8Array(bytes).buffer, ''),
      }),
    });
    const asset = await importer.load({ url: 'fixture' });
    const avatar = createAnimatedAvatar(asset);
    const furniture = createLowerFloorFurnishings().group;
    const chair = collectChairAnchors(furniture).find(
      (c) => c.id === 'studio-reading-chair'
    )!;
    const cushion = furniture.getObjectByName(
      'FurnishingPart:readingChairCushion'
    ) as Mesh<BoxGeometry>;
    const player = new Group();
    player.add(avatar.model);
    player.position.copy(chair.approach);
    const controller = createChairController({
      player,
      chairs: [chair],
      canOccupy: () => true,
      duration: avatar.duration,
    });
    controller.interact('ground');
    for (let i = 0; i < 100; i++) {
      controller.update(0.05, false);
      avatar.update(0.05, 0, 0, false, controller.getAnimation(), chair.floorY);
    }
    expect(controller.getSnapshot().phase).toBe('seated');
    for (const side of ['L', 'R']) {
      const knee = asset.bones
        .get(`LowerLeg${side}`)!
        .getWorldPosition(new Vector3());
      const localKnee = cushion.worldToLocal(knee);
      expect(localKnee.z).toBeLessThan(
        -cushion.geometry.parameters.depth / 2 - 0.06
      );
      expect(
        asset.bones.get(`Foot${side}`)!.getWorldPosition(new Vector3()).y
      ).toBeCloseTo(chair.floorY + 0.12, 2);
    }
    avatar.dispose();
  });
  it('binds the actual exported tracks and freezes locomotion for reduced motion', async () => {
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: 'TestTexture',
      loadTexture: async () => new Texture(),
    }));
    const bytes = readFileSync(
      'public/assets/avatar/daniel-animated-avatar.glb'
    );
    const buffer = new Uint8Array(bytes).buffer;
    const importer = createAvatarImporter({
      createLoader: () => ({ loadAsync: () => loader.parseAsync(buffer, '') }),
      requiredBones: ['Hips', 'Spine'],
      requiredAnimations: AVATAR_CLIPS,
    });
    const asset = await importer.load({ url: 'fixture' });
    const avatar = createAnimatedAvatar(asset);
    const foot = asset.bones.get('FootL')!;
    expect(foot).toBeDefined();
    for (let i = 0; i < 30; i++)
      avatar.update(0.1, AVATAR_WALK_SPEED, 0, false, null, 0);
    expect(avatar.getSnapshot().locomotion.linearState).toBe('walk');
    const pose = foot.getWorldPosition(new Vector3());
    avatar.update(0.25, AVATAR_WALK_SPEED, 0, false, null, 0);
    expect(
      foot.getWorldPosition(new Vector3()).distanceTo(pose)
    ).toBeGreaterThan(0.01);
    for (let i = 0; i < 30; i++)
      avatar.update(0.1, AVATAR_RUN_SPEED, 0, false, null, 0);
    expect(avatar.getSnapshot().locomotion.linearState).toBe('run');
    for (let i = 0; i < 3; i++)
      avatar.update(0.1, AVATAR_RUN_SPEED, 0, true, null, 0);
    const still = foot.getWorldPosition(new Vector3());
    avatar.update(0.1, AVATAR_RUN_SPEED, 0, true, null, 0);
    expect(foot.getWorldPosition(new Vector3()).distanceTo(still)).toBeLessThan(
      0.001
    );
    avatar.update(
      0.1,
      0,
      0,
      false,
      { clip: 'Seated', progress: 0, offsetY: 0.07 },
      0
    );
    expect(foot.getWorldPosition(new Vector3()).y).toBeCloseTo(0.12, 2);
    avatar.update(0.1, AVATAR_WALK_SPEED, 0, false, null, 0);
    const resumed = foot.getWorldPosition(new Vector3());
    avatar.update(0.25, AVATAR_WALK_SPEED, 0, false, null, 0);
    expect(
      foot.getWorldPosition(new Vector3()).distanceTo(resumed)
    ).toBeGreaterThan(0.01);
    avatar.dispose();
  });
  it('preserves the approved compact rig, complete clip set and embedded pixel atlas', () => {
    const bytes = readFileSync(
      'public/assets/avatar/daniel-animated-avatar.glb'
    );
    expect(bytes.length).toBe(500184);
    expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
    const json = JSON.parse(
      bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12))
    );
    expect(json.animations.map((a: { name: string }) => a.name).sort()).toEqual(
      [...AVATAR_CLIPS].sort()
    );
    expect(json.skins).toHaveLength(1);
    expect(json.skins[0].joints).toHaveLength(20);
    expect(json.meshes).toHaveLength(1);
    expect(json.meshes[0].primitives).toHaveLength(1);
    expect(json.materials).toHaveLength(1);
    expect(json.samplers[0].magFilter).toBe(9728);
    expect(json.images[0].bufferView).toBeTypeOf('number');
    expect(json.images[0].uri).toBeUndefined();
    const primitive = json.meshes[0].primitives[0];
    expect(json.accessors[primitive.indices].count / 3).toBe(2976);
    expect(json.nodes.some((n: { name: string }) => n.name === 'Hips')).toBe(
      true
    );
  });
  it('removes frame-one leading holds without mutating source tracks or relative timing', () => {
    const source = new AnimationClip('Walk', -1, [
      new NumberKeyframeTrack('Hips.position[y]', [1 / 30, 31 / 30], [0, 1]),
    ]);
    const clip = normalizeAvatarClip(source);
    expect(clip.tracks[0].times[0]).toBe(0);
    expect(clip.duration).toBeCloseTo(1);
    expect(source.tracks[0].times[0]).toBeCloseTo(1 / 30);
  });
  it('grounds seated feet by rotating the chain while preserving segment lengths', () => {
    const hip = new Bone(),
      knee = new Bone(),
      foot = new Bone();
    hip.position.set(0, 0.6, 0);
    knee.position.set(0, 0, 0.4);
    foot.position.set(0, -0.42, 0);
    hip.add(knee);
    knee.add(foot);
    hip.updateMatrixWorld(true);
    groundSeatedLeg(hip, knee, foot, 0);
    expect(knee.position.length()).toBeCloseTo(0.4);
    expect(foot.position.length()).toBeCloseTo(0.42);
    expect(foot.getWorldPosition(new Vector3()).y).toBeCloseTo(0.12, 3);
  });
});
