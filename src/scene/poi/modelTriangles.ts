import type { Object3D } from 'three';

import { countObjectTriangles } from '../structures/triangleCount';

import type { PoiId } from './types';

const poiModelRoots = new Map<PoiId, Object3D>();

export function registerPoiModelRoot(poiId: PoiId, root: Object3D): void {
  poiModelRoots.set(poiId, root);
}

export function clearPoiModelRoots(): void {
  poiModelRoots.clear();
}

export function getPoiModelRoot(poiId: PoiId): Object3D | undefined {
  return poiModelRoots.get(poiId);
}

export function getPoiModelTriangleCount(poiId: PoiId): number | null {
  const root = getPoiModelRoot(poiId);
  return root ? countObjectTriangles(root) : null;
}