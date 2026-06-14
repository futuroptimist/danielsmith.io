import {
  Box3,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Object3D,
  type BufferGeometry,
  type Material,
  type Sprite,
} from 'three';

import {
  DEBUG_LABEL_PALETTE,
  DEBUG_LABEL_VERTICAL_GAP,
  createDebugIdLabel,
  getLabelColorStyle,
} from './colliderVisualizer';
import {
  DEBUG_ID_PRECISION,
  allocateDebugId,
  getDebugHash,
  getDebugPaletteIndex,
  roundDebugValue,
} from './debugIds';

export interface DebugSolidBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface DebugSolidMetadata {
  id: string;
  name: string;
  path: string;
  parentPath: string;
  meshType: string;
  bounds: DebugSolidBounds;
  material?: string;
}

export interface DebugSolidVisualizerState {
  enabled: boolean;
  visibleSolidCount: number;
  totalSolidCount: number;
  visibleLabelCount: number;
  totalLabelCount: number;
}

interface DebugSolidVisualEntry {
  metadata: DebugSolidMetadata;
  wireframe: LineSegments<EdgesGeometry, LineBasicMaterial>;
  label: Sprite;
}

export interface SolidVisualizer {
  readonly group: Group;
  register(root: Object3D, reservedIds?: ReadonlySet<string>): void;
  setEnabled(enabled: boolean): void;
  getState(): DebugSolidVisualizerState;
  getSolids(): DebugSolidMetadata[];
  getSolidById(id: unknown): DebugSolidMetadata | undefined;
  dispose(): void;
}

const DEBUG_SOLID_PRIMARY_SALT = 'debug-solid-id:v1';

const round = (value: number): number => roundDebugValue(value);
const format = (value: number): string =>
  round(value).toFixed(DEBUG_ID_PRECISION);

const isMesh = (
  object: Object3D
): object is Mesh<BufferGeometry, Material | Material[]> =>
  object instanceof Mesh;

const isExcluded = (object: Object3D): boolean => {
  if (
    object.userData.debugOnly ||
    object.userData.colliderDebug ||
    object.userData.poiLabel
  ) {
    return true;
  }
  if (
    object.type === 'Sprite' ||
    object.type.includes('Light') ||
    object.type === 'Camera'
  ) {
    return true;
  }
  return object.name.startsWith('Debug') || object.name.includes('Helper');
};

const getObjectPath = (object: Object3D): string => {
  const parts: string[] = [];
  let current: Object3D | null = object;
  while (current) {
    parts.push(current.name || current.type);
    current = current.parent;
  }
  return parts.reverse().join('/');
};

const cloneBounds = (bounds: DebugSolidBounds): DebugSolidBounds => ({
  min: { ...bounds.min },
  max: { ...bounds.max },
});

const getBounds = (object: Object3D): DebugSolidBounds => {
  const box = new Box3().setFromObject(object);
  return {
    min: { x: round(box.min.x), y: round(box.min.y), z: round(box.min.z) },
    max: { x: round(box.max.x), y: round(box.max.y), z: round(box.max.z) },
  };
};

const getGeometrySignature = (geometry: BufferGeometry): string => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const positionCount = geometry.getAttribute('position')?.count ?? 0;
  const indexCount = geometry.index?.count ?? 0;
  return [
    geometry.type,
    `pos:${positionCount}`,
    `idx:${indexCount}`,
    box
      ? [
          format(box.min.x),
          format(box.min.y),
          format(box.min.z),
          format(box.max.x),
          format(box.max.y),
          format(box.max.z),
        ].join(',')
      : 'bounds:none',
  ].join('|');
};

const getMaterialSummary = (
  material: Material | Material[]
): string | undefined => {
  const materials = Array.isArray(material) ? material : [material];
  return materials
    .map((entry) => {
      const color = (entry as Material & { color?: Color }).color;
      return color ? `${entry.type}:#${color.getHexString()}` : entry.type;
    })
    .join(',');
};

const getSolidSeed = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  geometrySignature: string
) =>
  [
    metadata.name,
    metadata.path,
    metadata.parentPath,
    metadata.meshType,
    `${metadata.bounds.min.x},${metadata.bounds.min.y},${metadata.bounds.min.z}`,
    `${metadata.bounds.max.x},${metadata.bounds.max.y},${metadata.bounds.max.z}`,
    geometrySignature,
  ].join('|');

export const createSolidDebugId = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  usedIds: ReadonlySet<string> = new Set(),
  geometrySignature = ''
): string => {
  const seed = getSolidSeed(metadata, geometrySignature);
  return allocateDebugId(
    seed,
    usedIds,
    getDebugHash(`${seed}|${DEBUG_SOLID_PRIMARY_SALT}`)
  );
};

const cloneMetadata = (metadata: DebugSolidMetadata): DebugSolidMetadata => ({
  ...metadata,
  bounds: cloneBounds(metadata.bounds),
});

export const createSolidVisualizer = (
  options: { enabled?: boolean } = {}
): SolidVisualizer => {
  const group = new Group();
  group.name = 'DebugSolidVisualizer';
  group.userData.debugOnly = true;
  group.visible = options.enabled ?? false;
  const entries: DebugSolidVisualEntry[] = [];
  let enabled = options.enabled ?? false;

  const applyVisibility = () => {
    group.visible = enabled;
    entries.forEach((entry) => {
      entry.wireframe.visible = enabled;
      entry.label.visible = enabled;
    });
  };

  const clear = () => {
    entries.forEach((entry) => {
      group.remove(entry.wireframe, entry.label);
      entry.wireframe.geometry.dispose();
      entry.wireframe.material.dispose();
      entry.label.material.map?.dispose();
      entry.label.material.dispose();
    });
    entries.length = 0;
  };

  const register = (
    root: Object3D,
    reservedIds: ReadonlySet<string> = new Set()
  ) => {
    clear();
    root.updateMatrixWorld(true);
    const meshes: Array<{
      mesh: Mesh<BufferGeometry, Material | Material[]>;
      seed: string;
      metadata: Omit<DebugSolidMetadata, 'id'>;
      geometrySignature: string;
    }> = [];

    root.traverse((object) => {
      if (!isMesh(object) || isExcluded(object)) {
        return;
      }
      const bounds = getBounds(object);
      if (!Number.isFinite(bounds.min.x) || !Number.isFinite(bounds.max.x)) {
        return;
      }
      const path = getObjectPath(object);
      const parentPath = object.parent ? getObjectPath(object.parent) : '';
      const geometrySignature = getGeometrySignature(object.geometry);
      const metadata = {
        name: object.name || object.type,
        path,
        parentPath,
        meshType: object.type,
        bounds,
        material: getMaterialSummary(object.material),
      };
      meshes.push({
        mesh: object,
        metadata,
        geometrySignature,
        seed: getSolidSeed(metadata, geometrySignature),
      });
    });

    meshes.sort((left, right) => left.seed.localeCompare(right.seed));
    const usedIds = new Set(reservedIds);
    const seedCounts = new Map<string, number>();
    for (const item of meshes) {
      const occurrence = seedCounts.get(item.seed) ?? 0;
      seedCounts.set(item.seed, occurrence + 1);
      const idSeed =
        occurrence > 0 ? `${item.seed}|occurrence:${occurrence}` : item.seed;
      const id = allocateDebugId(
        idSeed,
        usedIds,
        getDebugHash(`${idSeed}|${DEBUG_SOLID_PRIMARY_SALT}`)
      );
      usedIds.add(id);
      const color = getLabelColorStyle(
        DEBUG_LABEL_PALETTE[
          getDebugPaletteIndex(id, DEBUG_LABEL_PALETTE.length)
        ]
      );
      const wireframe = new LineSegments(
        new EdgesGeometry(item.mesh.geometry),
        new LineBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.85,
          toneMapped: false,
        })
      );
      wireframe.name = `DebugSolid:${id}:${item.metadata.path}`;
      item.mesh.matrixWorld.decompose(
        wireframe.position,
        wireframe.quaternion,
        wireframe.scale
      );
      wireframe.renderOrder = 20_002;
      wireframe.frustumCulled = false;
      wireframe.userData.debugOnly = true;
      wireframe.userData.solidDebug = { id };
      wireframe.raycast = () => undefined;

      const label = createDebugIdLabel(id, color);
      label.name = `DebugSolidLabel:${id}`;
      label.position.set(
        (item.metadata.bounds.min.x + item.metadata.bounds.max.x) / 2,
        item.metadata.bounds.max.y + DEBUG_LABEL_VERTICAL_GAP,
        (item.metadata.bounds.min.z + item.metadata.bounds.max.z) / 2
      );
      label.userData.solidDebugLabel = { id };
      label.raycast = () => undefined;

      group.add(wireframe, label);
      entries.push({ metadata: { id, ...item.metadata }, wireframe, label });
    }
    applyVisibility();
  };

  return {
    group,
    register,
    setEnabled(next: boolean) {
      enabled = next;
      applyVisibility();
    },
    getState() {
      return {
        enabled,
        visibleSolidCount: enabled ? entries.length : 0,
        totalSolidCount: entries.length,
        visibleLabelCount: enabled ? entries.length : 0,
        totalLabelCount: entries.length,
      };
    },
    getSolids() {
      return entries.map((entry) => cloneMetadata(entry.metadata));
    },
    getSolidById(id: unknown) {
      if (typeof id !== 'string' || id.length === 0) {
        return undefined;
      }
      const normalizedId = id.toUpperCase();
      const entry = entries.find((next) => next.metadata.id === normalizedId);
      return entry ? cloneMetadata(entry.metadata) : undefined;
    },
    dispose() {
      clear();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
};
