import { FLOOR_PLAN } from '../floorPlan';

import type { PoiDefinition, PoiId, PoiRegistry } from './types';
import { assertValidPoiDefinitions } from './validation';

const definitions: PoiDefinition[] = [
  {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist TV Wall',
    summary:
      'Living room media wall that spotlights the Futuroptimist open source ecosystem.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: -9.1, y: 0, z: -14.2 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2.4,
    footprint: { width: 3, depth: 6.8 },
    metrics: [{ label: 'Stack', value: 'Three.js · Vite · TypeScript' }],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist' },
      { label: 'Docs', href: 'https://futuroptimist.dev' },
    ],
    status: 'prototype',
    narration: {
      caption:
        'Futuroptimist media wall radiates highlight reels across the living room.',
    },
  },
  {
    id: 'flywheel-studio-flywheel',
    title: 'Flywheel Kinetic Hub',
    summary:
      'Studio centrepiece celebrating the Flywheel automation template lineage.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 6.2, y: 0, z: 2.6 },
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
    narration: {
      caption:
        'Flywheel kinetic hub whirs alive, spotlighting automation prompts and tooling.',
    },
  },
  {
    id: 'jobbot-studio-terminal',
    title: 'Jobbot Holographic Terminal',
    summary:
      'Holographic command desk broadcasting live telemetry from the Jobbot3000 automation mesh.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 9.4, y: 0, z: -0.6 },
    headingRadians: -Math.PI / 2,
    interactionRadius: 2.3,
    footprint: { width: 2.4, depth: 2 },
    metrics: [
      { label: 'Ops savings', value: 'Recovered 6h weekly toil' },
      { label: 'Reliability', value: '99.98% SLA self-healing loops' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/jobbot3000' },
      { label: 'Automation Log', href: 'https://futuroptimist.dev/automation' },
    ],
    status: 'prototype',
    narration: {
      caption:
        'Jobbot holographic terminal streams automation telemetry in shimmering overlays.',
    },
  },
  {
    id: 'dspace-backyard-rocket',
    title: 'dSpace Launch Pad',
    summary:
      'Backyard launch gantry staging the dSpace model rocket with telemetry-guided countdown cues.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: -14.08, y: 0, z: 23.6 },
    headingRadians: -Math.PI / 10,
    interactionRadius: 2.6,
    footprint: { width: 3.4, depth: 3.4 },
    metrics: [
      { label: 'Countdown', value: 'Autonomous T-0 sequencing' },
      { label: 'Stack', value: 'Three.js FX · Spatial audio' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/dspace' },
      {
        label: 'Mission Log',
        href: 'https://futuroptimist.dev/projects/dspace',
      },
    ],
    status: 'prototype',
    narration: {
      caption:
        'dSpace launch pad crackles with countdown energy beside the backyard path.',
      durationMs: 6000,
    },
  },
  {
    id: 'sugarkube-backyard-greenhouse',
    title: 'Sugarkube Solar Greenhouse',
    summary:
      'Adaptive greenhouse showcasing Sugarkube automation with responsive grow lights and solar tracking.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: 14.08, y: 0, z: 28.2 },
    headingRadians: Math.PI * 0.55,
    interactionRadius: 2.4,
    footprint: { width: 3.6, depth: 3.2 },
    metrics: [
      {
        label: 'Automation',
        value: 'Sugarkube schedules solar tilt + irrigation',
      },
      { label: 'Throughput', value: '3× daily harvest cadence maintained' },
    ],
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/futuroptimist/sugarkube',
      },
      {
        label: 'Greenhouse Log',
        href: 'https://futuroptimist.dev/projects/sugarkube',
      },
    ],
    status: 'prototype',
    narration: {
      caption:
        'Sugarkube greenhouse cycles soft grow lights and koi pond ambience in sync.',
      durationMs: 6500,
    },
  },
];

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
