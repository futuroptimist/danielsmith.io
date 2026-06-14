import {
  Box3,
  CanvasTexture,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  WireframeGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';

import { allocateDebugId, getDebugHash, roundDebugValue } from './debugIds';

interface DebugSolidEntry {
  metadata: DebugSolidMetadata;
  wireframe: LineSegments<WireframeGeometry, LineBasicMaterial>;
  label: Sprite;
}

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
  geometrySignature?: string;
  materialSummary?: string;
}

export interface DebugSolidVisualizerState {
  enabled: boolean;
  visibleSolidCount: number;
  totalSolidCount: number;
  visibleLabelCount: number;
  totalLabelCount: number;
}

export interface SolidVisualizer {
  readonly group: Group;
  register(sceneRoot: Object3D): void;
  setEnabled(enabled: boolean): void;
  getState(): DebugSolidVisualizerState;
  getSolids(): DebugSolidMetadata[];
  getSolidById(id: unknown): DebugSolidMetadata | undefined;
  dispose(): void;
}

const LABEL_CANVAS_WIDTH = 256;
const LABEL_CANVAS_HEIGHT = 128;
const LABEL_PALETTE = [
  '#8BE9FD',
  '#F1FA8C',
  '#FF79C6',
  '#50FA7B',
  '#BD93F9',
  '#FFB86C',
];
const LABEL_SCALE_X = 1.6;
const LABEL_SCALE_Y = 0.8;
const LABEL_VERTICAL_GAP = 0.42;
const DEBUG_ID_PRIMARY_SALT = 'solid-debug-id:v1';
const scratchBox = new Box3();
const scratchSize = new Vector3();

const round = (value: number): number => roundDebugValue(value);

const cloneBounds = (bounds: DebugSolidBounds): DebugSolidBounds => ({
  min: { ...bounds.min },
  max: { ...bounds.max },
});

const shouldExcludeObject = (object: Object3D): boolean =>
  object.userData.debugOnly === true ||
  object.type === 'Camera' ||
  object.type.includes('Light') ||
  object.type === 'Sprite';

const getObjectPath = (object: Object3D, root: Object3D): string => {
  const names: string[] = [];
  let current: Object3D | null = object;
  while (current && current !== root) {
    names.push(current.name || current.type);
    current = current.parent;
  }
  names.push(root.name || root.type);
  return names.reverse().join('/');
};

const summarizeMaterial = (
  material: Material | Material[]
): string | undefined => {
  const first = Array.isArray(material) ? material[0] : material;
  if (!first) {
    return undefined;
  }
  const color =
    'color' in first && first.color instanceof Color
      ? `#${first.color.getHexString()}`
      : undefined;
  return [first.type, color].filter(Boolean).join(':');
};

const getGeometrySignature = (geometry: BufferGeometry): string => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const positionCount = geometry.getAttribute('position')?.count ?? 0;
  const indexCount = geometry.index?.count ?? 0;
  const dimensions = box
    ? [
        round(box.max.x - box.min.x),
        round(box.max.y - box.min.y),
        round(box.max.z - box.min.z),
      ].join(',')
    : 'unbounded';
  return `${geometry.type}|p:${positionCount}|i:${indexCount}|d:${dimensions}`;
};

const getBounds = (object: Object3D): DebugSolidBounds => {
  scratchBox.setFromObject(object);
  return {
    min: {
      x: round(scratchBox.min.x),
      y: round(scratchBox.min.y),
      z: round(scratchBox.min.z),
    },
    max: {
      x: round(scratchBox.max.x),
      y: round(scratchBox.max.y),
      z: round(scratchBox.max.z),
    },
  };
};

const getSolidSeed = (metadata: Omit<DebugSolidMetadata, 'id'>): string =>
  [
    metadata.name,
    metadata.path,
    metadata.parentPath,
    metadata.meshType,
    metadata.geometrySignature ?? '',
    JSON.stringify(metadata.bounds),
    metadata.materialSummary ?? '',
  ].join('|');

export const createSolidDebugId = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  usedIds: ReadonlySet<string> = new Set()
): string => {
  const seed = getSolidSeed(metadata);
  return allocateDebugId(
    getDebugHash(`${seed}|${DEBUG_ID_PRIMARY_SALT}`),
    seed,
    usedIds
  );
};

const getLabelColor = (id: string): string => {
  const numericPrefix = Number.parseInt(
    id.replace(/[^0-9A-F]/g, '').slice(0, 6),
    16
  );
  return LABEL_PALETTE[
    Number.isFinite(numericPrefix) ? numericPrefix % LABEL_PALETTE.length : 0
  ];
};

const createLabelTexture = (
  id: string,
  color: string
): CanvasTexture | undefined => {
  if (
    typeof document === 'undefined' ||
    (typeof process !== 'undefined' && Boolean(process.env.VITEST)) ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom'))
  ) {
    return undefined;
  }
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_CANVAS_WIDTH;
  canvas.height = LABEL_CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }
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
    '700 48px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
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
  label.renderOrder = 20_011;
  label.frustumCulled = false;
  label.scale.set(LABEL_SCALE_X, LABEL_SCALE_Y, 1);
  label.userData.debugOnly = true;
  label.userData.solidDebugLabel = { id };
  label.raycast = () => undefined;
  return label;
};

const cloneMetadata = (metadata: DebugSolidMetadata): DebugSolidMetadata => ({
  ...metadata,
  bounds: cloneBounds(metadata.bounds),
});

export function createSolidVisualizer(
  options: {
    enabled?: boolean;
    reservedIds?: Iterable<string>;
  } = {}
): SolidVisualizer {
  const group = new Group();
  group.name = 'DebugSolidVisualizer';
  group.visible = options.enabled ?? false;
  group.userData.debugOnly = true;

  const entries: DebugSolidEntry[] = [];
  let enabled = options.enabled ?? false;

  const applyVisibility = () => {
    group.visible = enabled;
    for (const entry of entries) {
      entry.wireframe.visible = enabled;
      entry.label.visible = enabled;
    }
  };

  const disposeEntries = () => {
    for (const entry of entries) {
      group.remove(entry.wireframe, entry.label);
      entry.wireframe.geometry.dispose();
      entry.wireframe.material.dispose();
      entry.label.material.map?.dispose();
      entry.label.material.dispose();
    }
    entries.length = 0;
  };

  return {
    group,
    register(sceneRoot: Object3D) {
      disposeEntries();
      sceneRoot.updateMatrixWorld(true);
      const candidates: Array<{
        mesh: Mesh;
        metadata: Omit<DebugSolidMetadata, 'id'>;
      }> = [];
      const visitObject = (object: Object3D) => {
        if (shouldExcludeObject(object)) {
          return;
        }
        if (object instanceof Mesh && object.visible) {
          const path = getObjectPath(object, sceneRoot);
          candidates.push({
            mesh: object,
            metadata: {
              name: object.name || object.type,
              path,
              parentPath: object.parent
                ? getObjectPath(object.parent, sceneRoot)
                : '',
              meshType: object.type,
              bounds: getBounds(object),
              geometrySignature: getGeometrySignature(object.geometry),
              materialSummary: summarizeMaterial(object.material),
            },
          });
        }
        for (const child of object.children) {
          visitObject(child);
        }
      };
      visitObject(sceneRoot);
      candidates.sort((left, right) =>
        getSolidSeed(left.metadata).localeCompare(getSolidSeed(right.metadata))
      );

      const usedIds = new Set(options.reservedIds ?? []);
      const seedCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const seed = getSolidSeed(candidate.metadata);
        const occurrence = seedCounts.get(seed) ?? 0;
        seedCounts.set(seed, occurrence + 1);
        const metadataSeed =
          occurrence > 0
            ? {
                ...candidate.metadata,
                path: `${candidate.metadata.path}|${occurrence}`,
              }
            : candidate.metadata;
        const id = createSolidDebugId(metadataSeed, usedIds);
        usedIds.add(id);
        const color = getLabelColor(id);
        const wireframe = new LineSegments(
          new WireframeGeometry(candidate.mesh.geometry),
          new LineBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.82,
            toneMapped: false,
          })
        );
        wireframe.name = `DebugSolid:${id}:${candidate.metadata.name}`;
        wireframe.matrixAutoUpdate = false;
        wireframe.matrix.copy(candidate.mesh.matrixWorld);
        wireframe.renderOrder = 20_010;
        wireframe.frustumCulled = false;
        wireframe.userData.debugOnly = true;
        wireframe.userData.solidDebug = { id };
        wireframe.raycast = () => undefined;

        const label = createLabel(id, color);
        scratchBox.setFromObject(candidate.mesh);
        scratchBox.getSize(scratchSize);
        label.position.set(
          (candidate.metadata.bounds.min.x + candidate.metadata.bounds.max.x) /
            2,
          candidate.metadata.bounds.max.y +
            Math.max(LABEL_VERTICAL_GAP, scratchSize.y * 0.08),
          (candidate.metadata.bounds.min.z + candidate.metadata.bounds.max.z) /
            2
        );

        group.add(wireframe, label);
        entries.push({
          metadata: { id, ...candidate.metadata },
          wireframe,
          label,
        });
      }
      applyVisibility();
    },
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
      disposeEntries();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
