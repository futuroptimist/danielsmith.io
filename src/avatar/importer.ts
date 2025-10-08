import {
  AnimationClip,
  Bone,
  Group,
  Object3D,
  Skeleton,
  SkinnedMesh,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface DracoLoaderLike {
  setDecoderPath(path: string): void;
  dispose(): void;
}

interface GltfLoaderLike {
  loadAsync(url: string): Promise<GLTF>;
  setDRACOLoader?: (loader: DracoLoaderLike) => void;
}

export interface AvatarImporterOptions {
  /**
   * Optional DRACO decoder path used when loading compressed GLB assets.
   */
  dracoDecoderPath?: string;
  /**
   * Allows dependency injection for tests while defaulting to the Three.js loader in runtime.
   */
  createLoader?: () => GltfLoaderLike;
  /**
   * Optional factory that produces a DRACO loader instance when `dracoDecoderPath` is provided.
   */
  createDracoLoader?: () => DracoLoaderLike;
  /**
   * Bones that every imported avatar must expose.
   */
  requiredBones?: readonly string[];
  /**
   * Animation clip names that every avatar must ship with.
   */
  requiredAnimations?: readonly string[];
}

export interface AvatarLoadOptions {
  /**
   * Source URL passed to the underlying GLTF loader.
   */
  url: string;
  /**
   * Additional bones that must exist for this specific load call.
   */
  requiredBones?: readonly string[];
  /**
   * Additional animation clip names required for this specific load call.
   */
  requiredAnimations?: readonly string[];
}

export interface AvatarImportResult {
  gltf: GLTF;
  scene: Group;
  animations: AnimationClip[];
  bones: Map<string, Bone>;
  skinnedMeshes: SkinnedMesh[];
  skeletons: Skeleton[];
}

export interface AvatarImporter {
  load(options: AvatarLoadOptions): Promise<AvatarImportResult>;
  dispose(): void;
}

interface AvatarRequirements {
  bones: readonly string[];
  animations: readonly string[];
}

function defaultCreateLoader(): GltfLoaderLike {
  return new GLTFLoader();
}

function defaultCreateDracoLoader(): DracoLoaderLike {
  return new DRACOLoader();
}

function mergeRequirements(
  base: AvatarRequirements,
  overrides?: AvatarRequirements
): AvatarRequirements {
  if (!overrides) {
    return base;
  }
  const boneSet = new Set(base.bones);
  const animationSet = new Set(base.animations);
  overrides.bones.forEach((bone) => {
    if (bone.length > 0) {
      boneSet.add(bone);
    }
  });
  overrides.animations.forEach((clip) => {
    if (clip.length > 0) {
      animationSet.add(clip);
    }
  });
  return {
    bones: Array.from(boneSet),
    animations: Array.from(animationSet),
  };
}

interface SceneScanResult {
  bones: Map<string, Bone>;
  skinnedMeshes: SkinnedMesh[];
  skeletons: Skeleton[];
}

function scanScene(root: Object3D): SceneScanResult {
  const bones = new Map<string, Bone>();
  const skinnedMeshes: SkinnedMesh[] = [];
  const skeletonSet = new Set<Skeleton>();

  root.traverse((object) => {
    const possibleBone = object as Bone;
    if (possibleBone.isBone) {
      if (possibleBone.name) {
        bones.set(possibleBone.name, possibleBone);
      }
      return;
    }

    const possibleSkinnedMesh = object as SkinnedMesh;
    if (possibleSkinnedMesh.isSkinnedMesh) {
      skinnedMeshes.push(possibleSkinnedMesh);
      if (possibleSkinnedMesh.skeleton) {
        skeletonSet.add(possibleSkinnedMesh.skeleton);
      }
    }
  });

  return {
    bones,
    skinnedMeshes,
    skeletons: Array.from(skeletonSet),
  };
}

function ensureRequirements(
  scan: SceneScanResult,
  animations: AnimationClip[],
  requirements: AvatarRequirements
) {
  if (scan.skinnedMeshes.length === 0) {
    throw new Error(
      'Avatar model does not include any skinned meshes required for animation.'
    );
  }

  const missingBones = requirements.bones.filter(
    (bone) => !scan.bones.has(bone)
  );
  if (missingBones.length > 0) {
    throw new Error(
      `Avatar model is missing required bones: ${missingBones.join(', ')}`
    );
  }

  const availableAnimationNames = new Set(
    animations.map((clip) => clip.name).filter((name) => name.length > 0)
  );
  const missingAnimations = requirements.animations.filter(
    (name) => !availableAnimationNames.has(name)
  );
  if (missingAnimations.length > 0) {
    throw new Error(
      `Avatar model is missing required animations: ${missingAnimations.join(', ')}`
    );
  }
}

export function createAvatarImporter({
  dracoDecoderPath,
  createLoader = defaultCreateLoader,
  createDracoLoader = defaultCreateDracoLoader,
  requiredBones = [],
  requiredAnimations = [],
}: AvatarImporterOptions = {}): AvatarImporter {
  const loader = createLoader();
  let dracoLoader: DracoLoaderLike | null = null;

  if (dracoDecoderPath) {
    if (typeof loader.setDRACOLoader === 'function') {
      dracoLoader = createDracoLoader();
      dracoLoader.setDecoderPath(dracoDecoderPath);
      loader.setDRACOLoader(dracoLoader);
    } else {
      console.warn(
        'Avatar importer received a DRACO decoder path, but the GLTF loader does not support DRACO. Continuing without compression support.'
      );
    }
  }

  const baseRequirements: AvatarRequirements = {
    bones: Array.from(requiredBones).filter((bone) => bone.length > 0),
    animations: Array.from(requiredAnimations).filter(
      (clip) => clip.length > 0
    ),
  };

  return {
    async load({
      url,
      requiredBones: additionalBones = [],
      requiredAnimations: additionalAnimations = [],
    }: AvatarLoadOptions): Promise<AvatarImportResult> {
      const overrides =
        additionalBones.length === 0 && additionalAnimations.length === 0
          ? undefined
          : {
              bones: Array.from(additionalBones),
              animations: Array.from(additionalAnimations),
            };
      const combinedRequirements = mergeRequirements(baseRequirements, overrides);

      const gltf = await loader.loadAsync(url);
      const scan = scanScene(gltf.scene);
      ensureRequirements(scan, gltf.animations, combinedRequirements);

      return {
        gltf,
        scene: gltf.scene,
        animations: gltf.animations,
        bones: scan.bones,
        skinnedMeshes: scan.skinnedMeshes,
        skeletons: scan.skeletons,
      };
    },
    dispose() {
      if (dracoLoader) {
        dracoLoader.dispose();
        dracoLoader = null;
      }
    },
  };
}
