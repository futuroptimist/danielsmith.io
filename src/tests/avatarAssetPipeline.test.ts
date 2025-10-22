import {
  AnimationClip,
  Bone,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';

import {
  createAvatarAssetPipeline,
  type AvatarAssetPipeline,
} from '../scene/avatar/assetPipeline';
import type { AvatarImporter } from '../scene/avatar/importer';

interface LoaderStub {
  loadAsync: ReturnType<typeof vi.fn>;
}

function createGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
  return geometry;
}

function createAvatarScene(): {
  group: Group;
  skeleton: Skeleton;
  hips: Bone;
  idle: AnimationClip;
  walk: AnimationClip;
} {
  const hips = new Bone();
  hips.name = 'Hips';
  const spine = new Bone();
  spine.name = 'Spine';
  hips.add(spine);

  const geometry = createGeometry();
  const material = new MeshBasicMaterial();
  const skinned = new SkinnedMesh(geometry, material);
  skinned.add(hips);
  const skeleton = new Skeleton([hips, spine]);
  skinned.bind(skeleton);

  const deco = new SkinnedMesh(createGeometry(), material.clone());
  deco.bind(skeleton);

  const group = new Group();
  group.add(skinned);
  group.add(deco);

  const idle = new AnimationClip('Idle', -1, []);
  const walk = new AnimationClip('Walk', -1, []);

  return { group, skeleton, hips, idle, walk };
}

function createGltf(group: Group, animations: AnimationClip[]): GLTF {
  return {
    scene: group,
    scenes: [group],
    animations,
    cameras: [],
    asset: { version: '2.0' },
    parser: {} as never,
    userData: {},
  } as GLTF;
}

function setupPipeline(): {
  pipeline: AvatarAssetPipeline;
  loader: LoaderStub;
  group: Group;
  skeleton: Skeleton;
  hips: Bone;
  idle: AnimationClip;
  walk: AnimationClip;
} {
  const { group, skeleton, hips, idle, walk } = createAvatarScene();
  const gltf = createGltf(group, [idle, walk]);
  const loadAsync = vi.fn().mockResolvedValue(gltf);
  const loader: LoaderStub = { loadAsync };
  const pipeline = createAvatarAssetPipeline({
    importerOptions: {
      createLoader: () => loader,
      requiredBones: ['Hips', 'Spine'],
      requiredAnimations: ['Idle'],
    },
    expectedUnitScale: 1,
    scaleTolerance: 0.01,
  });
  return { pipeline, loader, group, skeleton, hips, idle, walk };
}

describe('createAvatarAssetPipeline', () => {
  it('loads an avatar and enforces default scale checks', async () => {
    const { pipeline, loader, group } = setupPipeline();

    const result = await pipeline.load({
      url: '/hero.glb',
      requiredAnimations: ['Walk'],
    });

    expect(loader.loadAsync).toHaveBeenCalledWith('/hero.glb');
    expect(result.scene).toBe(group);
    expect(result.skeletons).toHaveLength(1);
    expect(result.animations.map((clip) => clip.name)).toEqual([
      'Idle',
      'Walk',
    ]);

    pipeline.dispose();
  });

  it('throws when the skeleton root uses non-uniform scale', async () => {
    const { pipeline, hips } = setupPipeline();
    hips.scale.set(1, 1.2, 1);

    await expect(pipeline.load({ url: '/invalid.glb' })).rejects.toThrow(
      /non-uniform/i
    );

    pipeline.dispose();
  });

  it('throws when the skeleton root deviates from the expected unit scale', async () => {
    const { pipeline, hips } = setupPipeline();
    hips.scale.set(1.05, 1.05, 1.05);

    await expect(pipeline.load({ url: '/invalid.glb' })).rejects.toThrow(
      /outside the expected unit scale/i
    );

    pipeline.dispose();
  });

  it('throws when the scene root scale deviates from expectations', async () => {
    const { pipeline, group } = setupPipeline();
    group.scale.set(0.9, 0.9, 0.9);

    await expect(pipeline.load({ url: '/invalid.glb' })).rejects.toThrow(
      /scene root scale/i
    );

    pipeline.dispose();
  });

  it('allows overriding expected unit scale per load', async () => {
    const { pipeline, loader, group, hips } = setupPipeline();
    group.scale.set(2, 2, 2);
    hips.scale.set(2, 2, 2);

    const result = await pipeline.load({
      url: '/hero.glb',
      expectedUnitScale: 2,
      scaleTolerance: 0.001,
    });

    expect(loader.loadAsync).toHaveBeenCalledWith('/hero.glb');
    expect(result.scene).toBe(group);

    pipeline.dispose();
  });

  it('validates scale tolerance parameters before invoking the loader', async () => {
    const { pipeline, loader } = setupPipeline();

    await expect(
      pipeline.load({ url: '/invalid.glb', scaleTolerance: -0.1 })
    ).rejects.toThrow(/scaleTolerance/i);
    expect(loader.loadAsync).not.toHaveBeenCalled();

    pipeline.dispose();
  });

  it('validates expected unit scale overrides before invoking the loader', async () => {
    const { pipeline, loader } = setupPipeline();

    await expect(
      pipeline.load({ url: '/invalid.glb', expectedUnitScale: 0 })
    ).rejects.toThrow(/expectedUnitScale/i);
    expect(loader.loadAsync).not.toHaveBeenCalled();

    pipeline.dispose();
  });

  it('validates configuration parameters at creation time', () => {
    const importer: AvatarImporter = {
      load: vi.fn(),
      dispose: vi.fn(),
    };

    expect(() =>
      createAvatarAssetPipeline({
        importer,
        expectedUnitScale: 0,
      })
    ).toThrow(/expectedUnitScale/i);
    expect(() =>
      createAvatarAssetPipeline({
        importer,
        scaleTolerance: -0.01,
      })
    ).toThrow(/scaleTolerance/i);
  });
});
