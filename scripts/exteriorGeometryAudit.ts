import {
  Box3,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
  type Object3D,
} from 'three';

import { FLOOR_PLAN_SCALE } from '../src/assets/floorPlan';
import { EXTERIOR_LOCALE_COPY } from '../src/assets/i18n/exterior';
import { createExteriorDoorDefinitions } from '../src/scene/level/exteriorLayout';
import { PORTFOLIO_LEVEL } from '../src/scene/level/portfolioLevel';
import { STREET_BEHAVIOR_REGIONS } from '../src/scene/level/streetLayout';
import { createResidentialExterior } from '../src/scene/structures/residentialExterior';
import { createResidentialStreet } from '../src/scene/structures/residentialStreet';
import { createDoorController } from '../src/systems/doors/controller';

// Float32 instance matrices introduce micrometre-scale noise at exterior coordinates.
const PADDING_TOLERANCE_METRES = 0.00001;
const paddingMargin = (value: number) =>
  Math.abs(value) <= PADDING_TOLERANCE_METRES ? 0 : value;

/** Audit actual builders; semantic positions are not promises about mesh centres. */
export function auditExteriorGeometry(scale = FLOOR_PLAN_SCALE) {
  const floor = PORTFOLIO_LEVEL.floors.find(
    (candidate) => candidate.id === 'ground'
  )!;
  const doors = createExteriorDoorDefinitions(scale).map(createDoorController);
  const exterior = createResidentialExterior(floor, scale, doors);
  const street = createResidentialStreet(floor, scale, EXTERIOR_LOCALE_COPY.en);
  try {
    const meshes = [
      ...measureExteriorMeshes(exterior.group),
      ...measureExteriorMeshes(street.group),
    ];
    const solids = [...exterior.solids, ...street.solids];
    const declaredColliders = solids.map((solid) => {
      const b = solid.collider;
      const singleSolidSource =
        solids.filter(
          (candidate) =>
            candidate.definition.sourceId === solid.definition.sourceId
        ).length === 1;
      const physical = meshes.filter(
        (mesh) =>
          mesh.sourceId === solid.definition.sourceId &&
          mesh.collisionPolicy === 'solid' &&
          (singleSolidSource ||
            (mesh.bounds.max[0] >= b.minX &&
              mesh.bounds.min[0] <= b.maxX &&
              mesh.bounds.max[2] >= b.minZ &&
              mesh.bounds.min[2] <= b.maxZ))
      );
      const bounds = new Box3();
      for (const mesh of physical) {
        bounds.expandByPoint(new Vector3().fromArray(mesh.bounds.min));
        bounds.expandByPoint(new Vector3().fromArray(mesh.bounds.max));
      }
      return {
        sourceId: solid.definition.sourceId,
        role: 'role' in solid ? solid.role : solid.definition.kind,
        bounds: b,
        measuredSolidParts: physical.map(({ mesh, instance }) => ({
          mesh,
          instance,
        })),
        // Signed margins: negative means visible geometry exceeds the declaration.
        conservativePadding: bounds.isEmpty()
          ? null
          : {
              minX: paddingMargin(bounds.min.x - b.minX),
              maxX: paddingMargin(b.maxX - bounds.max.x),
              minZ: paddingMargin(bounds.min.z - b.minZ),
              maxZ: paddingMargin(b.maxZ - bounds.max.z),
            },
      };
    });
    return {
      coordinateContract: {
        paddingToleranceMetres: PADDING_TOLERANCE_METRES,
        planAnchors:
          'Source position X/Z; multiply by plan scale exactly once.',
        localDimensions:
          'Builder geometry is already in world metres; no plan conversion.',
        worldSolids:
          'Declared collider rectangles; distinct from measured mesh bounds.',
        padding:
          'Signed collider margin against source-owned solids; decorative parts excluded. ' +
          'Multi-solid sources select intersecting parts per rectangle.',
      },
      anchors: floor
        .sceneObjects!.filter((source) =>
          meshes.some((mesh) => mesh.sourceId === source.sourceId)
        )
        .map((source) => {
          const bounds = new Box3();
          for (const mesh of meshes.filter(
            (mesh) => mesh.sourceId === source.sourceId
          )) {
            bounds.expandByPoint(new Vector3().fromArray(mesh.bounds.min));
            bounds.expandByPoint(new Vector3().fromArray(mesh.bounds.max));
          }
          const center = bounds.getCenter(new Vector3());
          const world = {
            x: source.position.x * scale,
            z: source.position.z * scale,
          };
          return {
            sourceId: source.sourceId,
            plan: source.position,
            world,
            measuredAssemblyCenter: center.toArray(),
            measuredAssemblySize: bounds.getSize(new Vector3()).toArray(),
            measuredAssemblyBounds: {
              min: bounds.min.toArray(),
              max: bounds.max.toArray(),
            },
            centerOffsetFromAnchor: {
              x: center.x - world.x,
              z: center.z - world.z,
            },
          };
        }),
      meshes,
      behavioralRegions: {
        floorId: 'ground',
        boundary: 'strict',
        ...STREET_BEHAVIOR_REGIONS,
      },
      declaredColliders,
      doors: doors.map(({ definition }) => definition),
      reservedRoutes: floor.rooms
        .filter((room) =>
          ['frontPath', 'sidewalk', 'driveway'].includes(room.id)
        )
        .map((room) => ({
          sourceId: room.sourceId,
          planBounds: room.bounds,
          worldBounds: Object.fromEntries(
            Object.entries(room.bounds).map(([key, value]) => [
              key,
              value * scale,
            ])
          ),
        })),
    };
  } finally {
    street.dispose();
    exterior.dispose();
  }
}

/** Measure rendered vertices, including every instance and its complete world transform. */
export function measureExteriorMeshes(root: Object3D) {
  root.updateWorldMatrix(true, true);
  const measurements: Array<{
    sourceId: string;
    mesh: string;
    instance: number | null;
    collisionPolicy: string;
    bounds: { min: number[]; max: number[] };
    size: number[];
    center: number[];
  }> = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute('position');
    const count = object instanceof InstancedMesh ? object.count : 1;
    for (let index = 0; index < count; index++) {
      const matrix = new Matrix4().copy(object.matrixWorld);
      if (object instanceof InstancedMesh) {
        const instance = new Matrix4();
        object.getMatrixAt(index, instance);
        matrix.multiply(instance);
      }
      const bounds = new Box3();
      for (let vertex = 0; vertex < position.count; vertex++)
        bounds.expandByPoint(
          new Vector3()
            .fromBufferAttribute(position, vertex)
            .applyMatrix4(matrix)
        );
      measurements.push({
        sourceId: object.userData.levelSourceId,
        mesh:
          object.name ||
          `${object.parent?.name}/${object.type}:${object.parent?.children.indexOf(object)}`,
        instance: object instanceof InstancedMesh ? index : null,
        collisionPolicy: object.userData.collisionPolicy ?? 'source-owned-door',
        bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
        size: bounds.getSize(new Vector3()).toArray(),
        center: bounds.getCenter(new Vector3()).toArray(),
      });
    }
  });
  return measurements;
}
