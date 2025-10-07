import { FLOOR_PLAN } from '../floorPlan';

import type { PoiDefinition, PoiId, PoiRegistry } from './types';
import { assertValidPoiDefinitions } from './validation';

const definitions: PoiDefinition[] = [
  {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist Creator Desk',
    summary:
      'Triple-monitor editing bay capturing Futuroptimist releases with a live showreel, ' +
      'timeline, and automation overlays.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: -9.1, y: 0, z: -14.2 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2.6,
    footprint: { width: 3.4, depth: 3.2 },
    metrics: [
      { label: 'Workflow', value: 'Resolve-style edit suite · triple display' },
      { label: 'Focus', value: 'Futuroptimist ecosystem reels in progress' },
    ],
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
    id: 'tokenplace-studio-cluster',
    title: 'token.place Compute Rack',
    summary:
      '3D-printed Raspberry Pi lattice orchestrating the token.place volunteer compute mesh ' +
      'with pulsing status beacons.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 1.2, y: 0, z: 5.8 },
    headingRadians: Math.PI * 0.05,
    interactionRadius: 2.2,
    footprint: { width: 2.4, depth: 2 },
    metrics: [
      { label: 'Cluster', value: '12× Pi 5 nodes in modular bays' },
      { label: 'Network', value: 'Ephemeral tokens · encrypted bursts' },
    ],
    links: [
      { label: 'Site', href: 'https://token.place' },
      { label: 'GitHub', href: 'https://github.com/futuroptimist/token.place' },
    ],
    status: 'prototype',
  },
  {
    id: 'gabriel-studio-sentry',
    title: 'Gabriel Sentinel Rover',
    summary:
      'Autonomous sentry robot with a rotating scanner that sweeps the studio and fires a red ' +
      'perimeter pulse every second.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 12.2, y: 0, z: 3.2 },
    headingRadians: -Math.PI * 0.3,
    interactionRadius: 2.3,
    footprint: { width: 2.2, depth: 2 },
    metrics: [
      { label: 'Focus', value: '360° lidar sweep + local heuristics' },
      { label: 'Cadence', value: 'Red alert flash every 1.0 s' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/gabriel' },
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
    id: 'axel-studio-tracker',
    title: 'Axel Quest Navigator',
    summary:
      'Tabletop command slate where Axel curates next-step quests, projecting repo insights ' +
      'and backlog momentum rings.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'studio',
    position: { x: 1.8, y: 0, z: -2.4 },
    headingRadians: Math.PI,
    interactionRadius: 2,
    footprint: { width: 2.2, depth: 1.8 },
    metrics: [
      { label: 'Guidance', value: 'Auto-prioritised quests from repo scans' },
      { label: 'Modes', value: 'Focus · explore toggles per sprint' },
    ],
    links: [{ label: 'GitHub', href: 'https://github.com/futuroptimist/axel' }],
    status: 'prototype',
  },
  {
    id: 'gitshelves-living-room-installation',
    title: 'Gitshelves Living Room Array',
    summary:
      'Modular wall of 3D-printed commit blocks that transform GitHub streaks into physical ' +
      'shelving mosaics.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 4.4, y: 0, z: -11.6 },
    headingRadians: Math.PI * 0.1,
    interactionRadius: 2.1,
    footprint: { width: 2.6, depth: 1.8 },
    metrics: [
      { label: 'Material', value: '42 mm Gridfinity compatible blocks' },
      { label: 'Sync', value: 'Auto generated from GitHub timelines' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/gitshelves' },
    ],
    status: 'prototype',
  },
  {
    id: 'danielsmith-portfolio-table',
    title: 'danielsmith.io Holographic Map',
    summary:
      'Holotable overview of danielsmith.io with layered navigation routes, accessibility ' +
      'presets, and deploy targets.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0.6, y: 0, z: -8.4 },
    headingRadians: 0,
    interactionRadius: 2.2,
    footprint: { width: 2.4, depth: 2.4 },
    metrics: [
      { label: 'Stack', value: 'Vite · Three.js · accessibility HUD' },
      { label: 'Deploy', value: 'CI smoke + docs + lint gates' },
    ],
    links: [
      { label: 'Live Site', href: 'https://danielsmith.io' },
      {
        label: 'GitHub',
        href: 'https://github.com/futuroptimist/danielsmith.io',
      },
    ],
    status: 'prototype',
  },
  {
    id: 'f2clipboard-kitchen-console',
    title: 'f2clipboard Incident Console',
    summary:
      'Kitchen-side diagnostics station where f2clipboard parses Codex logs and pipes concise ' +
      'summaries straight to the clipboard.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -9.2, y: 0, z: -0.6 },
    headingRadians: Math.PI * 0.5,
    interactionRadius: 2,
    footprint: { width: 2, depth: 1.6 },
    metrics: [
      { label: 'Speed', value: 'Copy failing logs in under 3 s' },
      { label: 'Formats', value: 'CLI + clipboard + Markdown output' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/f2clipboard' },
    ],
    status: 'prototype',
  },
  {
    id: 'sigma-kitchen-workbench',
    title: 'Sigma Fabrication Bench',
    summary:
      'Workbench showcasing the Sigma ESP32 AI pin with on-device speech, local inference, ' +
      'and 3D-printed shells.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -5.2, y: 0, z: 10 },
    headingRadians: Math.PI * 0.1,
    interactionRadius: 2,
    footprint: { width: 1.8, depth: 1.8 },
    metrics: [
      { label: 'Hardware', value: 'ESP32 · on-device speech stack' },
      { label: 'Modes', value: 'Push-to-talk · local inference loops' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
    ],
    status: 'prototype',
  },
  {
    id: 'wove-kitchen-loom',
    title: 'Wove Loom Atelier',
    summary:
      'Soft robotics loom where Wove bridges CAD workflows with textiles while teaching knit ' +
      'and crochet fundamentals.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'kitchen',
    position: { x: -11.8, y: 0, z: 6.2 },
    headingRadians: Math.PI * 0.45,
    interactionRadius: 2.2,
    footprint: { width: 2.6, depth: 2.2 },
    metrics: [
      { label: 'Craft', value: 'Loom calibrates from CAD stitch maps' },
      { label: 'Roadmap', value: 'Path toward robotic weaving labs' },
    ],
    links: [{ label: 'GitHub', href: 'https://github.com/futuroptimist/wove' }],
    status: 'prototype',
  },
  {
    id: 'dspace-backyard-rocket',
    title: 'DSPACE Launch Pad',
    summary:
      'Backyard launch gantry staging the DSPACE model rocket with telemetry-guided ' +
      'countdown cues.',
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
    id: 'pr-reaper-backyard-console',
    title: 'PR Reaper Automation Gate',
    summary:
      'Backyard control gate that visualises pr-reaper sweeping stale pull requests with safe ' +
      'dry-runs and audit logs.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: 6.6, y: 0, z: 19.6 },
    headingRadians: Math.PI * 0.35,
    interactionRadius: 2.1,
    footprint: { width: 2.4, depth: 2 },
    metrics: [
      { label: 'Sweep', value: 'Bulk-close stale PRs with preview mode' },
      { label: 'Cadence', value: 'Cron triggers + manual dry-runs' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist/pr-reaper' },
    ],
    status: 'prototype',
  },
  {
    id: 'sugarkube-backyard-greenhouse',
    title: 'Sugarkube Solar Greenhouse',
    summary:
      'Adaptive greenhouse showcasing Sugarkube automation with responsive grow lights and ' +
      'solar tracking.',
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
