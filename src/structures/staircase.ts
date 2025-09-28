import type { MeshStandardMaterialParameters, Vector3 } from 'three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

import type { RectCollider } from '../collision';

export interface StaircaseStepConfig {
  count: number;
  rise: number;
  run: number;
  width: number;
  material: MeshStandardMaterialParameters;
  colliderInset?: number;
}

export interface StaircaseLandingConfig {
  depth: number;
  thickness: number;
  material: MeshStandardMaterialParameters;
  colliderInset?: number;
  guard?: {
    height: number;
    thickness: number;
    inset: number;
    widthScale?: number;
    material?: MeshStandardMaterialParameters;
  };
}

export interface StaircaseSupportDefinition {
  offsetX: number;
  width: number;
  depth: number;
}

export interface StaircaseSupportConfig {
  material: MeshStandardMaterialParameters;
  definitions: StaircaseSupportDefinition[];
}

export interface StaircaseConfig {
  basePosition: Vector3;
  name?: string;
  step: StaircaseStepConfig;
  landing: StaircaseLandingConfig;
  supports?: StaircaseSupportConfig;
}

export interface StaircaseBuildResult {
  group: Group;
  colliders: RectCollider[];
  totalRise: number;
}

/**
 * Creates a rectangular staircase with uniform treads, landing, and structural supports.
 * The geometry is intentionally data-driven so future automation can adjust sizes or
 * material palettes without touching scene wiring.
 */
export function createStaircase(config: StaircaseConfig): StaircaseBuildResult {
  const group = new Group();
  group.name = config.name ?? 'Staircase';
  const colliders: RectCollider[] = [];

  const stepMaterial = new MeshStandardMaterial(config.step.material);
  const landingMaterial = new MeshStandardMaterial(config.landing.material);
  const guardMaterial = config.landing.guard
    ? new MeshStandardMaterial(
        config.landing.guard.material ?? config.landing.material
      )
    : undefined;
  const supportMaterial = config.supports
    ? new MeshStandardMaterial(config.supports.material)
    : undefined;

  const totalRise = config.step.count * config.step.rise;
  const { basePosition } = config;
  const stepColliderInset = config.step.colliderInset ?? 0;
  const landingColliderInset =
    config.landing.colliderInset ?? stepColliderInset;

  for (let i = 0; i < config.step.count; i += 1) {
    const geometry = new BoxGeometry(
      config.step.width,
      config.step.rise,
      config.step.run
    );
    const step = new Mesh(geometry, stepMaterial);
    step.position.set(
      basePosition.x,
      basePosition.y + config.step.rise * (i + 0.5),
      basePosition.z + config.step.run * (i + 0.5)
    );
    step.name = `StaircaseStep-${i + 1}`;
    group.add(step);

    colliders.push({
      minX: step.position.x - config.step.width / 2 + stepColliderInset,
      maxX: step.position.x + config.step.width / 2 - stepColliderInset,
      minZ: step.position.z - config.step.run / 2 + stepColliderInset,
      maxZ: step.position.z + config.step.run / 2 - stepColliderInset,
    });
  }

  const landingGeometry = new BoxGeometry(
    config.step.width,
    config.landing.thickness,
    config.landing.depth
  );
  const landing = new Mesh(landingGeometry, landingMaterial);
  landing.position.set(
    basePosition.x,
    basePosition.y + totalRise + config.landing.thickness / 2,
    basePosition.z +
      config.step.run * config.step.count +
      config.landing.depth / 2
  );
  landing.name = 'StaircaseLanding';
  group.add(landing);

  colliders.push({
    minX: landing.position.x - config.step.width / 2 + landingColliderInset,
    maxX: landing.position.x + config.step.width / 2 - landingColliderInset,
    minZ: landing.position.z - config.landing.depth / 2 + landingColliderInset,
    maxZ: landing.position.z + config.landing.depth / 2 - landingColliderInset,
  });

  if (config.landing.guard && guardMaterial) {
    const guardWidth =
      config.step.width * (config.landing.guard.widthScale ?? 1.0);
    const guardGeometry = new BoxGeometry(
      guardWidth,
      config.landing.guard.height,
      config.landing.guard.thickness
    );
    const guard = new Mesh(guardGeometry, guardMaterial);
    guard.position.set(
      landing.position.x,
      landing.position.y +
        config.landing.guard.height / 2 +
        config.landing.thickness / 2,
      landing.position.z + config.landing.depth / 2 - config.landing.guard.inset
    );
    guard.name = 'StaircaseLandingGuard';
    group.add(guard);
  }

  if (config.supports && supportMaterial) {
    const runLength = config.step.run * config.step.count;
    config.supports.definitions.forEach((definition, index) => {
      const supportGeometry = new BoxGeometry(
        definition.width,
        totalRise,
        definition.depth
      );
      const support = new Mesh(supportGeometry, supportMaterial);
      support.position.set(
        basePosition.x + definition.offsetX,
        basePosition.y + totalRise / 2,
        basePosition.z + runLength / 2
      );
      support.name = `StaircaseSupport-${index + 1}`;
      group.add(support);

      colliders.push({
        minX: support.position.x - definition.width / 2,
        maxX: support.position.x + definition.width / 2,
        minZ: support.position.z - definition.depth / 2,
        maxZ: support.position.z + definition.depth / 2,
      });
    });
  }

  return {
    group,
    colliders,
    totalRise,
  };
}
