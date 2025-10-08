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

import { createAvatarImporter } from '../avatar/importer';

type LoaderStub = {
  loadAsync: ReturnType<typeof vi.fn>;
  setDRACOLoader?: ReturnType<typeof vi.fn>;
};

type DracoStub = {
  setDecoderPath: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

function createGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
  return geometry;
}

function createAvatarScene(): {
  group: Group;
  skeleton: Skeleton;
  hips: Bone;
  spine: Bone;
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
  const primaryMesh = new SkinnedMesh(geometry, material);
  primaryMesh.name = 'PrimaryMesh';
  primaryMesh.add(hips);
  const skeleton = new Skeleton([hips, spine]);
  primaryMesh.bind(skeleton);

  const secondaryMesh = new SkinnedMesh(createGeometry(), material.clone());
  secondaryMesh.name = 'SecondaryMesh';
  secondaryMesh.bind(skeleton);

  const decoMesh = new SkinnedMesh(createGeometry(), material.clone());
  decoMesh.name = 'DecoMesh';
  // Leave decoMesh without a skeleton to exercise the guard branch.

  const group = new Group();
  group.add(primaryMesh);
  group.add(secondaryMesh);
  group.add(decoMesh);

  const idle = new AnimationClip('Idle', -1, []);
  const walk = new AnimationClip('Walk', -1, []);

  return { group, skeleton, hips, spine, idle, walk };
}

function createGltf({
  group,
  animations,
}: {
  group: Group;
  animations: AnimationClip[];
}): GLTF {
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

describe('createAvatarImporter', () => {
  it('loads an avatar and validates merged bone and animation requirements', async () => {
    const { group, skeleton, hips, spine, idle, walk } = createAvatarScene();
    const unnamed = new AnimationClip('', -1, []);
    const gltf = createGltf({ group, animations: [idle, walk, unnamed] });
    const loadAsync = vi.fn().mockResolvedValue(gltf);
    const loader: LoaderStub = {
      loadAsync,
      setDRACOLoader: vi.fn(),
    };

    const importer = createAvatarImporter({
      createLoader: () => loader,
      requiredBones: ['Hips', ''],
      requiredAnimations: ['Idle', ''],
    });

    const result = await importer.load({
      url: '/avatar.glb',
      requiredBones: ['Spine', ''],
      requiredAnimations: ['Walk', ''],
    });

    expect(loadAsync).toHaveBeenCalledWith('/avatar.glb');
    expect(result.scene).toBe(group);
    expect(result.animations).toEqual([idle, walk, unnamed]);
    expect(result.bones.get('Hips')).toBe(hips);
    expect(result.bones.get('Spine')).toBe(spine);
    expect(result.skinnedMeshes.length).toBe(3);
    expect(result.skeletons).toHaveLength(1);
    expect(result.skeletons[0]).toBe(skeleton);
  });

  it('throws when a required bone is missing', async () => {
    const hips = new Bone();
    hips.name = 'Pelvis';
    const geometry = createGeometry();
    const material = new MeshBasicMaterial();
    const mesh = new SkinnedMesh(geometry, material);
    mesh.add(hips);
    const skeleton = new Skeleton([hips]);
    mesh.bind(skeleton);
    const group = new Group();
    group.add(mesh);
    const gltf = createGltf({ group, animations: [] });

    const importer = createAvatarImporter({
      createLoader: () => ({ loadAsync: vi.fn().mockResolvedValue(gltf) }),
      requiredBones: ['Hips'],
    });

    await expect(
      importer.load({ url: '/missing-bone.glb' })
    ).rejects.toThrow(/missing required bones: Hips/i);
  });

  it('throws when a required animation clip is missing', async () => {
    const { group, idle } = createAvatarScene();
    const gltf = createGltf({ group, animations: [idle] });

    const importer = createAvatarImporter({
      createLoader: () => ({ loadAsync: vi.fn().mockResolvedValue(gltf) }),
      requiredAnimations: ['Walk'],
    });

    await expect(
      importer.load({ url: '/missing-clip.glb' })
    ).rejects.toThrow(/missing required animations: Walk/i);
  });

  it('throws when the scene does not contain skinned meshes', async () => {
    const group = new Group();
    const gltf = createGltf({ group, animations: [] });

    const importer = createAvatarImporter({
      createLoader: () => ({ loadAsync: vi.fn().mockResolvedValue(gltf) }),
    });

    await expect(importer.load({ url: '/no-skin.glb' })).rejects.toThrow(
      /does not include any skinned meshes/i
    );
  });

  it('configures draco support when available and disposes loaders', async () => {
    const { group, idle } = createAvatarScene();
    const gltf = createGltf({ group, animations: [idle] });

    const draco: DracoStub = {
      setDecoderPath: vi.fn(),
      dispose: vi.fn(),
    };
    const loadAsync = vi.fn().mockResolvedValue(gltf);
    const setDRACOLoader = vi.fn();
    const loader: LoaderStub = { loadAsync, setDRACOLoader };

    const importer = createAvatarImporter({
      dracoDecoderPath: '/draco/',
      createLoader: () => loader,
      createDracoLoader: () => draco,
    });

    await importer.load({ url: '/uses-draco.glb' });

    expect(draco.setDecoderPath).toHaveBeenCalledWith('/draco/');
    expect(setDRACOLoader).toHaveBeenCalledWith(draco);

    importer.dispose();
    expect(draco.dispose).toHaveBeenCalled();
  });

  it('warns when draco support is requested but the loader cannot accept it', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { group, idle } = createAvatarScene();
    const gltf = createGltf({ group, animations: [idle] });
    const dracoFactory = vi.fn(() => ({
      setDecoderPath: vi.fn(),
      dispose: vi.fn(),
    }));

    const importer = createAvatarImporter({
      dracoDecoderPath: '/draco/',
      createLoader: () => ({ loadAsync: vi.fn().mockResolvedValue(gltf) }),
      createDracoLoader: dracoFactory,
    });

    await importer.load({ url: '/no-draco-support.glb' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not support DRACO')
    );
    expect(dracoFactory).not.toHaveBeenCalled();

    importer.dispose();
    warnSpy.mockRestore();
  });
});
