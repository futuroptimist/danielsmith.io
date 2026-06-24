import { PORTFOLIO_MINIATURE_TABLE_CONTRACT } from '../structures/portfolioMiniatureTable';

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
    realWorldReference: PORTFOLIO_MINIATURE_TABLE_CONTRACT.realWorldReference,
    realWorldDimensionsMeters:
      PORTFOLIO_MINIATURE_TABLE_CONTRACT.realWorldDimensionsMeters,
    intendedSceneBounds: PORTFOLIO_MINIATURE_TABLE_CONTRACT.intendedSceneBounds,
    anchor: PORTFOLIO_MINIATURE_TABLE_CONTRACT.anchor,
    clearances: PORTFOLIO_MINIATURE_TABLE_CONTRACT.clearances,
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
