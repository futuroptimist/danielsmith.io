import { Bone, Skeleton, Vector3 } from 'three';

import {
  createAvatarImporter,
  type AvatarImportResult,
  type AvatarImporter,
  type AvatarImporterOptions,
  type AvatarLoadOptions,
} from './importer';

export interface AvatarAssetPipelineOptions {
  readonly importer?: AvatarImporter;
  readonly importerOptions?: AvatarImporterOptions;
  readonly expectedUnitScale?: number;
  readonly scaleTolerance?: number;
}

export interface AvatarAssetPipelineLoadOptions extends AvatarLoadOptions {
  readonly expectedUnitScale?: number;
  readonly scaleTolerance?: number;
}

export interface AvatarAssetPipeline {
  load(options: AvatarAssetPipelineLoadOptions): Promise<AvatarImportResult>;
  dispose(): void;
}

const DEFAULT_EXPECTED_UNIT_SCALE = 1;
const DEFAULT_SCALE_TOLERANCE = 0.01;

function ensureScaleParameters(expected: number, tolerance: number): void {
  if (!Number.isFinite(expected) || expected <= 0) {
    throw new Error(
      'Avatar asset pipeline expectedUnitScale must be a positive finite value.'
    );
  }
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new Error(
      'Avatar asset pipeline scaleTolerance must be a non-negative finite value.'
    );
  }
}

function isUniformScale(scale: Vector3, tolerance: number): boolean {
  const { x, y, z } = scale;
  return (
    Math.abs(x - y) <= tolerance &&
    Math.abs(x - z) <= tolerance &&
    Math.abs(y - z) <= tolerance
  );
}

function validateScale(
  scale: Vector3,
  expected: number,
  tolerance: number,
  context: string
): void {
  const { x, y, z } = scale;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new Error(`Avatar ${context} scale contains a non-finite value.`);
  }
  if (!isUniformScale(scale, tolerance)) {
    throw new Error(
      `Avatar ${context} scale is non-uniform (${x.toFixed(3)}, ${y.toFixed(
        3
      )}, ${z.toFixed(3)}).`
    );
  }
  const deviation = Math.abs(x - expected);
  if (deviation > tolerance) {
    throw new Error(
      `Avatar ${context} scale ${x.toFixed(
        3
      )} is outside the expected unit scale ${expected.toFixed(3)}.`
    );
  }
}

function findSkeletonRoot(skeleton: Skeleton): Bone | null {
  const boneSet = new Set(skeleton.bones);
  for (const bone of skeleton.bones) {
    if (!bone) {
      continue;
    }
    const parent = bone.parent;
    if (!parent || !(parent as Bone).isBone || !boneSet.has(parent as Bone)) {
      return bone;
    }
  }
  return skeleton.bones[0] ?? null;
}

function validateSkeletonRoots(
  skeletons: readonly Skeleton[],
  expected: number,
  tolerance: number
): void {
  skeletons.forEach((skeleton, index) => {
    const root = findSkeletonRoot(skeleton);
    if (!root) {
      return;
    }
    const label = root.name ? `"${root.name}" root bone` : 'root bone';
    validateScale(
      root.scale,
      expected,
      tolerance,
      `${label} (skeleton ${index})`
    );
  });
}

export function createAvatarAssetPipeline({
  importer,
  importerOptions,
  expectedUnitScale = DEFAULT_EXPECTED_UNIT_SCALE,
  scaleTolerance = DEFAULT_SCALE_TOLERANCE,
}: AvatarAssetPipelineOptions = {}): AvatarAssetPipeline {
  ensureScaleParameters(expectedUnitScale, scaleTolerance);
  const activeImporter = importer ?? createAvatarImporter(importerOptions);

  return {
    async load({
      expectedUnitScale: overrideExpected,
      scaleTolerance: overrideTolerance,
      ...loadOptions
    }: AvatarAssetPipelineLoadOptions): Promise<AvatarImportResult> {
      const expected = overrideExpected ?? expectedUnitScale;
      const tolerance = overrideTolerance ?? scaleTolerance;
      ensureScaleParameters(expected, tolerance);

      const result = await activeImporter.load(loadOptions);
      validateScale(result.scene.scale, expected, tolerance, 'scene root');
      validateSkeletonRoots(result.skeletons, expected, tolerance);
      return result;
    },
    dispose() {
      activeImporter.dispose();
    },
  };
}
