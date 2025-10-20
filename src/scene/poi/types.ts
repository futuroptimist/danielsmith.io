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

export interface PoiHologramPedestalConfig {
  type: 'hologram';
  /** Optional height of the holographic pedestal shell, in world units. */
  height?: number;
  /** Scale applied to the pedestal radius relative to the POI footprint. */
  radiusScale?: number;
  /** Base color tint applied to the holographic shell. */
  bodyColor?: number;
  /** Opacity applied to the holographic shell material. */
  bodyOpacity?: number;
  /** Emissive color for the holographic shell glow. */
  emissiveColor?: number;
  /** Emissive intensity multiplier for the holographic shell glow. */
  emissiveIntensity?: number;
  /** Accent band color used near the top of the pedestal. */
  accentColor?: number;
  /** Accent band emissive tint. */
  accentEmissiveColor?: number;
  /** Accent band emissive intensity. */
  accentEmissiveIntensity?: number;
  /** Accent band opacity. */
  accentOpacity?: number;
  /** Color applied to the floating holographic top ring. */
  ringColor?: number;
  /** Opacity for the floating holographic top ring. */
  ringOpacity?: number;
  /** Base albedo color for the interaction orb. */
  orbColor?: number;
  /** Emissive color for the interaction orb. */
  orbEmissiveColor?: number;
  /** Highlight emissive color when the orb is focused. */
  orbHighlightColor?: number;
  /** Emissive intensity applied to the interaction orb. */
  orbEmissiveIntensity?: number;
}

export type PoiPedestalConfig = PoiHologramPedestalConfig;

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
  pedestal?: PoiPedestalConfig;
  interactionPrompt: string;
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
  getByRoom(roomId: string): PoiDefinition[];
}
