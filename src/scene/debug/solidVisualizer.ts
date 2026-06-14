import {
  Box3,
  CanvasTexture,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';

import { allocateDebugId, getDebugHash } from './debugIds';

interface SolidBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface DebugSolidMetadata {
  id: string;
  name: string;
  path: string;
  parentPath: string;
  meshType: string;
  bounds: SolidBounds;
  material: string | undefined;
}

export interface DebugSolidVisualizerState {
  enabled: boolean;
  visibleSolidCount: number;
  totalSolidCount: number;
  visibleLabelCount: number;
  totalLabelCount: number;
}

interface SolidEntry {
  metadata: DebugSolidMetadata;
  wireframe: LineSegments;
  label: Sprite;
}

export interface SolidVisualizer {
  readonly group: Group;
  register(sceneRoot: Object3D, existingIds?: ReadonlySet<string>): void;
  setEnabled(enabled: boolean): void;
  getState(): DebugSolidVisualizerState;
  getSolids(): DebugSolidMetadata[];
  getSolidById(id: unknown): DebugSolidMetadata | undefined;
  dispose(): void;
}

const LABEL_PALETTE = [
  '#FF5555',
  '#8BE9FD',
  '#F1FA8C',
  '#50FA7B',
  '#BD93F9',
  '#FFB86C',
];
const LABEL_CANVAS_WIDTH = 256;
const LABEL_CANVAS_HEIGHT = 128;
const LABEL_SCALE_X = 1.6;
const LABEL_SCALE_Y = 0.8;
const LABEL_VERTICAL_GAP = 0.35;
const DEBUG_ID_PRIMARY_SALT = 'solid-debug-id:v1';
const DEBUG_ID_PRECISION = 2;

const roundDebugValue = (value: number): number =>
  Math.round(value * 10 ** DEBUG_ID_PRECISION) / 10 ** DEBUG_ID_PRECISION;

const cloneBounds = (bounds: SolidBounds): SolidBounds => ({
  min: { ...bounds.min },
  max: { ...bounds.max },
});

const getObjectSegment = (object: Object3D): string =>
  object.name || object.type;

const getObjectPath = (object: Object3D): string => {
  const segments: string[] = [];
  let current: Object3D | null = object;
  while (current) {
    segments.push(getObjectSegment(current));
    current = current.parent;
  }
  return segments.reverse().join('/');
};

const isExcludedObject = (object: Object3D): boolean => {
  if (
    object.userData.debugOnly ||
    object.type.includes('Light') ||
    object.type === 'Camera'
  ) {
    return true;
  }
  if (
    object.userData.poiId ||
    object.userData.poiLabel ||
    object.userData.colliderDebug
  ) {
    return true;
  }
  return false;
};

const isSolidMesh = (
  object: Object3D
): object is Mesh<BufferGeometry, Material | Material[]> =>
  object instanceof Mesh && !isExcludedObject(object);

const materialSummary = (
  material: Material | Material[]
): string | undefined => {
  const firstMaterial = Array.isArray(material) ? material[0] : material;
  if (!firstMaterial) {
    return undefined;
  }
  const color = (firstMaterial as Material & { color?: Color }).color;
  return color
    ? `${firstMaterial.type} #${color.getHexString()}`
    : firstMaterial.type;
};

const boundsToMetadata = (box: Box3): SolidBounds => ({
  min: { x: box.min.x, y: box.min.y, z: box.min.z },
  max: { x: box.max.x, y: box.max.y, z: box.max.z },
});

const getGeometrySignature = (geometry: BufferGeometry): string => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new Box3();
  const position = geometry.getAttribute('position');
  return [
    geometry.type,
    position?.count ?? 0,
    roundDebugValue(box.min.x),
    roundDebugValue(box.min.y),
    roundDebugValue(box.min.z),
    roundDebugValue(box.max.x),
    roundDebugValue(box.max.y),
    roundDebugValue(box.max.z),
  ].join('|');
};

const getStableSeed = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  mesh: Mesh<BufferGeometry>
): string => {
  const position = new Vector3();
  const scale = new Vector3();
  mesh.matrixWorld.decompose(position, new Quaternion(), scale);
  return [
    metadata.name,
    metadata.path,
    metadata.parentPath,
    metadata.meshType,
    getGeometrySignature(mesh.geometry),
    [position.x, position.y, position.z, scale.x, scale.y, scale.z]
      .map((value) => roundDebugValue(value).toFixed(DEBUG_ID_PRECISION))
      .join(','),
    [
      metadata.bounds.min.x,
      metadata.bounds.min.y,
      metadata.bounds.min.z,
      metadata.bounds.max.x,
      metadata.bounds.max.y,
      metadata.bounds.max.z,
    ]
      .map((value) => roundDebugValue(value).toFixed(DEBUG_ID_PRECISION))
      .join(','),
  ].join('|');
};

export const createSolidDebugId = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  usedIds: ReadonlySet<string> = new Set(),
  seed = [
    metadata.name,
    metadata.path,
    metadata.parentPath,
    metadata.meshType,
    metadata.material ?? '',
    metadata.bounds.min.x,
    metadata.bounds.min.y,
    metadata.bounds.min.z,
    metadata.bounds.max.x,
    metadata.bounds.max.y,
    metadata.bounds.max.z,
  ].join('|')
): string =>
  allocateDebugId(
    getDebugHash(`${seed}|${DEBUG_ID_PRIMARY_SALT}`),
    seed,
    usedIds
  );

const getLabelColor = (id: string): string => {
  const numericPrefix = Number.parseInt(
    id.replace(/[^0-9A-F]/g, '').slice(0, 6),
    16
  );
  return LABEL_PALETTE[
    (Number.isFinite(numericPrefix) ? numericPrefix : 0) % LABEL_PALETTE.length
  ];
};

const createLabelTexture = (
  id: string,
  color: string
): CanvasTexture | undefined => {
  if (
    typeof document === 'undefined' ||
    (typeof process !== 'undefined' && Boolean(process.env.VITEST))
  ) {
    return undefined;
  }
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_CANVAS_WIDTH;
  canvas.height = LABEL_CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.fillStyle = 'rgba(5, 8, 16, 0.82)';
  context.strokeStyle = color;
  context.lineWidth = 8;
  context.roundRect(
    12,
    22,
    LABEL_CANVAS_WIDTH - 24,
    LABEL_CANVAS_HEIGHT - 44,
    18
  );
  context.fill();
  context.stroke();
  context.font =
    '700 54px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 9;
  context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  context.strokeText(id, LABEL_CANVAS_WIDTH / 2, LABEL_CANVAS_HEIGHT / 2 + 3);
  context.fillStyle = color;
  context.fillText(id, LABEL_CANVAS_WIDTH / 2, LABEL_CANVAS_HEIGHT / 2 + 3);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const createLabel = (id: string, color: string): Sprite => {
  const texture = createLabelTexture(id, color);
  const label = new Sprite(
    new SpriteMaterial({
      color: texture ? 0xffffff : color,
      depthTest: false,
      depthWrite: false,
      opacity: 0.98,
      toneMapped: false,
      transparent: true,
      ...(texture ? { map: texture } : {}),
    })
  );
  label.name = `DebugSolidLabel:${id}`;
  label.renderOrder = 20_101;
  label.frustumCulled = false;
  label.scale.set(LABEL_SCALE_X, LABEL_SCALE_Y, 1);
  label.userData.debugOnly = true;
  label.userData.solidDebugLabel = { id };
  label.raycast = () => undefined;
  return label;
};

export const createSolidVisualizer = (
  options: { enabled?: boolean } = {}
): SolidVisualizer => {
  const group = new Group();
  group.name = 'DebugSolidVisualizer';
  group.visible = options.enabled ?? false;
  group.userData.debugOnly = true;
  const entries: SolidEntry[] = [];
  let enabled = options.enabled ?? false;

  const applyVisibility = () => {
    group.visible = enabled;
    entries.forEach((entry) => {
      entry.wireframe.visible = enabled;
      entry.label.visible = enabled;
    });
  };

  const clear = () => {
    for (const entry of entries) {
      group.remove(entry.wireframe, entry.label);
      entry.wireframe.geometry.dispose();
      (entry.wireframe.material as LineBasicMaterial).dispose();
      entry.label.material.map?.dispose();
      entry.label.material.dispose();
    }
    entries.length = 0;
  };

  const cloneMetadata = (metadata: DebugSolidMetadata): DebugSolidMetadata => ({
    ...metadata,
    bounds: cloneBounds(metadata.bounds),
  });

  return {
    group,
    register(sceneRoot, existingIds = new Set()) {
      clear();
      sceneRoot.updateMatrixWorld(true);
      const items: Array<{
        mesh: Mesh<BufferGeometry>;
        metadata: Omit<DebugSolidMetadata, 'id'>;
        seed: string;
      }> = [];
      sceneRoot.traverse((object) => {
        if (!isSolidMesh(object)) return;
        const worldBox = new Box3().setFromObject(object);
        if (worldBox.isEmpty()) return;
        const metadata = {
          name: object.name || object.type,
          path: getObjectPath(object),
          parentPath: object.parent ? getObjectPath(object.parent) : '',
          meshType: object.type,
          bounds: boundsToMetadata(worldBox),
          material: materialSummary(object.material),
        };
        items.push({
          mesh: object,
          metadata,
          seed: getStableSeed(metadata, object),
        });
      });
      items.sort((left, right) => left.seed.localeCompare(right.seed));
      const usedIds = new Set(existingIds);
      for (const item of items) {
        const id = createSolidDebugId(item.metadata, usedIds, item.seed);
        usedIds.add(id);
        const color = getLabelColor(id);
        const edges = new EdgesGeometry(item.mesh.geometry);
        const wireframe = new LineSegments(
          edges,
          new LineBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.9,
            toneMapped: false,
          })
        );
        wireframe.name = `DebugSolid:${id}:${item.metadata.name}`;
        wireframe.matrixAutoUpdate = false;
        wireframe.matrix.copy(item.mesh.matrixWorld);
        wireframe.renderOrder = 20_100;
        wireframe.frustumCulled = false;
        wireframe.userData.debugOnly = true;
        wireframe.userData.solidDebug = { id };
        wireframe.raycast = () => undefined;
        const label = createLabel(id, color);
        const center = new Box3(
          new Vector3(
            item.metadata.bounds.min.x,
            item.metadata.bounds.min.y,
            item.metadata.bounds.min.z
          ),
          new Vector3(
            item.metadata.bounds.max.x,
            item.metadata.bounds.max.y,
            item.metadata.bounds.max.z
          )
        ).getCenter(new Vector3());
        label.position.set(
          center.x,
          item.metadata.bounds.max.y + LABEL_VERTICAL_GAP,
          center.z
        );
        group.add(wireframe, label);
        entries.push({ metadata: { id, ...item.metadata }, wireframe, label });
      }
      applyVisibility();
    },
    setEnabled(next) {
      enabled = next;
      applyVisibility();
    },
    getState() {
      const visibleCount = enabled ? entries.length : 0;
      return {
        enabled,
        visibleSolidCount: visibleCount,
        totalSolidCount: entries.length,
        visibleLabelCount: visibleCount,
        totalLabelCount: entries.length,
      };
    },
    getSolids() {
      return entries.map((entry) => cloneMetadata(entry.metadata));
    },
    getSolidById(id) {
      if (typeof id !== 'string' || id.length === 0) return undefined;
      const normalizedId = id.toUpperCase();
      const entry = entries.find((next) => next.metadata.id === normalizedId);
      return entry ? cloneMetadata(entry.metadata) : undefined;
    },
    dispose() {
      clear();
      (group.parent as Object3D | null)?.remove(group);
    },
  };
};
