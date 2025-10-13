# Deterministic POI Placement (Downstairs)

This document proposes a deterministic, configurable placement engine for downstairs indoor POIs. It replaces ad-hoc coordinates with a seeded solver aware of rooms, walls, doorways, stairs, and other POIs, while allowing manual overrides for edge cases (e.g., the wall-mounted TV display).

## Goals
- Deterministic: same inputs => same map (no randomness or a fixed seed only).
- Natural spacing: POIs cluster toward room centers, avoid walls/doorways, and maintain separation.
- Configurable: global knobs (spacing, margins), per-POI overrides, and easy human/AI editing.
- Robust: respects walls, doorway clearance, stair volumes, and fixed exhibits.
- Incremental: feature-flagged engine; preserve existing data shapes.

## Inputs
- Floor plan: room bounds, doorways (with clearance depth/side padding), stair geometry/guards.
- POI catalog: id, category, base footprint, interaction radius, optional overrides:
  - fixed: pin `roomId` and position (e.g., TV display); included in spacing checks.
  - roomPreference: optional ranked rooms to attempt.
  - minSeparation: per-POI separation override.
  - centerBias: per-POI weight to bias toward the room center.

## Outputs
- `PoiDefinition[]` with computed `roomId` and `position`, preserving scaled footprints/radii.

## Algorithm (Seeded, Multi-Objective)
For each candidate cell, we maximize a composite score:

S(cell) = w_center * CenterScore + w_wall * WallMargin + w_door * DoorwayMargin + w_pairs * PairwiseSeparation

Where:
- CenterScore: 1 − normalized distance to room center (normalize by room half-diagonal).
- WallMargin: distance to nearest wall (favor interior), clamped and normalized.
- DoorwayMargin: distance to nearest doorway clearance rectangle.
- PairwiseSeparation: sum of distances to already placed/fixed POIs using a saturation radius so gains taper, preventing wall-hugging.

### Shaping and Saturation
- Use smoothstep (or similar) to taper gains for wall margin and center distance.
- Use saturation radii for pairwise distances: beyond R, additional distance contributes minimally.

### Feasibility
A cell is feasible if:
- Inside room bounds; outside doorway clearance rectangles.
- Distance to every already placed/fixed POI ≥ (r_self + r_other − epsilon).

### Determinism
- Stable ordering for rooms, POIs, and cells; lexicographic tie-breakers.
- Optional seed accepted for future PRNG; default fixed seed.

### Room Assignment
- Round-robin across preferred rooms (default: all indoor rooms). Skip rooms without feasible cells; if none available, retain original `roomId`.

## API Sketch

```ts
export interface PlacementConfig {
  step: number;               // grid cell size
  margin: number;             // interior wall margin
  weights: { center: number; wall: number; doorway: number; pairs: number };
  pairwiseSaturation: number; // distance at which pairwise gains saturate
}

export interface PoiConstraintOverrides {
  fixed?: boolean;
  roomPreference?: string[];
  minSeparation?: number;
  centerBias?: number;
}

export function applyPlacement(
  scaledPois: PoiDefinition[],
  plan: FloorPlanDefinition,
  config?: Partial<PlacementConfig>,
  overrides?: Partial<Record<PoiId, PoiConstraintOverrides>>
): PoiDefinition[];
```

## Implementation Plan
1. Create `src/poi/placement/` with:
   - `grid.ts`: grid and geometry helpers (wall/doorway distance, smoothstep, saturation).
   - `scoring.ts`: composite score implementation.
   - `applyPlacement.ts`: deterministic round-robin solver.
   - `types.ts`: config and overrides.
2. Port current deterministic module into `placement/` and add center + saturation scoring.
3. Wire `registry.ts` to call `applyPlacement` behind a feature flag (env/query param) with sensible defaults.
4. Tests:
   - Unit tests for grid/scoring/feasibility; snapshot the output given fixed config.
   - Playwright: assert zero browser errors (already added) and that indoor POIs are (a) not within `margin` of walls/doorways, and (b) min pairwise separation is met.
5. Tuning: start with weights `{ center: 3, wall: 2, doorway: 1, pairs: 1.5 }`, saturation ~ 10 world units.

## Edge Cases
- Fixed TV remains fixed; included in pairwise separation.
- Small rooms: reduce step or honor `minSeparation` override; solver selects best feasible center-biased cell.
- Stairs: treat stair guards like doorway clearances for both feasibility and DoorwayMargin.

## Future Work
- Seeded Poisson-disk sampling for more organic centers.
- True WFC over room tiles; apply this scoring post-pass.
