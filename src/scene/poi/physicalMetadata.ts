import {
  FLYWHEEL_AVATAR_PATH_RADIUS,
  FLYWHEEL_INSTALLATION_BOUNDS,
  FLYWHEEL_MARKER_MIN_HEIGHT,
} from '../structures/flywheelEnergyContract';
import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from '../structures/portfolioMiniatureTableContract';
import {
  PR_REAPER_INTENDED_BOUNDS,
  PR_REAPER_SCREEN_BOTTOM_Y,
  PR_REAPER_SCREEN_HEIGHT,
} from '../structures/prReaperInstallationContract';

import type { PoiId } from './types';

export interface PoiPhysicalMetadata {
  realWorldReference: string;
  realWorldDimensionsMeters?: {
    width: number;
    depth: number;
    height: number;
  };
  intendedSceneBounds: {
    width: number;
    depth: number;
    height: number;
  };
  anchor: 'bottom-center';
  clearances?: {
    markerMinHeight?: number;
    avatarPathRadius?: number;
  };
}

const MONITOR_27_INCH_16_9_ACTIVE_AREA_METERS = {
  // 27-inch 16:9 active area is approximately 0.598m wide x 0.336m tall.
  width: 0.598,
  height: 0.336,
};

const RASPBERRY_PI_5_BOARD_FOOTPRINT_METERS = {
  // Raspberry Pi 5 board footprint is approximately 0.085m x 0.056m.
  width: 0.085,
  depth: 0.056,
};

const physicalMetadata = {
  'gabriel-studio-sentry': {
    realWorldReference:
      'privacy-first guardian monitor with shield, halo sensor, and local inference core',
    realWorldDimensionsMeters: {
      width: 0.55,
      depth: 0.45,
      height: 1.35,
    },
    intendedSceneBounds: {
      width: 1.98,
      depth: 1.8,
      height: 2.4,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 2.4,
      avatarPathRadius: 1.05,
    },
  },
  'f2clipboard-kitchen-console': {
    realWorldReference:
      'standing incident-triage terminal with PR check cards flowing into a clipboard',
    realWorldDimensionsMeters: {
      width: 0.9,
      depth: 0.75,
      height: 1.45,
    },
    intendedSceneBounds: {
      width: 2.5,
      depth: 2.0,
      height: 2.0,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 2.0,
      avatarPathRadius: 1.0,
    },
  },
  'sigma-kitchen-workbench': {
    realWorldReference:
      'ESP32 push-to-talk AI pin assembly bench with enclosure, mic, button, and speaker details',
    realWorldDimensionsMeters: {
      width: 1.1,
      depth: 0.75,
      height: 1.2,
    },
    intendedSceneBounds: {
      width: 2.7,
      depth: 1.7,
      height: 1.9,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 1.9,
      avatarPathRadius: 1.05,
    },
  },
  'gitshelves-living-room-installation': {
    realWorldReference:
      'wall shelf of Gridfinity contribution blocks generated from GitHub activity',
    realWorldDimensionsMeters: {
      width: 0.75,
      depth: 0.22,
      height: 0.9,
    },
    intendedSceneBounds: {
      width: 3.2,
      depth: 1.25,
      height: 3.1,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 3.1,
      avatarPathRadius: 1.0,
    },
  },
  'flywheel-studio-flywheel': {
    realWorldReference:
      'industrial flywheel kinetic energy demonstrator with exposed rotor, hub, spokes, and energy port',
    realWorldDimensionsMeters: {
      width: 1.4,
      depth: 0.9,
      height: 1.45,
    },
    intendedSceneBounds: FLYWHEEL_INSTALLATION_BOUNDS,
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: FLYWHEEL_MARKER_MIN_HEIGHT,
      avatarPathRadius: FLYWHEEL_AVATAR_PATH_RADIUS,
    },
  },
  'tokenplace-studio-cluster': {
    realWorldReference: 'dual 27-inch 16:9 workstation',
    realWorldDimensionsMeters: {
      width: MONITOR_27_INCH_16_9_ACTIVE_AREA_METERS.width * 2 + 0.084,
      depth: 0.9,
      height: 1.25,
    },
    intendedSceneBounds: {
      width: 5.7,
      depth: 2.85,
      height: 2.4,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 2.4,
      avatarPathRadius: 1.2,
    },
  },

  'danielsmith-portfolio-table': {
    realWorldReference:
      'white museum display table holding an architectural scale model',
    realWorldDimensionsMeters:
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.realWorldDimensionsMeters,
    intendedSceneBounds:
      PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.intendedSceneBounds,
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight:
        PORTFOLIO_MINIATURE_TABLE_DIMENSIONS.intendedSceneBounds.height,
      avatarPathRadius: 1.15,
    },
  },
  'pr-reaper-backyard-console': {
    realWorldReference:
      'near-ceiling translucent 9:21 hologram with compact projector and two-axis industrial robot arm',
    realWorldDimensionsMeters: {
      width: 0.9,
      depth: 1.45,
      height: 2.1,
    },
    intendedSceneBounds: PR_REAPER_INTENDED_BOUNDS,
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight:
        PR_REAPER_SCREEN_BOTTOM_Y + PR_REAPER_SCREEN_HEIGHT + 0.35,
      avatarPathRadius: 1.15,
    },
  },
  'sugarkube-backyard-greenhouse': {
    realWorldReference: 'Raspberry Pi 5 based Sugarkube deployment',
    realWorldDimensionsMeters: {
      width: RASPBERRY_PI_5_BOARD_FOOTPRINT_METERS.width,
      depth: RASPBERRY_PI_5_BOARD_FOOTPRINT_METERS.depth,
      height: 0.02,
    },
    intendedSceneBounds: {
      width: 2.9,
      depth: 9.3,
      height: 2.5,
    },
    anchor: 'bottom-center',
    clearances: {
      markerMinHeight: 2.5,
      avatarPathRadius: 1.1,
    },
  },
} as const satisfies Partial<Record<PoiId, PoiPhysicalMetadata>>;

export const POI_PHYSICAL_METADATA: Partial<
  Record<PoiId, PoiPhysicalMetadata>
> = physicalMetadata;

export function getPoiPhysicalMetadata(
  poiId: PoiId
): PoiPhysicalMetadata | undefined {
  return POI_PHYSICAL_METADATA[poiId];
}
