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
  mesh: Mesh<BufferGeometry, Material | Material[]>;
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
  update(): void;
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

const matchesExcludedName = (name: string): boolean => {
  const normalizedName = name.toLowerCase();
  return (
    name.startsWith('Debug') ||
    name.startsWith('POI') ||
    name.startsWith('POI_HIT:') ||
    normalizedName.includes('debug') ||
    normalizedName.includes('collider') ||
    normalizedName.includes('helper') ||
    normalizedName.includes('hitarea') ||
    normalizedName.includes('hit-area') ||
    normalizedName.includes('interaction') ||
    normalizedName.includes('hud') ||
    normalizedName.includes('label') ||
    normalizedName.includes('sprite') ||
    normalizedName.includes('ui') ||
    normalizedName.startsWith('player') ||
    normalizedName.includes('avatar') ||
    normalizedName.includes('mannequin')
  );
};

const isPoiUiDebugOrHelperObject = (object: Object3D): boolean => {
  if (
    object.userData.debugOnly ||
    object.userData.colliderDebug ||
    object.userData.poiLabel ||
    object.userData.poi ||
    object.userData.hud ||
    object.userData.ui ||
    object.userData.label ||
    object.userData.player ||
    object.userData.avatar
  ) {
    return true;
  }
  if (matchesExcludedName(object.name)) {
    return true;
  }
  if (
    object.type === 'Sprite' ||
    object.type.includes('Light') ||
    object.type === 'Camera' ||
    object.type.includes('Helper')
  ) {
    return true;
  }
  return false;
};

const isInvisibleMaterial = (material: Material): boolean =>
  material.transparent === true && material.opacity <= 0;

const hasInvisibleMaterial = (material: Material | Material[]): boolean => {
  const materials = Array.isArray(material) ? material : [material];
  return materials.length > 0 && materials.every(isInvisibleMaterial);
};

const isEligibleSolidSource = (object: Object3D): boolean => {
  let current: Object3D | null = object;
  while (current) {
    if (isPoiUiDebugOrHelperObject(current)) {
      return false;
    }
    current = current.parent;
  }
  return true;
};

const hasEffectiveSourceVisibility = (object: Object3D): boolean => {
  let current: Object3D | null = object;
  while (current) {
    if (!current.visible || isPoiUiDebugOrHelperObject(current)) {
      return false;
    }
    current = current.parent;
  }
  return true;
};

const hasFiniteBounds = (bounds: DebugSolidBounds): boolean =>
  Number.isFinite(bounds.min.x) &&
  Number.isFinite(bounds.min.y) &&
  Number.isFinite(bounds.min.z) &&
  Number.isFinite(bounds.max.x) &&
  Number.isFinite(bounds.max.y) &&
  Number.isFinite(bounds.max.z);

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

const getBounds = (
  object: Object3D,
  sourceGeometry?: BufferGeometry
): DebugSolidBounds => {
  const originalBoundingBox = sourceGeometry?.boundingBox ?? null;
  const hadBoundingBox = sourceGeometry?.boundingBox !== null;
  const box = new Box3().setFromObject(object);
  if (sourceGeometry && !hadBoundingBox) {
    sourceGeometry.boundingBox = null;
  } else if (sourceGeometry) {
    sourceGeometry.boundingBox = originalBoundingBox;
  }
  return {
    min: { x: round(box.min.x), y: round(box.min.y), z: round(box.min.z) },
    max: { x: round(box.max.x), y: round(box.max.y), z: round(box.max.z) },
  };
};

const getGeometrySignature = (geometry: BufferGeometry): string => {
  const sourceBox = geometry.boundingBox;
  let signatureGeometry: BufferGeometry | undefined;
  if (!sourceBox) {
    signatureGeometry = geometry.clone();
    signatureGeometry.computeBoundingBox();
  }
  const box = sourceBox ?? signatureGeometry?.boundingBox ?? null;
  const positionCount = geometry.getAttribute('position')?.count ?? 0;
  const indexCount = geometry.index?.count ?? 0;
  const signature = [
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
  signatureGeometry?.dispose();
  return signature;
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

  const syncEntryTransform = (entry: DebugSolidVisualEntry) => {
    entry.mesh.updateMatrixWorld(true);
    entry.mesh.matrixWorld.decompose(
      entry.wireframe.position,
      entry.wireframe.quaternion,
      entry.wireframe.scale
    );
    const bounds = getBounds(entry.mesh, entry.mesh.geometry);
    if (hasFiniteBounds(bounds)) {
      entry.metadata.bounds = bounds;
      entry.label.position.set(
        (bounds.min.x + bounds.max.x) / 2,
        bounds.max.y + DEBUG_LABEL_VERTICAL_GAP,
        (bounds.min.z + bounds.max.z) / 2
      );
    }
  };

  const applyVisibility = () => {
    group.visible = enabled;
    entries.forEach((entry) => {
      const entryVisible =
        enabled &&
        hasEffectiveSourceVisibility(entry.mesh) &&
        !hasInvisibleMaterial(entry.mesh.material);
      entry.wireframe.visible = entryVisible;
      entry.label.visible = entryVisible;
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
      if (!isMesh(object) || !isEligibleSolidSource(object)) {
        return;
      }
      const bounds = getBounds(object, object.geometry);
      if (!hasFiniteBounds(bounds)) {
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
      delete label.userData.colliderDebugLabel;
      label.userData.solidDebugLabel = { id };
      label.raycast = () => undefined;

      const entry = {
        mesh: item.mesh,
        metadata: { id, ...item.metadata },
        wireframe,
        label,
      };
      syncEntryTransform(entry);
      group.add(wireframe, label);
      entries.push(entry);
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
      const visibleEntryCount = enabled
        ? entries.filter(
            (entry) =>
              hasEffectiveSourceVisibility(entry.mesh) &&
              !hasInvisibleMaterial(entry.mesh.material)
          ).length
        : 0;
      return {
        enabled,
        visibleSolidCount: visibleEntryCount,
        totalSolidCount: entries.length,
        visibleLabelCount: visibleEntryCount,
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
    update() {
      if (!enabled) {
        return;
      }
      entries.forEach(syncEntryTransform);
      applyVisibility();
    },
    dispose() {
      clear();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
};
