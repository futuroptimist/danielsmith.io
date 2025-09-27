import { FLOOR_PLAN } from '../floorPlan';

import type { PoiDefinition, PoiId, PoiRegistry } from './types';

const definitions: PoiDefinition[] = [
  {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist TV Wall',
    summary:
      'Living room media wall that spotlights the Futuroptimist open source ecosystem.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: -3.4, y: 0, z: -14.2 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2.4,
    footprint: { width: 2.2, depth: 1.8 },
    metrics: [
      { label: 'Stars', value: '180+' },
      { label: 'Stack', value: 'Three.js · Vite · TypeScript' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist' },
      { label: 'Docs', href: 'https://futuroptimist.dev' },
    ],
    status: 'prototype',
  },
  {
    id: 'flywheel-studio-flywheel',
    title: 'Flywheel Kinetic Hub',
    summary:
      'Studio centrepiece celebrating the Flywheel automation template lineage.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: -6.4, y: 0, z: 10.8 },
    headingRadians: 0,
    interactionRadius: 2.2,
    footprint: { width: 2, depth: 2 },
    metrics: [
      { label: 'Automation', value: 'CI-ready prompts + scripts' },
      { label: 'Adoption', value: 'Used across DS portfolio' },
    ],
    links: [
      {
        label: 'Flywheel Repo',
        href: 'https://github.com/futuroptimist/flywheel',
      },
      { label: 'Docs', href: 'https://flywheel.futuroptimist.dev' },
    ],
    status: 'prototype',
  },
];

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
