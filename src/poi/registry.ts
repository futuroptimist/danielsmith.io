import { FLOOR_PLAN } from '../floorPlan';
import { getPoiCopy } from '../i18n';

import { scalePoiValue } from './constants';
import { applyManualPoiPlacements } from './placements';
import type { PoiDefinition, PoiId, PoiRegistry } from './types';
import { assertValidPoiDefinitions } from './validation';

type PoiStaticDefinition = Omit<
  PoiDefinition,
  'title' | 'summary' | 'metrics' | 'links' | 'narration'
>;

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
  return {
    ...base,
    interactionRadius: scaledInteractionRadius,
    footprint: {
      width: footprintWidth,
      depth: footprintDepth,
    },
    title: copy.title,
    summary: copy.summary,
    metrics: copy.metrics?.map((metric) => ({ ...metric })),
    links: copy.links?.map((link) => ({ ...link })),
    narration: copy.narration ? { ...copy.narration } : undefined,
  } satisfies PoiDefinition;
});

// Deterministically lay out indoor POIs across downstairs rooms.
// Apply only manual placements for downstairs. Simple, explicit, and easy to tweak.
const definitions: PoiDefinition[] = applyManualPoiPlacements(scaled);

assertValidPoiDefinitions(definitions, { floorPlan: FLOOR_PLAN });

class StaticPoiRegistry implements PoiRegistry {
  private readonly pois: Map<PoiId, PoiDefinition>;

  constructor(initial: PoiDefinition[]) {
    this.pois = new Map(initial.map((poi) => [poi.id, { ...poi }]));
  }

  all(): PoiDefinition[] {
    return Array.from(this.pois.values()).map((poi) => ({ ...poi }));
  }

  getById(id: PoiId): PoiDefinition | undefined {
    const poi = this.pois.get(id);
    return poi ? { ...poi } : undefined;
  }
}

export const poiRegistry: PoiRegistry = new StaticPoiRegistry(definitions);

export function getPoiDefinitions(): PoiDefinition[] {
  return poiRegistry.all();
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
