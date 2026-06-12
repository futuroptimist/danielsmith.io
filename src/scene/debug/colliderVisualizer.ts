import {
  BoxGeometry,
  CanvasTexture,
  Group,
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

export type DebugColliderIdInput = Omit<DebugColliderMetadata, 'id'>;

export interface DebugColliderRegistration extends DebugColliderIdInput {
  elevation?: number;
  height?: number;
  color?: ColorRepresentation;
}

export interface DebugColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  visibleLabelCount: number;
  totalColliderCount: number;
}

interface DebugColliderVisualEntry {
  metadata: DebugColliderMetadata;
  mesh: Mesh<BoxGeometry, MeshBasicMaterial>;
  label: Sprite;
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
const LABEL_WIDTH = 0.78;
const LABEL_HEIGHT = 0.28;
const LABEL_Y_OFFSET = 0.2;
const ID_MIN_LENGTH = 4;
const ID_MAX_LENGTH = 6;
const ID_HASH_SEED = 0x811c9dc5;
const ID_HASH_PRIME = 0x01000193;
const FLOOR_COLORS: Record<DebugColliderFloor, number> = {
  ground: 0x2ee66b,
  upper: 0xf7c948,
  all: 0x66e6ff,
};
const LABEL_COLORS = [
  '#66E6FF',
  '#F7C948',
  '#FF7AB6',
  '#8BFF8F',
  '#B692FF',
  '#FF9F40',
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

const roundDebugCoordinate = (value: number): string => value.toFixed(3);

const createColliderDebugSignature = (collider: DebugColliderIdInput): string =>
  [
    collider.floor,
    collider.category,
    collider.name,
    roundDebugCoordinate(collider.bounds.minX),
    roundDebugCoordinate(collider.bounds.maxX),
    roundDebugCoordinate(collider.bounds.minZ),
    roundDebugCoordinate(collider.bounds.maxZ),
  ].join('|');

const hashStringToHex = (input: string): string => {
  let hash = ID_HASH_SEED;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, ID_HASH_PRIME) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
};

export function createColliderDebugId(
  collider: DebugColliderIdInput,
  reservedIds: ReadonlySet<string> = new Set()
): string {
  const signature = createColliderDebugSignature(collider);

  for (let length = ID_MIN_LENGTH; length <= ID_MAX_LENGTH; length += 1) {
    const candidate = hashStringToHex(signature).slice(0, length);
    if (!reservedIds.has(candidate)) {
      return candidate;
    }
  }

  for (let salt = 1; salt < 0xffff; salt += 1) {
    const saltedHash = hashStringToHex(`${signature}|${salt}`);
    for (let length = ID_MIN_LENGTH; length <= ID_MAX_LENGTH; length += 1) {
      const candidate = saltedHash.slice(0, length);
      if (!reservedIds.has(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error('Unable to allocate a unique collider debug ID.');
}

const getLabelPaletteIndex = (id: string): number =>
  parseInt(id.slice(-2), 16) % LABEL_COLORS.length;

const createLabelCanvasTexture = (
  id: string,
  color: string
): CanvasTexture | null => {
  if (
    typeof document === 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom'))
  ) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(7, 12, 20, 0.86)';
  context.strokeStyle = color;
  context.lineWidth = 6;
  context.beginPath();
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 18);
  context.fill();
  context.stroke();

  context.font = '700 48px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  context.strokeText(id, canvas.width / 2, canvas.height / 2 + 2);
  context.fillStyle = color;
  context.fillText(id, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const createColliderLabel = (id: string, color: string): Sprite => {
  const texture = createLabelCanvasTexture(id, color);
  const material = new SpriteMaterial({
    color: texture ? 0xffffff : color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    ...(texture ? { map: texture } : {}),
  });
  const label = new Sprite(material);
  label.name = `DebugColliderLabel:${id}`;
  label.renderOrder = 10_001;
  label.scale.set(LABEL_WIDTH, LABEL_HEIGHT, 1);
  label.userData.debugOnly = true;
  label.userData.colliderDebugLabel = true;
  label.userData.colliderDebugId = id;
  label.raycast = () => undefined;
  return label;
};

const cloneMetadata = (
  metadata: DebugColliderMetadata
): DebugColliderMetadata => ({
  id: metadata.id,
  floor: metadata.floor,
  category: metadata.category,
  name: metadata.name,
  bounds: cloneBounds(metadata.bounds),
});

export function createColliderVisualizer(options: {
  activeFloorId: FloorId;
  enabled?: boolean;
}): ColliderVisualizer {
  const group = new Group();
  group.name = 'DebugColliderVisualizer';
  group.visible = options.enabled ?? false;
  group.userData.debugOnly = true;

  const entries: DebugColliderVisualEntry[] = [];
  const reservedIds = new Set<string>();
  let enabled = options.enabled ?? false;
  let activeFloorId = options.activeFloorId;

  const applyVisibility = () => {
    group.visible = enabled;
    for (const entry of entries) {
      const visible =
        enabled && isVisibleOnFloor(entry.metadata.floor, activeFloorId);
      entry.mesh.visible = visible;
      entry.label.visible = visible;
    }
  };

  const register = (colliders: readonly DebugColliderRegistration[]) => {
    for (const collider of colliders) {
      const width = Math.max(
        collider.bounds.maxX - collider.bounds.minX,
        MIN_DIMENSION
      );
      const depth = Math.max(
        collider.bounds.maxZ - collider.bounds.minZ,
        MIN_DIMENSION
      );
      const height = collider.height ?? DEFAULT_HEIGHT;
      const id = createColliderDebugId(collider, reservedIds);
      reservedIds.add(id);
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
      mesh.position.set(
        (collider.bounds.minX + collider.bounds.maxX) / 2,
        (collider.elevation ?? 0) + height / 2,
        (collider.bounds.minZ + collider.bounds.maxZ) / 2
      );
      mesh.renderOrder = 10_000;
      mesh.userData.debugOnly = true;
      mesh.userData.colliderDebug = {
        id,
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
      };
      mesh.raycast = () => undefined;

      const label = createColliderLabel(
        id,
        LABEL_COLORS[getLabelPaletteIndex(id)]
      );
      label.position.set(
        mesh.position.x,
        (collider.elevation ?? 0) + height + LABEL_Y_OFFSET,
        mesh.position.z
      );

      group.add(mesh);
      group.add(label);
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

  const getVisibleColliderCount = () =>
    enabled
      ? entries.filter((entry) =>
          isVisibleOnFloor(entry.metadata.floor, activeFloorId)
        ).length
      : 0;

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
      const visibleColliderCount = getVisibleColliderCount();
      return {
        enabled,
        visibleColliderCount,
        visibleLabelCount: visibleColliderCount,
        totalColliderCount: entries.length,
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
        group.remove(entry.label);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        entry.label.material.map?.dispose();
        entry.label.material.dispose();
      }
      entries.length = 0;
      reservedIds.clear();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
