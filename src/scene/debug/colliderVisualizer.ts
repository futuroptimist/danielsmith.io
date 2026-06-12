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

export interface DebugColliderBaseMetadata {
  floor: DebugColliderFloor;
  category: string;
  name: string;
  bounds: RectCollider;
}

export interface DebugColliderMetadata extends DebugColliderBaseMetadata {
  id: string;
}

export interface DebugColliderRegistration extends DebugColliderBaseMetadata {
  elevation?: number;
  height?: number;
  color?: ColorRepresentation;
}

export interface DebugColliderVisualizerState {
  enabled: boolean;
  visibleColliderCount: number;
  totalColliderCount: number;
}

interface DebugColliderVisualEntry {
  metadata: DebugColliderMetadata;
  mesh: Mesh<BoxGeometry, MeshBasicMaterial>;
  label: Sprite<SpriteMaterial>;
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

interface CreateColliderDebugIdOptions {
  usedIds?: ReadonlySet<string>;
  minLength?: number;
  maxLength?: number;
}

const DEFAULT_HEIGHT = 0.08;
const MIN_DIMENSION = 0.02;
const DEFAULT_COLOR = 0x66e6ff;
const DEBUG_ID_MIN_LENGTH = 4;
const DEBUG_ID_MAX_LENGTH = 6;
const LABEL_WIDTH = 0.62;
const LABEL_HEIGHT = 0.28;
const LABEL_Y_OFFSET = 0.16;
const LABEL_TEXTURE_WIDTH = 256;
const LABEL_TEXTURE_HEIGHT = 128;
const LABEL_COLORS = [
  '#66E6FF',
  '#F7C948',
  '#FF7AB6',
  '#8BFF8B',
  '#C9A7FF',
  '#FF9F43',
] as const;
const FLOOR_COLORS: Record<DebugColliderFloor, number> = {
  ground: 0x2ee66b,
  upper: 0xf7c948,
  all: 0x66e6ff,
};

const cloneBounds = (bounds: RectCollider): RectCollider => ({
  minX: bounds.minX,
  maxX: bounds.maxX,
  minZ: bounds.minZ,
  maxZ: bounds.maxZ,
});

const cloneMetadata = (
  metadata: DebugColliderMetadata
): DebugColliderMetadata => ({
  id: metadata.id,
  floor: metadata.floor,
  category: metadata.category,
  name: metadata.name,
  bounds: cloneBounds(metadata.bounds),
});

const isVisibleOnFloor = (
  colliderFloor: DebugColliderFloor,
  activeFloorId: FloorId
): boolean => colliderFloor === 'all' || colliderFloor === activeFloorId;

const formatBound = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : rounded.toFixed(3);
};

const getColliderDebugIdSource = (metadata: DebugColliderBaseMetadata) =>
  [
    metadata.floor,
    metadata.category,
    metadata.name,
    formatBound(metadata.bounds.minX),
    formatBound(metadata.bounds.maxX),
    formatBound(metadata.bounds.minZ),
    formatBound(metadata.bounds.maxZ),
  ].join('|');

const hashStringToHex = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
};

export function createColliderDebugId(
  metadata: DebugColliderBaseMetadata,
  options: CreateColliderDebugIdOptions = {}
): string {
  const usedIds = options.usedIds ?? new Set<string>();
  const minLength = options.minLength ?? DEBUG_ID_MIN_LENGTH;
  const maxLength = options.maxLength ?? DEBUG_ID_MAX_LENGTH;
  const hash = hashStringToHex(getColliderDebugIdSource(metadata));

  for (let length = minLength; length <= maxLength; length += 1) {
    const candidate = hash.slice(0, length);
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  const prefix = hash.slice(0, Math.max(minLength - 1, maxLength - 1));
  for (let suffix = 0; suffix <= 0xf; suffix += 1) {
    const candidate = `${prefix}${suffix.toString(16).toUpperCase()}`.slice(
      0,
      maxLength
    );
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  return hash;
}

const getLabelColor = (id: string): string => {
  const numericId = Number.parseInt(id, 16);
  const paletteIndex = Number.isFinite(numericId)
    ? numericId % LABEL_COLORS.length
    : 0;
  return LABEL_COLORS[paletteIndex];
};

const createLabelTexture = (
  id: string,
  color: string
): CanvasTexture | null => {
  if (
    typeof document === 'undefined' ||
    (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))
  ) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = LABEL_TEXTURE_WIDTH;
  canvas.height = LABEL_TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(3, 8, 18, 0.78)';
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(12, 20, canvas.width - 24, canvas.height - 40, 18);
  context.fill();
  context.stroke();
  context.font = '700 56px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(0, 0, 0, 0.88)';
  context.strokeText(id, canvas.width / 2, canvas.height / 2 + 2);
  context.fillStyle = color;
  context.fillText(id, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const createColliderLabel = (id: string): Sprite<SpriteMaterial> => {
  const color = getLabelColor(id);
  const texture = createLabelTexture(id, color);
  const material = new SpriteMaterial({
    color: texture ? 0xffffff : color,
    depthTest: false,
    depthWrite: false,
    ...(texture ? { map: texture } : {}),
    transparent: true,
  });
  const label = new Sprite(material);
  label.name = `DebugColliderLabel:${id}`;
  label.scale.set(LABEL_WIDTH, LABEL_HEIGHT, 1);
  label.renderOrder = 10_001;
  label.userData.debugOnly = true;
  label.userData.colliderDebugLabel = true;
  label.userData.colliderDebugId = id;
  label.raycast = () => undefined;
  return label;
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
  const usedColliderIds = new Set<string>();
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
      const id = createColliderDebugId(collider, { usedIds: usedColliderIds });
      usedColliderIds.add(id);
      const width = Math.max(
        collider.bounds.maxX - collider.bounds.minX,
        MIN_DIMENSION
      );
      const depth = Math.max(
        collider.bounds.maxZ - collider.bounds.minZ,
        MIN_DIMENSION
      );
      const height = collider.height ?? DEFAULT_HEIGHT;
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
      const centerX = (collider.bounds.minX + collider.bounds.maxX) / 2;
      const centerZ = (collider.bounds.minZ + collider.bounds.maxZ) / 2;
      const baseY = collider.elevation ?? 0;
      mesh.position.set(centerX, baseY + height / 2, centerZ);
      mesh.renderOrder = 10_000;
      mesh.userData.debugOnly = true;
      mesh.userData.colliderDebug = {
        id,
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
      };
      mesh.raycast = () => undefined;

      const label = createColliderLabel(id);
      label.position.set(centerX, baseY + height + LABEL_Y_OFFSET, centerZ);
      label.userData.colliderDebug = mesh.userData.colliderDebug;
      group.add(mesh, label);
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
      return {
        enabled,
        visibleColliderCount: getVisibleColliderCount(),
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
        group.remove(entry.mesh, entry.label);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        entry.label.material.map?.dispose();
        entry.label.material.dispose();
      }
      entries.length = 0;
      usedColliderIds.clear();
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
