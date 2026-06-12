import {
  BoxGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  type ColorRepresentation,
  type Object3D,
} from 'three';

import type { RectCollider } from '../../systems/collision';
import type { FloorId } from '../../systems/movement/stairs';

export type DebugColliderFloor = FloorId | 'all';

export interface DebugColliderMetadata {
  id: string;
  floor: DebugColliderFloor;
  category: string;
  name: string;
  bounds: RectCollider;
}

export type DebugColliderIdMetadata = Omit<DebugColliderMetadata, 'id'>;

export interface DebugColliderRegistration extends DebugColliderIdMetadata {
  elevation?: number;
  height?: number;
  color?: ColorRepresentation;
}

export interface DebugColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  totalColliderCount: number;
  visibleLabelCount: number;
  totalLabelCount: number;
}

interface DebugColliderVisualEntry {
  metadata: DebugColliderMetadata;
  mesh: Mesh<BoxGeometry, MeshBasicMaterial>;
  label: Sprite | null;
}

export interface ColliderVisualizer {
  readonly group: Group;
  register(colliders: readonly DebugColliderRegistration[]): void;
  setEnabled(enabled: boolean): void;
  setActiveFloor(floorId: FloorId): void;
  getState(): DebugColliderVisualizerState;
  getColliders(): DebugColliderMetadata[];
  getColliderById(id: string): DebugColliderMetadata | undefined;
  dispose(): void;
}

const DEFAULT_HEIGHT = 0.08;
const MIN_DIMENSION = 0.02;
const DEFAULT_COLOR = 0x66e6ff;
const LABEL_Y_OFFSET = 0.34;
const LABEL_CANVAS_WIDTH = 192;
const LABEL_CANVAS_HEIGHT = 96;
const LABEL_WORLD_WIDTH = 1.08;
const LABEL_WORLD_HEIGHT = 0.54;
const MIN_ID_LENGTH = 4;
const MAX_ID_LENGTH = 6;
const HASH_LENGTH = 8;
const HASH_SEED = 0x811c9dc5;
const HASH_PRIME = 0x01000193;
const BOUNDS_PRECISION = 1000;

const FLOOR_COLORS: Record<DebugColliderFloor, number> = {
  ground: 0x2ee66b,
  upper: 0xf7c948,
  all: 0x66e6ff,
};

const LABEL_COLORS = [
  '#7DD3FC',
  '#FDE047',
  '#86EFAC',
  '#FDA4AF',
  '#C4B5FD',
  '#FDBA74',
  '#67E8F9',
  '#F0ABFC',
] as const;

const cloneBounds = (bounds: RectCollider): RectCollider => ({
  minX: bounds.minX,
  maxX: bounds.maxX,
  minZ: bounds.minZ,
  maxZ: bounds.maxZ,
});

const isVisibleOnFloor = (
  colliderFloor: DebugColliderFloor,
  activeFloorId: FloorId
): boolean => colliderFloor === 'all' || colliderFloor === activeFloorId;

const roundBound = (value: number): string =>
  (Math.round(value * BOUNDS_PRECISION) / BOUNDS_PRECISION).toFixed(3);

const getColliderDebugIdKey = (metadata: DebugColliderIdMetadata): string =>
  [
    metadata.name,
    metadata.floor,
    metadata.category,
    roundBound(metadata.bounds.minX),
    roundBound(metadata.bounds.maxX),
    roundBound(metadata.bounds.minZ),
    roundBound(metadata.bounds.maxZ),
  ].join('|');

const fnv1aHash = (input: string): string => {
  let hash = HASH_SEED;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, HASH_PRIME) >>> 0;
  }

  return hash.toString(16).toUpperCase().padStart(HASH_LENGTH, '0');
};

export function createColliderDebugId(
  metadata: DebugColliderIdMetadata,
  usedIds: ReadonlySet<string> = new Set()
): string {
  const hash = fnv1aHash(getColliderDebugIdKey(metadata));

  for (let length = MIN_ID_LENGTH; length <= MAX_ID_LENGTH; length += 1) {
    const candidate = hash.slice(0, length);
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  const suffixBase = hash.slice(0, MAX_ID_LENGTH - 1);
  for (let suffix = 0; suffix <= 0xf; suffix += 1) {
    const candidate = `${suffixBase}${suffix.toString(16).toUpperCase()}`;
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  return hash;
}

const parseColliderIdColorIndex = (id: string): number => {
  const parsed = Number.parseInt(id.slice(-2), 16);
  return Number.isFinite(parsed) ? parsed % LABEL_COLORS.length : 0;
};

const createLabelCanvas = (): HTMLCanvasElement | null => {
  if (
    typeof document === 'undefined' ||
    (typeof navigator !== 'undefined' &&
      navigator.userAgent.toLowerCase().includes('jsdom'))
  ) {
    return null;
  }

  return document.createElement('canvas');
};

const createColliderLabel = (id: string): Sprite | null => {
  const canvas = createLabelCanvas();
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return null;
  }

  canvas.width = LABEL_CANVAS_WIDTH;
  canvas.height = LABEL_CANVAS_HEIGHT;

  const labelColor = LABEL_COLORS[parseColliderIdColorIndex(id)];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(8, 13, 24, 0.82)';
  context.strokeStyle = labelColor;
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(8, 16, canvas.width - 16, canvas.height - 32, 18);
  context.fill();
  context.stroke();

  context.font =
    '700 44px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  context.strokeText(id, canvas.width / 2, canvas.height / 2 + 1);
  context.fillStyle = labelColor;
  context.fillText(id, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  const material = new SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new Sprite(material);
  sprite.name = `DebugColliderLabel:${id}`;
  sprite.scale.set(LABEL_WORLD_WIDTH, LABEL_WORLD_HEIGHT, 1);
  sprite.renderOrder = 10_001;
  sprite.userData.debugOnly = true;
  sprite.userData.colliderDebugLabel = true;
  sprite.userData.colliderDebugId = id;
  sprite.raycast = () => undefined;

  return sprite;
};

export function createColliderVisualizer(options: {
  activeFloorId: FloorId;
  enabled?: boolean;
}): ColliderVisualizer {
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.visible = options.enabled ?? false;
  group.userData.debugOnly = true;

  const entries: DebugColliderVisualEntry[] = [];
  const usedIds = new Set<string>();
  let enabled = options.enabled ?? false;
  let activeFloorId = options.activeFloorId;

  const applyVisibility = () => {
    group.visible = enabled;
    for (const entry of entries) {
      const visible =
        enabled && isVisibleOnFloor(entry.metadata.floor, activeFloorId);
      entry.mesh.visible = visible;
      if (entry.label) {
        entry.label.visible = visible;
      }
    }
  };

  const register = (colliders: readonly DebugColliderRegistration[]) => {
    for (const collider of colliders) {
      const id = createColliderDebugId(collider, usedIds);
      usedIds.add(id);
      const width = Math.max(
        collider.bounds.maxX - collider.bounds.minX,
        MIN_DIMENSION
      );
      const depth = Math.max(
        collider.bounds.maxZ - collider.bounds.minZ,
        MIN_DIMENSION
      );
      const height = collider.height ?? DEFAULT_HEIGHT;
      const centerX = (collider.bounds.minX + collider.bounds.maxX) / 2;
      const centerZ = (collider.bounds.minZ + collider.bounds.maxZ) / 2;
      const elevation = collider.elevation ?? 0;
      const geometry = new BoxGeometry(width, height, depth);
      const material = new MeshBasicMaterial({
        color: collider.color ?? FLOOR_COLORS[collider.floor] ?? DEFAULT_COLOR,
        depthTest: false,
        depthWrite: false,
        opacity: 0.42,
        transparent: true,
        wireframe: true,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = `DebugCollider:${id}:${collider.floor}:${collider.category}:${collider.name}`;
      mesh.position.set(centerX, elevation + height / 2, centerZ);
      mesh.renderOrder = 10_000;
      mesh.userData.debugOnly = true;
      mesh.userData.colliderDebug = {
        id,
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
      };
      mesh.raycast = () => undefined;
      group.add(mesh);

      const label = createColliderLabel(id);
      if (label) {
        label.position.set(
          centerX,
          elevation + height + LABEL_Y_OFFSET,
          centerZ
        );
        group.add(label);
      }

      entries.push({
        metadata: {
          id,
          floor: collider.floor,
          category: collider.category,
          name: collider.name,
          bounds: cloneBounds(collider.bounds),
        },
        mesh,
        label,
      });
    }
    applyVisibility();
  };

  const getVisibleEntries = () =>
    enabled
      ? entries.filter((entry) =>
          isVisibleOnFloor(entry.metadata.floor, activeFloorId)
        )
      : [];

  const cloneMetadata = (
    metadata: DebugColliderMetadata
  ): DebugColliderMetadata => ({
    id: metadata.id,
    floor: metadata.floor,
    category: metadata.category,
    name: metadata.name,
    bounds: cloneBounds(metadata.bounds),
  });

  return {
    group,
    register,
    setEnabled(next: boolean) {
      enabled = next;
      applyVisibility();
    },
    setActiveFloor(next: FloorId) {
      activeFloorId = next;
      applyVisibility();
    },
    getState() {
      const visibleEntries = getVisibleEntries();
      return {
        enabled,
        visibleColliderCount: visibleEntries.length,
        totalColliderCount: entries.length,
        visibleLabelCount: visibleEntries.filter((entry) => entry.label).length,
        totalLabelCount: entries.filter((entry) => entry.label).length,
      };
    },
    getColliders() {
      return entries.map((entry) => cloneMetadata(entry.metadata));
    },
    getColliderById(id: string) {
      const normalizedId = id.toUpperCase();
      const entry = entries.find(
        (candidate) => candidate.metadata.id === normalizedId
      );
      return entry ? cloneMetadata(entry.metadata) : undefined;
    },
    dispose() {
      for (const entry of entries) {
        group.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        if (entry.label) {
          group.remove(entry.label);
          entry.label.material.map?.dispose();
          entry.label.material.dispose();
        }
      }
      entries.length = 0;
      usedIds.clear();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
