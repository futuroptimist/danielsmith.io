import type { ColorRepresentation, Object3D } from 'three';

import type {
  SceneDetailLevel,
  SceneDetailPolicy,
} from '../graphics/sceneDetailPolicy';
import type { PoiId } from '../poi/types';

export type MiniatureMaterialRole =
  | 'base'
  | 'accent'
  | 'screen'
  | 'glass'
  | 'metal'
  | 'plant'
  | 'cable'
  | 'warning'
  | 'white';
export type MiniaturePrimitiveKind =
  | 'box'
  | 'plane'
  | 'cylinder'
  | 'sphere'
  | 'ring'
  | 'tube';

export interface MiniatureTransform {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

export interface MiniaturePrimitiveDefinition extends MiniatureTransform {
  kind: MiniaturePrimitiveKind;
  name: string;
  role?: MiniatureMaterialRole;
  color?: ColorRepresentation;
  size?: readonly [number, number, number];
  radius?: number;
  tube?: number;
  height?: number;
  points?: readonly (readonly [number, number, number])[];
  minDetail?: SceneDetailLevel;
  maxDetail?: SceneDetailLevel;
  repeats?: readonly MiniatureTransform[];
}

export interface MiniatureProxyDefinition {
  id: string;
  displayName: string;
  primitives: readonly MiniaturePrimitiveDefinition[];
  syncRevision: number;
  syncNote?: string;
  sourceFiles: readonly string[];
  proxyFiles: readonly string[];
}

export interface MiniaturePoiProxyDefinition extends MiniatureProxyDefinition {
  poiId: PoiId;
  recursionBoundary?: boolean;
}

export interface MiniatureBuildContext {
  detailPolicy: SceneDetailPolicy;
}

export interface MiniatureBuildResult {
  root: Object3D;
  semanticNames: string[];
}
