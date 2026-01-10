import { FLOOR_PLAN } from '../../assets/floorPlan';
import {
  formatMessage,
  getControlOverlayStrings,
  getPoiCopy,
} from '../../assets/i18n';

import { scalePoiValue } from './constants';
import { applyManualPoiPlacements } from './placements';
import type {
  PoiCategory,
  PoiDefinition,
  PoiId,
  PoiPedestalConfig,
  PoiRegistry,
} from './types';
import { assertValidPoiDefinitions } from './validation';

type PoiPedestalStaticConfig = PoiPedestalConfig;

type PoiStaticDefinition = Omit<
  PoiDefinition,
  | 'title'
  | 'summary'
  | 'outcome'
  | 'metrics'
  | 'links'
  | 'narration'
  | 'pedestal'
> & { pedestal?: PoiPedestalStaticConfig };

const baseDefinitions: PoiStaticDefinition[] = [
  {
    id: 'futuroptimist-living-room-tv',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    // Recentered near living room center, away from walls
    position: { x: -10.5, y: 0, z: -13.5 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2.6,
    footprint: { width: 3.4, depth: 3.2 },
    status: 'prototype',
    pedestal: {
      type: 'hologram',
      height: 0.86,
      radiusScale: 0.76,
      bodyColor: 0x122036,
      bodyOpacity: 0.58,
      emissiveColor: 0x1f77ff,
      emissiveIntensity: 0.82,
      accentColor: 0x5acbff,
      accentEmissiveColor: 0x8fe3ff,
      accentEmissiveIntensity: 1.08,
      accentOpacity: 0.88,
      ringColor: 0x7ff2ff,
      ringOpacity: 0.62,
      orbColor: 0xc7f3ff,
      orbEmissiveColor: 0x4de6ff,
      orbHighlightColor: 0x9bfbff,
      orbEmissiveIntensity: 1.05,
    },
  },
  {
    id: 'tokenplace-studio-cluster',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 0, y: 0, z: -2 },
    headingRadians: Math.PI * 0.05,
    interactionRadius: 2.2,
    footprint: { width: 2.4, depth: 2 },
    status: 'prototype',
  },
  {
    id: 'gabriel-studio-sentry',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 5, y: 0, z: 7.5 },
    headingRadians: -Math.PI * 0.3,
    interactionRadius: 2.3,
    footprint: { width: 2.2, depth: 2 },
    status: 'prototype',
  },
  {
    id: 'flywheel-studio-flywheel',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 10, y: 0, z: -2 },
    headingRadians: 0,
    interactionRadius: 2.2,
    footprint: { width: 2, depth: 2 },
    status: 'prototype',
    pedestal: {
      type: 'hologram',
      height: 0.96,
      radiusScale: 0.82,
      bodyColor: 0x101a28,
      bodyOpacity: 0.54,
      emissiveColor: 0x1cc7a3,
      emissiveIntensity: 0.9,
      accentColor: 0x48ffd4,
      accentEmissiveColor: 0x96ffe9,
      accentEmissiveIntensity: 1.12,
      accentOpacity: 0.92,
      ringColor: 0x6affdf,
      ringOpacity: 0.65,
      orbColor: 0xbefde4,
      orbEmissiveColor: 0x36f7c5,
      orbHighlightColor: 0x9ffff3,
      orbEmissiveIntensity: 1.08,
    },
  },
  {
    id: 'jobbot-studio-terminal',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 14, y: 0, z: 6 },
    headingRadians: -Math.PI / 2,
    interactionRadius: 2.3,
    footprint: { width: 2.4, depth: 2 },
    status: 'prototype',
  },
  {
    id: 'axel-studio-tracker',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 2, y: 0, z: -3 },
    headingRadians: Math.PI,
    interactionRadius: 2,
    footprint: { width: 2.2, depth: 1.8 },
    status: 'prototype',
  },
  {
    id: 'gitshelves-living-room-installation',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: -2, y: 0, z: -9 },
    headingRadians: Math.PI * 0.1,
    interactionRadius: 2.1,
    footprint: { width: 2.6, depth: 1.8 },
    status: 'prototype',
  },
  {
    id: 'danielsmith-portfolio-table',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 8, y: 0, z: -12 },
    headingRadians: 0,
    interactionRadius: 2.2,
    footprint: { width: 2.4, depth: 2.4 },
    status: 'prototype',
  },
  {
    id: 'f2clipboard-kitchen-console',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -14, y: 0, z: 4 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2,
    footprint: { width: 2, depth: 1.6 },
    status: 'prototype',
  },
  {
    id: 'sigma-kitchen-workbench',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -8, y: 0, z: 6 },
    headingRadians: Math.PI * 0.1,
    interactionRadius: 2,
    footprint: { width: 1.8, depth: 1.8 },
    status: 'prototype',
  },
  {
    id: 'wove-kitchen-loom',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -10, y: 0, z: -1.8 },
    headingRadians: Math.PI * 0.45,
    interactionRadius: 2.2,
    footprint: { width: 2.6, depth: 2.2 },
    status: 'prototype',
  },
  {
    id: 'dspace-backyard-rocket',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: -12, y: 0, z: 24 },
    headingRadians: -Math.PI / 10,
    interactionRadius: 2.6,
    footprint: { width: 3.4, depth: 3.4 },
    status: 'prototype',
  },
  {
    id: 'pr-reaper-backyard-console',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: 0, y: 0, z: 20 },
    headingRadians: Math.PI * 0.35,
    interactionRadius: 2.1,
    footprint: { width: 2.4, depth: 2 },
    status: 'prototype',
  },
  {
    id: 'sugarkube-backyard-greenhouse',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: 12, y: 0, z: 26 },
    headingRadians: Math.PI * 0.55,
    interactionRadius: 2.4,
    footprint: { width: 3.6, depth: 3.2 },
    status: 'prototype',
  },
];

const poiCopy = getPoiCopy();
const controlOverlayStrings = getControlOverlayStrings();

const scaled: PoiDefinition[] = baseDefinitions.map((base) => {
  const copy = poiCopy[base.id];
  if (!copy) {
    throw new Error(`Missing localized POI copy for ${base.id}`);
  }
  const footprintWidth = scalePoiValue(base.footprint.width);
  const footprintDepth = scalePoiValue(base.footprint.depth);
  const baseMaxHalf = Math.max(base.footprint.width, base.footprint.depth) / 2;
  const scaledMaxHalf = Math.max(footprintWidth, footprintDepth) / 2;
  const preservedMargin = Math.max(0, base.interactionRadius - baseMaxHalf);
  const scaledInteractionRadius = scaledMaxHalf + preservedMargin;
  const pedestal: PoiPedestalConfig | undefined = base.pedestal
    ? {
        ...base.pedestal,
        height:
          typeof base.pedestal.height === 'number'
            ? scalePoiValue(base.pedestal.height)
            : undefined,
      }
    : undefined;
  const template =
    copy.interactionPrompt ??
    controlOverlayStrings.interact.promptTemplates[base.interaction] ??
    controlOverlayStrings.interact.promptTemplates.default;
  const interactionPrompt = formatMessage(template, { title: copy.title });
  return {
    ...base,
    interactionRadius: scaledInteractionRadius,
    footprint: {
      width: footprintWidth,
      depth: footprintDepth,
    },
    pedestal,
    title: copy.title,
    summary: copy.summary,
    outcome: copy.outcome ? { ...copy.outcome } : undefined,
    metrics: copy.metrics?.map((metric) => ({ ...metric })),
    links: copy.links?.map((link) => ({ ...link })),
    narration: copy.narration ? { ...copy.narration } : undefined,
    interactionPrompt,
  } satisfies PoiDefinition;
});

// Deterministically lay out indoor POIs across downstairs rooms.
// Apply only manual placements for downstairs. Simple, explicit, and easy to tweak.
const definitions: PoiDefinition[] = applyManualPoiPlacements(scaled);

assertValidPoiDefinitions(definitions, { floorPlan: FLOOR_PLAN });

function clonePoi(definition: PoiDefinition): PoiDefinition {
  return {
    ...definition,
    position: { ...definition.position },
    footprint: { ...definition.footprint },
    outcome: definition.outcome ? { ...definition.outcome } : undefined,
    metrics: definition.metrics?.map((metric) => ({ ...metric })),
    links: definition.links?.map((link) => ({ ...link })),
    narration: definition.narration ? { ...definition.narration } : undefined,
  } satisfies PoiDefinition;
}

class StaticPoiRegistry implements PoiRegistry {
  private readonly pois: Map<PoiId, PoiDefinition>;

  private readonly roomIndex: Map<string, PoiId[]>;

  private readonly categoryIndex: Map<string, PoiId[]>;

  constructor(initial: PoiDefinition[]) {
    this.pois = new Map();
    this.roomIndex = new Map();
    this.categoryIndex = new Map();

    initial.forEach((definition) => {
      const stored = clonePoi(definition);
      this.pois.set(stored.id, stored);
      const ids = this.roomIndex.get(stored.roomId);
      if (ids) {
        ids.push(stored.id);
      } else {
        this.roomIndex.set(stored.roomId, [stored.id]);
      }
      const categoryIds = this.categoryIndex.get(stored.category);
      if (categoryIds) {
        categoryIds.push(stored.id);
      } else {
        this.categoryIndex.set(stored.category, [stored.id]);
      }
    });
  }

  private clone(definition: PoiDefinition): PoiDefinition {
    return clonePoi(definition);
  }

  all(): PoiDefinition[] {
    return Array.from(this.pois.values()).map((poi) => this.clone(poi));
  }

  getById(id: PoiId): PoiDefinition | undefined {
    const poi = this.pois.get(id);
    return poi ? this.clone(poi) : undefined;
  }

  getByRoom(roomId: string): PoiDefinition[] {
    const ids = this.roomIndex.get(roomId);
    if (!ids) {
      return [];
    }
    return ids.map((id) => this.clone(this.pois.get(id)!));
  }

  getByCategory(category: PoiCategory): PoiDefinition[] {
    const ids = this.categoryIndex.get(category);
    if (!ids) {
      return [];
    }
    return ids.map((id) => this.clone(this.pois.get(id)!));
  }
}

export const poiRegistry: PoiRegistry = new StaticPoiRegistry(definitions);

export function getPoiDefinitions(): PoiDefinition[] {
  return poiRegistry.all();
}

export function getPoiDefinitionsByRoom(roomId: string): PoiDefinition[] {
  return poiRegistry.getByRoom(roomId);
}

export function getPoiDefinitionsByCategory(
  category: PoiCategory
): PoiDefinition[] {
  return poiRegistry.getByCategory(category);
}

export function isPoiInsideRoom(poi: PoiDefinition): boolean {
  const room = FLOOR_PLAN.rooms.find((entry) => entry.id === poi.roomId);
  if (!room) {
    return false;
  }
  const { bounds } = room;
  const { x, z } = poi.position;
  return (
    x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
  );
}

export function getPoiRoomBounds(poi: PoiDefinition) {
  return (
    FLOOR_PLAN.rooms.find((room) => room.id === poi.roomId)?.bounds ?? null
  );
}
