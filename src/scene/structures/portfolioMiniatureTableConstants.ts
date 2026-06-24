import type { PoiPhysicalMetadata } from '../poi/physicalMetadata';

export const PORTFOLIO_MINIATURE_TABLE_DIMENSIONS = {
  width: 2.3,
  depth: 2.3,
  height: 1.25,
  topThickness: 0.18,
  bedWidth: 1.95,
  bedDepth: 1.95,
  bedInsetY: 1.36,
  lipHeight: 0.16,
  lipThickness: 0.08,
  modelHeight: 0.95,
} as const;

export const PORTFOLIO_MINIATURE_TABLE_PHYSICAL_METADATA = {
  realWorldReference:
    'white museum display table holding an architectural scale model',
  realWorldDimensionsMeters: {
    width: 1.4,
    depth: 0.9,
    height: 1.25,
  },
  intendedSceneBounds: {
    width: 2.4,
    depth: 2.4,
    height: 2.35,
  },
  anchor: 'bottom-center',
  clearances: {
    markerMinHeight: 2.35,
    avatarPathRadius: 1.05,
  },
} as const satisfies PoiPhysicalMetadata;
