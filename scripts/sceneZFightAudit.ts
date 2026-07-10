import { PORTFOLIO_LEVEL } from '../src/scene/level/portfolioLevel';
import type { Bounds2D } from '../src/scene/level/schema';
import {
  findHorizontalZFightCandidates,
  formatZFightFindings,
  type HorizontalSurfaceAuditEntry,
} from '../src/scene/level/zFightAudit';
import {
  DEFAULT_LOWER_FLOOR_FURNISHINGS,
  DECORATIVE_FLOOR_OVERLAY_Y_OFFSET,
} from '../src/scene/structures/lowerFloorFurnishings';

const boundsFromCenter = (
  position: { x: number; z: number },
  footprint: { width: number; depth: number }
): Bounds2D => ({
  minX: position.x - footprint.width / 2,
  maxX: position.x + footprint.width / 2,
  minZ: position.z - footprint.depth / 2,
  maxZ: position.z + footprint.depth / 2,
});

const collectProductionHorizontalSurfaces =
  (): HorizontalSurfaceAuditEntry[] => {
    const surfaces: HorizontalSurfaceAuditEntry[] = [];

    PORTFOLIO_LEVEL.floors.forEach((floor) => {
      floor.floorSurfaces.forEach((surface) => {
        surfaces.push({
          sourceId: surface.sourceId,
          meshName: `${surface.id}:top`,
          floorId: surface.floorId,
          category: 'floor',
          material: 'room-floor',
          purpose: surface.purpose,
          y: surface.elevation ?? 0,
          bounds: surface.bounds,
        });
      });
    });

    DEFAULT_LOWER_FLOOR_FURNISHINGS.forEach((furnishing) => {
      if (!furnishing.decorativeFootprint) return;
      surfaces.push({
        sourceId: `furnishing:${furnishing.id}:decorative-bottom`,
        meshName: `Furnishing:${furnishing.id}:decorativeFootprint`,
        floorId: 'ground',
        category: 'decorative-floor-overlay',
        material: furnishing.kind,
        purpose: furnishing.category,
        y: furnishing.position.y ?? DECORATIVE_FLOOR_OVERLAY_Y_OFFSET,
        bounds:
          furnishing.decorativeBounds ??
          boundsFromCenter(furnishing.position, furnishing.decorativeFootprint),
      });
    });

    return surfaces;
  };

const findings = findHorizontalZFightCandidates(
  collectProductionHorizontalSurfaces(),
  {
    yTolerance: 0.001,
    minimumOverlapArea: 0.01,
  }
);

if (findings.length > 0) {
  console.error(formatZFightFindings(findings));
  process.exit(1);
}

console.log('No production horizontal z-fighting candidates found.');
