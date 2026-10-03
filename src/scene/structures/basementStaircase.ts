import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import type { RectCollider } from '../../systems/collision';
import type { StairConnection } from '../../systems/movement/floorConnections';
import { computeStairLayout } from '../../systems/movement/stairLayout';
import { createStairNavigationZones } from '../../systems/movement/stairs';
import { assertDebugColliderId } from '../debug/colliderDebugIds';
import { getDebugHash } from '../debug/debugIds';
import { BASEMENT_STAIR_CONNECTION } from '../level/basementStair';
import { assertLevelSourceId } from '../level/sourceIds';
import type { LevelSafetyCollider } from '../level/stairSafetyColliders';

import { createStaircase, type StaircaseConfig } from './staircase';

const world = (value: number) => value * FLOOR_PLAN_SCALE;
const GROUND_RAIL_TRIM_THICKNESS = 0.12;

/** One descriptor owns the treads, opening, rails, navigation and safety bounds. */
export function getBasementStairLayout(playerRadius = 0.75) {
  const definition = BASEMENT_STAIR_CONNECTION;
  const config: StaircaseConfig = {
    name: 'BasementStaircase',
    basePosition: new Vector3(
      world(definition.centerX),
      definition.lowerFloorElevation,
      world(definition.bottomZ)
    ),
    direction: definition.direction,
    step: {
      count: definition.stepCount,
      rise:
        (definition.upperFloorElevation -
          definition.lowerFloorElevation -
          definition.landingThickness) /
        definition.stepCount,
      run: world(definition.stepRun),
      width: world(definition.width),
      material: { color: 0x9b8973, roughness: 0.72, metalness: 0.04 },
    },
    landing: {
      depth: world(definition.landingDepth),
      thickness: definition.landingThickness,
      material: { color: 0x81796d, roughness: 0.68, metalness: 0.04 },
    },
  };
  const behavior = {
    transitionMargin: world(definition.transitionMargin),
    landingTriggerMargin: world(definition.landingTriggerMargin),
    stepRise: config.step.rise,
    descentCorridorInset: playerRadius,
  };
  const layout = computeStairLayout({
    baseZ: config.basePosition.z,
    stepRun: config.step.run,
    stepCount: config.step.count,
    landingDepth: config.landing.depth,
    direction: config.direction,
    guardMargin: behavior.transitionMargin,
    stairwellMargin: world(definition.openingMargin),
  });
  const geometry = {
    centerX: config.basePosition.x,
    halfWidth: config.step.width / 2,
    bottomZ: config.basePosition.z,
    topZ: layout.topZ,
    landingMinZ: layout.landingMinZ,
    landingMaxZ: layout.landingMaxZ,
    totalRise: config.step.rise * config.step.count,
    direction: layout.directionMultiplier,
  };
  const thickness = world(definition.guardThickness);
  const west = geometry.centerX - geometry.halfWidth;
  const east = geometry.centerX + geometry.halfWidth;
  const opening: RectCollider = {
    minX: west,
    maxX: east,
    minZ: geometry.bottomZ - world(definition.openingMargin),
    maxZ: geometry.topZ,
  };
  const landing: RectCollider = {
    minX: west,
    maxX: east,
    minZ: layout.landingMinZ,
    maxZ: layout.landingMaxZ,
  };
  const upperGuardEnd = geometry.topZ + behavior.landingTriggerMargin;
  const lowerGuardStart = geometry.bottomZ - thickness;
  const lowerGuardEnd = geometry.landingMaxZ + thickness;
  const safety: LevelSafetyCollider[] = [];
  const addSafety = (
    floor: 'ground' | 'basement',
    part: string,
    bounds: RectCollider
  ) => {
    const sourceId = assertLevelSourceId(
      `${floor}.basementStairs.${part}.safetyCollider`
    );
    safety.push({
      floor,
      name: `BasementStairs-${floor}-${part}`,
      bounds,
      sourceId,
      sourceType: 'safetyCollider',
      role: 'stair',
      category: 'stair',
      purpose: 'visible stair boundary preventing side or back entry',
      intent: 'safety-guard',
      debugId: assertDebugColliderId(getDebugHash(sourceId)),
    });
  };
  // Ground guards surround only the void. The level landing has a broad west entry.
  addSafety('ground', 'westVoidRail', {
    minX: west - thickness,
    maxX: west,
    minZ: opening.minZ,
    maxZ: upperGuardEnd,
  });
  addSafety('ground', 'eastVoidRail', {
    minX: east,
    maxX: east + thickness,
    minZ: opening.minZ,
    maxZ: upperGuardEnd,
  });
  addSafety('ground', 'backVoidRail', {
    minX: west - thickness,
    maxX: east + thickness,
    minZ: opening.minZ - thickness,
    maxZ: opening.minZ,
  });
  // Full lower side boundaries and a visible landing support prevent an off-ramp
  // basement approach from entering the projected ground landing and hopping floors.
  addSafety('basement', 'westRampRail', {
    minX: west - thickness,
    maxX: west,
    minZ: lowerGuardStart,
    maxZ: lowerGuardEnd,
  });
  addSafety('basement', 'eastRampRail', {
    minX: east,
    maxX: east + thickness,
    minZ: lowerGuardStart,
    maxZ: lowerGuardEnd,
  });
  addSafety('basement', 'landingBackSupport', {
    minX: west - thickness,
    maxX: east + thickness,
    minZ: geometry.landingMaxZ,
    maxZ: lowerGuardEnd,
  });
  return {
    definition,
    config,
    geometry,
    layout,
    behavior,
    opening,
    landing,
    // The trim owns the slab edge beneath each ground guard. Cut the slab out
    // beneath that complete footprint so their inner faces cannot coincide.
    // Unite the opening and three guard strips before tiling to avoid extra seams.
    floorCutouts: [
      {
        minX: west - thickness,
        maxX: east + thickness,
        minZ: opening.minZ - thickness,
        maxZ: upperGuardEnd,
      },
      landing,
    ],
    safety,
    zones: createStairNavigationZones(geometry, behavior),
    thickness,
  };
}

export function createBasementStaircase(playerRadius = 0.75) {
  const metrics = getBasementStairLayout(playerRadius);
  const { config, geometry, definition } = metrics;
  const staircase = createStaircase(config);
  const group = staircase.group;
  group.userData.connectionId = definition.id;
  const unitBox = new BoxGeometry(1, 1, 1);
  const railMaterial = new MeshStandardMaterial({
    color: 0x414c58,
    roughness: 0.72,
  });
  const trimMaterial = new MeshStandardMaterial({
    color: 0xb9a486,
    roughness: 0.76,
  });
  const box = (
    parent: Group,
    name: string,
    bounds: RectCollider,
    minY: number,
    maxY: number,
    sourceId: string,
    trim = false
  ) => {
    const mesh = new Mesh(unitBox, trim ? trimMaterial : railMaterial);
    mesh.name = name;
    mesh.scale.set(
      bounds.maxX - bounds.minX,
      maxY - minY,
      bounds.maxZ - bounds.minZ
    );
    mesh.position.set(
      (bounds.minX + bounds.maxX) / 2,
      (minY + maxY) / 2,
      (bounds.minZ + bounds.maxZ) / 2
    );
    mesh.userData.levelSourceId = sourceId;
    mesh.userData.levelSource = {
      sourceId,
      sourceType: 'safetyCollider',
      purpose: 'visible stair boundary',
    };
    parent.add(mesh);
    return mesh;
  };
  for (const collider of metrics.safety) {
    if (collider.floor === 'ground') {
      box(
        group,
        collider.name,
        collider.bounds,
        definition.upperFloorElevation,
        definition.upperFloorElevation + 0.62,
        collider.sourceId
      );
      box(
        group,
        `${collider.name}-trim`,
        collider.bounds,
        definition.upperFloorElevation - GROUND_RAIL_TRIM_THICKNESS,
        definition.upperFloorElevation,
        definition.sources.trim,
        true
      );
    } else if (collider.name.endsWith('landingBackSupport')) {
      box(
        group,
        collider.name,
        collider.bounds,
        definition.lowerFloorElevation,
        definition.upperFloorElevation - config.landing.thickness,
        collider.sourceId
      );
    } else {
      // A continuous low parapet follows the steps. Shared box geometry keeps
      // the extra connection's resident geometry cost bounded.
      for (let step = 0; step < config.step.count; step += 1) {
        const bounds = {
          ...collider.bounds,
          minZ: geometry.bottomZ + step * config.step.run,
          maxZ: geometry.bottomZ + (step + 1) * config.step.run,
        };
        const elevation =
          definition.lowerFloorElevation + (step + 1) * config.step.rise;
        box(
          group,
          `${collider.name}-step-${step + 1}`,
          bounds,
          elevation - config.step.rise,
          // The upper rail/trim continues this guard at the final tread. End
          // the parapet at its underside instead of layering coplanar side faces.
          Math.min(
            elevation + 0.56,
            definition.upperFloorElevation - GROUND_RAIL_TRIM_THICKNESS
          ),
          collider.sourceId
        );
      }
      box(
        group,
        `${collider.name}-landing-support`,
        {
          ...collider.bounds,
          minZ: geometry.topZ,
        },
        definition.lowerFloorElevation,
        definition.upperFloorElevation - config.landing.thickness,
        collider.sourceId
      );
      box(
        group,
        `${collider.name}-toe`,
        { ...collider.bounds, maxZ: geometry.bottomZ },
        definition.lowerFloorElevation,
        definition.lowerFloorElevation + 0.56,
        collider.sourceId
      );
    }
  }
  group.traverse((object) => {
    if (object instanceof Mesh && !object.userData.levelSourceId) {
      object.userData.levelSourceId = definition.sources.visual;
      object.userData.levelSource = {
        sourceId: definition.sources.visual,
        sourceType: 'sceneObject',
        purpose: 'stair tread or level landing',
      };
    }
  });
  const connection: StairConnection = {
    id: definition.id,
    lowerFloorId: definition.lowerFloorId,
    upperFloorId: definition.upperFloorId,
    lowerFloorElevation: definition.lowerFloorElevation,
    upperFloorElevation: definition.upperFloorElevation,
    geometry,
    behavior: metrics.behavior,
    layout: metrics.layout,
    groups: [group],
    sources: {
      visual: definition.sources.visual,
      navigation: definition.sources.navigation,
      safety: metrics.safety.map((collider) => collider.sourceId),
    },
  };
  return { ...metrics, group, connection };
}
