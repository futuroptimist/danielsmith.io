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
  | 'metal'
  | 'glass'
  | 'wood'
  | 'cable'
  | 'plant'
  | 'white';
export type MiniaturePrimitiveKind =
  | 'box'
  | 'plane'
  | 'cylinder'
  | 'sphere'
  | 'ring'
  | 'tube';

export interface MiniaturePart {
  kind: MiniaturePrimitiveKind;
  name: string;
  material: MiniatureMaterialRole;
  color?: ColorRepresentation;
  size?: [number, number, number];
  radius?: number;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  points?: [number, number, number][];
  position?: [number, number, number];
  rotation?: [number, number, number];
  minDetail?: SceneDetailLevel;
  maxDetail?: SceneDetailLevel;
  repeat?: { count: number; offset: [number, number, number] };
}

export interface MiniatureProxyDefinition {
  id: PoiId;
  label: string;
  recursionBoundary?: boolean;
  parts: readonly MiniaturePart[];
  sourceFiles: readonly string[];
  proxyFiles: readonly string[];
  syncRevision: number;
  syncNote?: string;
}

export interface MiniatureBuildOptions {
  detailPolicy: SceneDetailPolicy;
}
export type MiniatureProxyBuilder = (
  options: MiniatureBuildOptions
) => Object3D;
