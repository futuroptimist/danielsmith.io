import {
  Box3,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineSegments,
  LineBasicMaterial,
  Mesh,
  Sprite,
  SpriteMaterial,
  Vector3,
  WireframeGeometry,
  type Material,
  type Object3D,
} from 'three';

import { allocateDebugId } from './debugIds';

export interface DebugSolidMetadata {
  id: string;
  name: string;
  path: string;
  parentPath: string;
  meshType: string;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  material?: string;
}

export interface DebugSolidVisualizerState {
  enabled: boolean;
  visibleSolidCount: number;
  totalSolidCount: number;
  visibleLabelCount: number;
  totalLabelCount: number;
}

interface Entry {
  metadata: DebugSolidMetadata;
  wireframe: LineSegments<WireframeGeometry, LineBasicMaterial>;
  label: Sprite;
}

const PRECISION = 2;
const LABEL_PALETTE = [
  '#8BE9FD',
  '#F1FA8C',
  '#FF79C6',
  '#50FA7B',
  '#BD93F9',
  '#FFB86C',
];
const tmpBox = new Box3();
const tmpSize = new Vector3();

const round = (value: number) =>
  Math.round(value * 10 ** PRECISION) / 10 ** PRECISION;
const formatVector = (v: Vector3) =>
  `${round(v.x)},${round(v.y)},${round(v.z)}`;

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;
const isDebugExcluded = (object: Object3D): boolean => {
  for (
    let current: Object3D | null = object;
    current;
    current = current.parent
  ) {
    if (
      current.userData.debugOnly ||
      current.userData.poiMarker ||
      current.userData.hud
    ) {
      return true;
    }
  }
  return false;
};

const objectPath = (object: Object3D): string => {
  const parts: string[] = [];
  for (
    let current: Object3D | null = object;
    current;
    current = current.parent
  ) {
    parts.push(current.name || current.type);
  }
  return parts.reverse().join('/');
};

const materialSummary = (
  material: Material | Material[]
): string | undefined => {
  const first = Array.isArray(material) ? material[0] : material;
  if (!first) return undefined;
  const color =
    'color' in first && first.color instanceof Color
      ? `#${first.color.getHexString()}`
      : undefined;
  return [first.type, color].filter(Boolean).join(':');
};

const geometrySignature = (geometry: BufferGeometry): string => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  return [
    geometry.type,
    geometry.attributes.position?.count ?? 0,
    geometry.index?.count ?? 0,
    box ? `${formatVector(box.min)}>${formatVector(box.max)}` : 'no-box',
  ].join('|');
};

const colorForId = (id: string): string => {
  const numeric = Number.parseInt(id, 16);
  return LABEL_PALETTE[
    (Number.isFinite(numeric) ? numeric : 0) % LABEL_PALETTE.length
  ];
};

const createLabelTexture = (
  id: string,
  color: string
): CanvasTexture | undefined => {
  if (
    typeof document === 'undefined' ||
    (typeof process !== 'undefined' && Boolean(process.env.VITEST))
  )
    return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.fillStyle = 'rgba(5, 8, 16, 0.82)';
  context.strokeStyle = color;
  context.lineWidth = 8;
  context.roundRect(12, 22, 232, 84, 18);
  context.fill();
  context.stroke();
  context.font =
    '700 54px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 9;
  context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  context.strokeText(id, 128, 67);
  context.fillStyle = color;
  context.fillText(id, 128, 67);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const cloneMetadata = (metadata: DebugSolidMetadata): DebugSolidMetadata => ({
  ...metadata,
  bounds: {
    min: { ...metadata.bounds.min },
    max: { ...metadata.bounds.max },
  },
});

export const createSolidDebugId = (
  metadata: Omit<DebugSolidMetadata, 'id'>,
  usedIds: ReadonlySet<string> = new Set()
): string =>
  allocateDebugId(
    `solid|${metadata.path}|${metadata.meshType}|${JSON.stringify(metadata.bounds)}|${metadata.material ?? ''}`,
    usedIds
  );

export const createSolidVisualizer = (options: {
  scene: Object3D;
  enabled?: boolean;
  reservedIds?: ReadonlySet<string>;
}) => {
  const group = new Group();
  group.name = 'DebugSolidVisualizer';
  group.userData.debugOnly = true;
  const entries: Entry[] = [];
  let enabled = options.enabled ?? false;
  const usedIds = new Set(options.reservedIds ?? []);

  const applyVisibility = () => {
    group.visible = enabled;
    for (const entry of entries) {
      entry.wireframe.visible = enabled;
      entry.label.visible = enabled;
    }
  };

  const register = () => {
    const meshes: Mesh[] = [];
    options.scene.updateMatrixWorld(true);
    options.scene.traverse((object) => {
      if (isMesh(object) && !isDebugExcluded(object) && object.visible)
        meshes.push(object);
    });
    const metadata = meshes.map((mesh) => {
      tmpBox.setFromObject(mesh);
      const path = objectPath(mesh);
      return {
        name: mesh.name || mesh.type,
        path,
        parentPath: mesh.parent ? objectPath(mesh.parent) : '',
        meshType: mesh.type,
        bounds: {
          min: {
            x: round(tmpBox.min.x),
            y: round(tmpBox.min.y),
            z: round(tmpBox.min.z),
          },
          max: {
            x: round(tmpBox.max.x),
            y: round(tmpBox.max.y),
            z: round(tmpBox.max.z),
          },
        },
        material: materialSummary(mesh.material),
        seed: `${path}|${geometrySignature(mesh.geometry)}|${JSON.stringify([tmpBox.min.x, tmpBox.min.y, tmpBox.min.z, tmpBox.max.x, tmpBox.max.y, tmpBox.max.z].map(round))}`,
        mesh,
      };
    });
    metadata.sort((a, b) => a.seed.localeCompare(b.seed));
    const seedCounts = new Map<string, number>();
    for (const item of metadata) {
      const occurrence = seedCounts.get(item.seed) ?? 0;
      seedCounts.set(item.seed, occurrence + 1);
      const base = { ...item };
      delete (base as { mesh?: Mesh }).mesh;
      delete (base as { seed?: string }).seed;
      const id = allocateDebugId(
        occurrence > 0 ? `${item.seed}|occurrence:${occurrence}` : item.seed,
        usedIds
      );
      usedIds.add(id);
      const color = colorForId(id);
      const wireframe = new LineSegments(
        new WireframeGeometry(item.mesh.geometry),
        new LineBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.72,
          toneMapped: false,
        })
      );
      item.mesh.updateWorldMatrix(true, false);
      wireframe.applyMatrix4(item.mesh.matrixWorld);
      wireframe.name = `DebugSolid:${id}:${item.name}`;
      wireframe.renderOrder = 19_900;
      wireframe.frustumCulled = false;
      wireframe.userData.debugOnly = true;
      wireframe.raycast = () => undefined;
      const texture = createLabelTexture(id, color);
      const label = new Sprite(
        new SpriteMaterial({
          color: texture ? 0xffffff : color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.98,
          toneMapped: false,
          ...(texture ? { map: texture } : {}),
        })
      );
      tmpBox.getSize(tmpSize);
      label.name = `DebugSolidLabel:${id}`;
      label.position.set(
        (item.bounds.min.x + item.bounds.max.x) / 2,
        item.bounds.max.y + Math.max(0.25, tmpSize.y * 0.15),
        (item.bounds.min.z + item.bounds.max.z) / 2
      );
      label.scale.set(1.6, 0.8, 1);
      label.renderOrder = 19_901;
      label.frustumCulled = false;
      label.userData.debugOnly = true;
      label.raycast = () => undefined;
      group.add(wireframe, label);
      entries.push({ metadata: { id, ...base }, wireframe, label });
    }
    applyVisibility();
  };

  register();
  return {
    group,
    setEnabled(next: boolean) {
      enabled = next;
      applyVisibility();
    },
    getState(): DebugSolidVisualizerState {
      return {
        enabled,
        visibleSolidCount: enabled ? entries.length : 0,
        totalSolidCount: entries.length,
        visibleLabelCount: enabled ? entries.length : 0,
        totalLabelCount: entries.length,
      };
    },
    getSolids: () => entries.map((entry) => cloneMetadata(entry.metadata)),
    getSolidById(id: unknown) {
      if (typeof id !== 'string' || id.length === 0) return undefined;
      const entry = entries.find(
        (next) => next.metadata.id === id.toUpperCase()
      );
      return entry ? cloneMetadata(entry.metadata) : undefined;
    },
    dispose() {
      for (const entry of entries) {
        group.remove(entry.wireframe, entry.label);
        entry.wireframe.geometry.dispose();
        entry.wireframe.material.dispose();
        entry.label.material.map?.dispose();
        entry.label.material.dispose();
      }
      entries.length = 0;
      group.parent?.remove(group);
    },
  };
};
