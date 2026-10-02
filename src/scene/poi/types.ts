export type ProjectPoiId =
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

export type CareerId =
  | 'southern-mississippi'
  | 'naval-research'
  | 'youtube'
  | 'muon-space';

export type CareerPoiId =
  | 'career-southern-mississippi'
  | 'career-naval-research'
  | 'career-youtube'
  | 'career-muon-space';

export type PoiId = ProjectPoiId | CareerPoiId;
export type PoiCategory = 'project' | 'environment' | 'career';

export type PoiEnvironmentId = 'staging' | 'production';

export interface PoiEnvironment {
  id: PoiEnvironmentId;
  href: string;
}

export type PoiInteraction = 'inspect' | 'activate';

export interface PoiMetricGitHubStarsSource {
  type: 'githubStars';
  owner: string;
  repo: string;
  /**
   * Optional visibility hint. Private repositories skip live fetches and stay on
   * their fallback values to avoid surfacing missing asset errors in the client.
   */
  visibility?: 'public' | 'private';
  /** Format style for rendering live star counts. */
  format?: 'compact' | 'standard';
  /** Optional string template that receives the formatted value via `{value}`. */
  template?: string;
  /** Fallback copy used when live data is unavailable. */
  fallback?: string;
}

export type PoiMetricSource = PoiMetricGitHubStarsSource;

export interface PoiMetric {
  label: string;
  value: string;
  source?: PoiMetricSource;
}

export interface PoiOutcome {
  label: string;
  value: string;
}

export interface PoiLink {
  label: string;
  href: string;
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
  /** Opt-in to keep this custom hologram body visible in performance mode. */
  renderInPerformance?: boolean;
  /** Performance-mode opacity override for the holographic shell material. */
  performanceBodyOpacity?: number;
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
  /** Performance-mode opacity override for the accent band material. */
  performanceAccentOpacity?: number;
  /** Color applied to the floating holographic top ring. */
  ringColor?: number;
  /** Opacity for the floating holographic top ring. */
  ringOpacity?: number;
  /** Performance-mode opacity override for the floating top ring. */
  performanceRingOpacity?: number;
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

export interface PoiPresentation {
  id: PoiId;
  title: string;
  summary: string;
  interaction: PoiInteraction;
  roomId: string;
  /** Bottom/base anchor for floor-standing POIs; wall-mounted POIs may use explicit display height. */
  position: { x: number; y: number; z: number };
  /** Optional player-height world anchor used for interaction/approach checks. */
  interactionAnchorPosition?: { x: number; y: number; z: number };
  headingRadians?: number;
  interactionRadius: number;
  footprint: PoiFootprint;
  links?: PoiLink[];
  pedestal?: PoiPedestalConfig;
  interactionPrompt: string;
}

export interface ProjectPoiDefinition extends PoiPresentation {
  id: ProjectPoiId;
  category: 'project' | 'environment';
  outcome?: PoiOutcome;
  metrics?: PoiMetric[];
  /** Verified public deployment destinations; omitted when no URL is established. */
  environments?: PoiEnvironment[];
  /** Optional note to surface prototype status in tooltips. */
  status?: 'prototype' | 'live';
  career?: never;
}

export interface CareerProvenance {
  kind: 'resume' | 'owner-confirmed' | 'public-role-posting';
  href?: string;
}

export interface CareerContent {
  id: CareerId;
  organization: string;
  role: string;
  team?: string;
  period: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  responsibility: string;
  illustrationNote: string;
  disclaimer?: string;
  provenance: readonly CareerProvenance[];
}

export interface CareerPoiDefinition extends PoiPresentation {
  id: CareerPoiId;
  category: 'career';
  career: CareerContent;
  interactionAnchorPosition: { x: number; y: number; z: number };
  outcome?: never;
  metrics?: never;
  environments?: never;
  status?: never;
}

export type PoiDefinition = ProjectPoiDefinition | CareerPoiDefinition;

export const isProjectPoi = (poi: PoiDefinition): poi is ProjectPoiDefinition =>
  poi.category === 'project';

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
  getByCategory(category: PoiCategory): PoiDefinition[];
}
