import type { PoiDefinition, PoiId } from './types';

// Manual downstairs placements (world units). TV remains a wall display and is left as-is.
export const MANUAL_POI_PLACEMENTS: Partial<
  Record<
    PoiId,
    {
      roomId: string;
      position: { x: number; y?: number; z: number };
      headingRadians?: number;
    }
  >
> = {
  // Living room (center-biased spread)
  'gitshelves-living-room-installation': {
    roomId: 'livingRoom',
    position: { x: -15, z: -25 },
    headingRadians: Math.PI * 0.1,
  },
  'danielsmith-portfolio-table': {
    roomId: 'livingRoom',
    position: { x: 3, z: -28 },
    headingRadians: 0,
  },

  // Studio (three exhibits near center, spaced apart)
  'flywheel-studio-flywheel': {
    roomId: 'studio',
    position: { x: 11, z: -4 },
    headingRadians: 0,
  },
  'jobbot-studio-terminal': {
    roomId: 'studio',
    position: { x: 24, z: 4 },
    headingRadians: -Math.PI / 2,
  },
  'gabriel-studio-sentry': {
    roomId: 'studio',
    position: { x: 2, z: 8 },
    headingRadians: -Math.PI * 0.3,
  },
  'axel-studio-tracker': {
    roomId: 'studio',
    position: { x: 20, z: -4 },
    headingRadians: Math.PI,
  },
  'tokenplace-studio-cluster': {
    roomId: 'studio',
    position: { x: 6, z: 2 },
    headingRadians: Math.PI * 0.05,
  },

  // Kitchen (three exhibits around center)
  'f2clipboard-kitchen-console': {
    roomId: 'kitchen',
    position: { x: -20, z: -4 },
    headingRadians: Math.PI * 0.5,
  },
  'sigma-kitchen-workbench': {
    roomId: 'kitchen',
    position: { x: -25, z: 6 },
    headingRadians: Math.PI * 0.1,
  },
  'wove-kitchen-loom': {
    roomId: 'kitchen',
    position: { x: -15, z: 5 },
    headingRadians: Math.PI * 0.45,
  },
};

export function applyManualPoiPlacements(
  defs: PoiDefinition[]
): PoiDefinition[] {
  return defs.map((d) => {
    const override = MANUAL_POI_PLACEMENTS[d.id];
    if (!override) return d;
    return {
      ...d,
      roomId: override.roomId ?? d.roomId,
      position: {
        x: override.position.x,
        y: override.position.y ?? d.position.y,
        z: override.position.z,
      },
      headingRadians: override.headingRadians ?? d.headingRadians,
    };
  });
}
