import type { Object3D } from 'three';

import type {
  SceneDetailLevel,
  SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import type { PoiId } from '../poi/types';

export type MiniatureMaterialRole =
  | 'base'
  | 'accent'
  | 'screen'
  | 'metal'
  | 'glass'
  | 'plant'
  | 'cable'
  | 'warning'
  | 'white';

export interface MiniatureTransform {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

export type MiniaturePrimitiveKind =
  | 'box'
  | 'plane'
  | 'cylinder'
  | 'sphere'
  | 'ring'
  | 'tube';

export interface MiniaturePrimitive extends MiniatureTransform {
  kind: MiniaturePrimitiveKind;
  name: string;
  material: MiniatureMaterialRole;
  color?: number;
  size?: readonly [number, number, number];
  radius?: number;
  tubeRadius?: number;
  height?: number;
  points?: readonly (readonly [number, number, number])[];
  minDetail?: SceneDetailLevel;
  maxDetail?: SceneDetailLevel;
  repeat?: {
    count: number;
    offset: readonly [number, number, number];
    namePrefix?: string;
  };
}

export interface MiniatureProxyDefinition {
  id: string;
  label: string;
  primitives: readonly MiniaturePrimitive[];
  syncRevision: number;
  syncNote?: string;
  sourceFiles: readonly string[];
  proxyFiles: readonly string[];
}

export interface PoiMiniatureProxyDefinition extends MiniatureProxyDefinition {
  poiId: PoiId;
  recursionBoundary?: boolean;
}

export type SceneComponentCoverageKind = 'shared-source' | 'proxy' | 'excluded';

export interface SceneComponentCoverageEntry extends MiniatureProxyDefinition {
  kind: SceneComponentCoverageKind;
  reason?: string;
}

export interface MiniatureBuildContext {
  detailLevel: SceneDetailLevel;
  detailPolicy: SceneDetailPolicy;
}

export interface MiniatureProxyBuildResult {
  root: Object3D;
  semanticNames: string[];
}
