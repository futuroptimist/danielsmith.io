import type { Group, MeshStandardMaterialParameters } from 'three';

import type { SceneDetailLevel } from '../graphics/sceneDetailPolicy';
import type { PoiId } from '../poi/types';

export type MiniaturePrimitiveKind =
  | 'box'
  | 'plane'
  | 'cylinder'
  | 'sphere'
  | 'ring'
  | 'tube';
export type MiniatureMaterialRole =
  | 'base'
  | 'accent'
  | 'screen'
  | 'glass'
  | 'wood'
  | 'metal'
  | 'plant'
  | 'warning'
  | 'white';

export interface MiniatureTransform {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
}

export interface MiniaturePrimitive extends MiniatureTransform {
  kind: MiniaturePrimitiveKind;
  name: string;
  material?: MiniatureMaterialRole;
  color?: number;
  size?: readonly [number, number, number];
  radius?: number;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  points?: readonly (readonly [number, number, number])[];
  includeFrom?: SceneDetailLevel;
  includeUntil?: SceneDetailLevel;
  repeat?: { count: number; offset: readonly [number, number, number] };
}

export interface MiniatureProxyDefinition {
  id: string;
  poiId?: PoiId;
  semanticName: string;
  recursionBoundary?: boolean;
  allowRecursion?: false;
  parts: readonly MiniaturePrimitive[];
  sync: MiniatureSyncEntry;
}

export interface MiniatureSyncEntry {
  id: string;
  overworldSourceFiles: readonly string[];
  proxySourceFiles: readonly string[];
  syncRevision: number;
  syncNote?: string;
}

export interface MiniatureBuildOptions {
  detailLevel: SceneDetailLevel;
}

export interface MiniatureBuiltProxy {
  root: Group;
  detailBearingTriangles: number;
  structuralBaselineTriangles: number;
}

export interface MiniatureMaterialDefinition
  extends MeshStandardMaterialParameters {
  role: MiniatureMaterialRole;
}
