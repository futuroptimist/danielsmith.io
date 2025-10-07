export type PoiId =
  | 'futuroptimist-living-room-tv'
  | 'flywheel-studio-flywheel'
  | 'jobbot-studio-terminal'
  | 'dspace-backyard-rocket'
  | 'sugarkube-backyard-greenhouse'
  | 'tokenplace-studio-cluster'
  | 'gabriel-studio-sentry'
  | 'f2clipboard-kitchen-console'
  | 'axel-studio-tracker'
  | 'sigma-kitchen-workbench'
  | 'gitshelves-living-room-installation'
  | 'wove-kitchen-loom'
  | 'pr-reaper-backyard-console'
  | 'danielsmith-portfolio-table';

export type PoiCategory = 'project' | 'environment';

export type PoiInteraction = 'inspect' | 'activate';

export interface PoiMetric {
  label: string;
  value: string;
}

export interface PoiLink {
  label: string;
  href: string;
}

export interface PoiNarration {
  caption: string;
  durationMs?: number;
}

export interface PoiFootprint {
  /** Width of the POI stand footprint in world units. */
  width: number;
  /** Depth of the POI stand footprint in world units. */
  depth: number;
}

export interface PoiDefinition {
  id: PoiId;
  title: string;
  summary: string;
  category: PoiCategory;
  interaction: PoiInteraction;
  roomId: string;
  position: { x: number; y: number; z: number };
  headingRadians?: number;
  interactionRadius: number;
  footprint: PoiFootprint;
  metrics?: PoiMetric[];
  links?: PoiLink[];
  /** Optional note to surface prototype status in tooltips. */
  status?: 'prototype' | 'live';
  narration?: PoiNarration;
}

export interface PoiAnalytics {
  hoverStarted?(poi: PoiDefinition): void;
  hoverEnded?(poi: PoiDefinition): void;
  selected?(poi: PoiDefinition): void;
  selectionCleared?(poi: PoiDefinition): void;
}

export interface PoiRegistry {
  all(): PoiDefinition[];
  getById(id: PoiId): PoiDefinition | undefined;
}
