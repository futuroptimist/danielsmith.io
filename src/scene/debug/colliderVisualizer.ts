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

export interface DebugColliderRegistration {
  floor: DebugColliderFloor;
  category: string;
  name: string;
  bounds: RectCollider;
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
  getColliderById(id: unknown): DebugColliderMetadata | undefined;
  dispose(): void;
}

const DEFAULT_HEIGHT = 0.08;
const MIN_DIMENSION = 0.02;
const DEFAULT_COLOR = 0x66e6ff;
const DEBUG_ID_MIN_LENGTH = 4;
const DEBUG_ID_MAX_LENGTH = 6;
const DEBUG_ID_PRECISION = 2;
const LABEL_CANVAS_WIDTH = 256;
const LABEL_CANVAS_HEIGHT = 128;
const LABEL_TEXT_MAX_WIDTH = LABEL_CANVAS_WIDTH - 48;
const LABEL_FONT_MAX_SIZE = 54;
const LABEL_FONT_MIN_SIZE = 28;
const LABEL_SCALE_X = 1.15;
const LABEL_SCALE_Y = 0.58;
const LABEL_VERTICAL_GAP = 0.18;
const LABEL_PALETTE = [
  '#8BE9FD',
  '#F1FA8C',
  '#FF79C6',
  '#50FA7B',
  '#BD93F9',
  '#FFB86C',
];
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

const isVisibleOnFloor = (
  colliderFloor: DebugColliderFloor,
  activeFloorId: FloorId
): boolean => colliderFloor === 'all' || colliderFloor === activeFloorId;

const roundDebugValue = (value: number): number =>
  Math.round(value * 10 ** DEBUG_ID_PRECISION) / 10 ** DEBUG_ID_PRECISION;

const normalizeBoundsForId = (bounds: RectCollider): string =>
  [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ]
    .map((value) => roundDebugValue(value).toFixed(DEBUG_ID_PRECISION))
    .join(',');

const getColliderDebugSeed = (
  metadata: Omit<DebugColliderMetadata, 'id'>
): string =>
  [
    metadata.name,
    metadata.floor,
    metadata.category,
    normalizeBoundsForId(metadata.bounds),
  ].join('|');

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const getColliderDebugHash = (seed: string): string =>
  fnv1a(seed)
    .toString(16)
    .toUpperCase()
    .padStart(DEBUG_ID_MAX_LENGTH, '0')
    .slice(0, DEBUG_ID_MAX_LENGTH);

const getColliderDebugIdCandidates = (seed: string): string[] => {
  const hash = getColliderDebugHash(seed);
  const candidates: string[] = [];
  for (
    let length = DEBUG_ID_MIN_LENGTH;
    length <= DEBUG_ID_MAX_LENGTH;
    length += 1
  ) {
    candidates.push(hash.slice(0, length));
  }
  return candidates;
};

export function createColliderDebugId(
  metadata: Omit<DebugColliderMetadata, 'id'>,
  usedIds: ReadonlySet<string> = new Set()
): string {
  const seed = getColliderDebugSeed(metadata);
  const primaryCandidate = getColliderDebugHash(seed);
  if (!usedIds.has(primaryCandidate)) {
    return primaryCandidate;
  }

  return getColliderDebugRetryId(seed, new Set(usedIds));
}

const getMetadataWithoutId = (
  metadata: DebugColliderMetadata
): Omit<DebugColliderMetadata, 'id'> => ({
  floor: metadata.floor,
  category: metadata.category,
  name: metadata.name,
  bounds: cloneBounds(metadata.bounds),
});

interface DebugColliderIdRecord {
  index: number;
  seed: string;
  primaryId: string;
  seedOccurrence: number;
  seedOccurrenceCount: number;
}

const getColliderDebugRetryId = (
  seed: string,
  usedIds: Set<string>
): string => {
  for (
    let retryIndex = 1;
    retryIndex < Number.MAX_SAFE_INTEGER;
    retryIndex += 1
  ) {
    for (const candidate of getColliderDebugIdCandidates(
      `${seed}|retry:${retryIndex}`
    )) {
      if (!usedIds.has(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error('Unable to allocate a short collider debug ID');
};

const allocateColliderDebugIds = (
  metadataList: readonly Omit<DebugColliderMetadata, 'id'>[]
): string[] => {
  const seedCounts = new Map<string, number>();
  const primaryCounts = new Map<string, number>();
  const records = metadataList.map((metadata, index) => {
    const seed = getColliderDebugSeed(metadata);
    const primaryId = getColliderDebugHash(seed);
    const seedOccurrence = seedCounts.get(seed) ?? 0;
    seedCounts.set(seed, seedOccurrence + 1);
    primaryCounts.set(primaryId, (primaryCounts.get(primaryId) ?? 0) + 1);
    return { index, seed, primaryId, seedOccurrence };
  });
  const recordsWithCounts: DebugColliderIdRecord[] = records.map((record) => ({
    ...record,
    seedOccurrenceCount: seedCounts.get(record.seed) ?? 1,
  }));

  const ids = Array<string>(metadataList.length);
  const usedIds = new Set<string>();
  for (const record of recordsWithCounts) {
    if ((primaryCounts.get(record.primaryId) ?? 0) === 1) {
      ids[record.index] = record.primaryId;
      usedIds.add(record.primaryId);
    }
  }

  const collisionRecords = recordsWithCounts
    .filter((record) => (primaryCounts.get(record.primaryId) ?? 0) > 1)
    .sort(
      (left, right) =>
        left.primaryId.localeCompare(right.primaryId) ||
        left.seed.localeCompare(right.seed) ||
        left.seedOccurrence - right.seedOccurrence
    );

  for (const record of collisionRecords) {
    // Identical metadata has no stable differentiator beyond deterministic
    // registration occurrence, so only exact duplicates receive this salt.
    const retrySeed =
      record.seedOccurrenceCount > 1
        ? `${record.seed}|occurrence:${record.seedOccurrence}`
        : record.seed;
    const id = getColliderDebugRetryId(retrySeed, usedIds);
    ids[record.index] = id;
    usedIds.add(id);
  }

  return ids;
};

const getLabelPaletteIndex = (id: string): number => {
  const numericPrefix = Number.parseInt(
    id.replace(/[^0-9A-F]/g, '').slice(0, DEBUG_ID_MAX_LENGTH),
    16
  );
  return Number.isFinite(numericPrefix)
    ? numericPrefix % LABEL_PALETTE.length
    : 0;
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const right = x + width;
  const bottom = y + height;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.quadraticCurveTo(right, y, right, y + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(x + radius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
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

  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext('2d');
  } catch {
    context = null;
  }
  if (!context) {
    return undefined;
  }

  context.clearRect(0, 0, LABEL_CANVAS_WIDTH, LABEL_CANVAS_HEIGHT);
  context.fillStyle = 'rgba(5, 8, 16, 0.82)';
  context.strokeStyle = color;
  context.lineWidth = 8;
  drawRoundedRect(
    context,
    12,
    22,
    LABEL_CANVAS_WIDTH - 24,
    LABEL_CANVAS_HEIGHT - 44,
    18
  );
  context.fill();
  context.stroke();

  for (
    let fontSize = LABEL_FONT_MAX_SIZE;
    fontSize >= LABEL_FONT_MIN_SIZE;
    fontSize -= 2
  ) {
    context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    if (context.measureText(id).width <= LABEL_TEXT_MAX_WIDTH) {
      break;
    }
  }
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

const createColliderLabel = (
  id: string,
  color: string
): Sprite<SpriteMaterial> => {
  const texture = createLabelTexture(id, color);
  const material = new SpriteMaterial({
    color: texture ? 0xffffff : color,
    depthTest: false,
    depthWrite: false,
    opacity: 0.95,
    transparent: true,
    ...(texture ? { map: texture } : {}),
  });
  const label = new Sprite(material);
  label.name = `DebugColliderLabel:${id}`;
  label.renderOrder = 10_001;
  label.scale.set(LABEL_SCALE_X, LABEL_SCALE_Y, 1);
  label.userData.debugOnly = true;
  label.userData.colliderDebugLabel = { id };
  label.raycast = () => undefined;
  return label;
};

const getDebugColliderMeshName = (metadata: DebugColliderMetadata): string =>
  `DebugCollider:${metadata.id}:${metadata.floor}:${metadata.category}:${metadata.name}`;

const applyDebugIdToEntry = (
  entry: DebugColliderVisualEntry,
  id: string
): void => {
  if (entry.metadata.id === id) {
    return;
  }

  entry.metadata.id = id;
  entry.mesh.name = getDebugColliderMeshName(entry.metadata);
  entry.mesh.userData.colliderDebug = {
    id,
    floor: entry.metadata.floor,
    category: entry.metadata.category,
    name: entry.metadata.name,
  };

  const labelColor = LABEL_PALETTE[getLabelPaletteIndex(id)];
  const texture = createLabelTexture(id, labelColor);
  entry.label.material.map?.dispose();
  entry.label.material.map = texture ?? null;
  entry.label.material.color.set(texture ? 0xffffff : labelColor);
  entry.label.material.needsUpdate = true;
  entry.label.name = `DebugColliderLabel:${id}`;
  entry.label.userData.colliderDebugLabel = { id };
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
    const metadataWithoutIds = colliders.map((collider) => ({
      floor: collider.floor,
      category: collider.category,
      name: collider.name,
      bounds: cloneBounds(collider.bounds),
    }));
    const existingEntryCount = entries.length;
    const nextIds = allocateColliderDebugIds([
      ...entries.map((entry) => getMetadataWithoutId(entry.metadata)),
      ...metadataWithoutIds,
    ]);

    entries.forEach((entry, index) => {
      applyDebugIdToEntry(entry, nextIds[index]);
    });

    for (const [colliderIndex, collider] of colliders.entries()) {
      const metadataWithoutId = metadataWithoutIds[colliderIndex];
      const id = nextIds[existingEntryCount + colliderIndex];

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
      const centerX = (collider.bounds.minX + collider.bounds.maxX) / 2;
      const centerZ = (collider.bounds.minZ + collider.bounds.maxZ) / 2;
      const baseElevation = collider.elevation ?? 0;
      mesh.position.set(centerX, baseElevation + height / 2, centerZ);
      mesh.name = getDebugColliderMeshName({ id, ...metadataWithoutId });
      mesh.renderOrder = 10_000;
      mesh.userData.debugOnly = true;
      mesh.userData.colliderDebug = {
        id,
        floor: collider.floor,
        category: collider.category,
        name: collider.name,
      };
      mesh.raycast = () => undefined;

      const labelColor = LABEL_PALETTE[getLabelPaletteIndex(id)];
      const label = createColliderLabel(id, labelColor);
      label.position.set(
        centerX,
        baseElevation + height + LABEL_VERTICAL_GAP,
        centerZ
      );

      group.add(mesh, label);
      entries.push({
        metadata: {
          id,
          ...metadataWithoutId,
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
      return {
        enabled,
        visibleColliderCount: getVisibleColliderCount(),
        totalColliderCount: entries.length,
      };
    },
    getColliders() {
      return entries.map((entry) => cloneMetadata(entry.metadata));
    },
    getColliderById(id: unknown) {
      if (typeof id !== 'string' || id.length === 0) {
        return undefined;
      }
      const normalizedId = id.toUpperCase();
      const entry = entries.find((next) => next.metadata.id === normalizedId);
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
      const parent = group.parent as Object3D | null;
      parent?.remove(group);
    },
  };
}
