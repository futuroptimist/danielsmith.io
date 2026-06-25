import { Euler, Object3D, Quaternion, Vector3 } from 'three';

import type { PoiId } from './types';

export type PoiVisualAnchorKind = 'floor' | 'wall' | 'environment';

interface PoiVisualAnchorRecord {
  object: Object3D;
  kind: PoiVisualAnchorKind;
}

export interface ResolvedPoiVisualAnchor {
  id: PoiId;
  object: Object3D;
  kind: PoiVisualAnchorKind;
  worldPosition: Vector3;
  worldYaw: number;
}

const anchors = new Map<PoiId, PoiVisualAnchorRecord>();
const yawEuler = new Euler(0, 0, 0, 'YXZ');

export function registerPoiVisualAnchor(
  id: PoiId,
  object: Object3D,
  kind: PoiVisualAnchorKind = 'floor',
  options: { replace?: boolean } = {}
): void {
  if (anchors.has(id) && !options.replace) {
    throw new Error(`Duplicate visual anchor registration for POI "${id}".`);
  }
  anchors.set(id, { object, kind });
}

export function resolvePoiVisualAnchor(
  id: PoiId
): ResolvedPoiVisualAnchor | null {
  const record = anchors.get(id);
  if (!record) return null;
  const worldPosition = record.object.getWorldPosition(new Vector3());
  const worldQuaternion = record.object.getWorldQuaternion(new Quaternion());
  yawEuler.setFromQuaternion(worldQuaternion, 'YXZ');
  return {
    id,
    object: record.object,
    kind: record.kind,
    worldPosition,
    worldYaw: yawEuler.y,
  };
}

export function clearPoiVisualAnchors(): void {
  anchors.clear();
}
