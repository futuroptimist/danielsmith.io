/** Offline exterior geometry model, never attached to the production renderer. */
import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Vector3,
} from 'three';

import {
  IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE,
  IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET,
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
} from '../../assets/performance';

import {
  REVIEW_RADIUS,
  REVIEW_WIDTH,
  type Graybox,
} from './neighborhoodGraybox';

/** Closed exterior shell: four walls, bottom, two roof slopes and two gables. */
export function houseShellGeometry() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 1, -0.5,
        0.5, 1, -0.5, 0.5, 1, 0.5, -0.5, 1, 0.5, 0, 1.3, -0.5, 0, 1.3, 0.5,
      ],
      3
    )
  );
  geometry.setIndex([
    0, 5, 1, 0, 4, 5, 1, 6, 2, 1, 5, 6, 2, 7, 3, 2, 6, 7, 3, 4, 0, 3, 7, 4, 0,
    2, 3, 0, 1, 2, 4, 9, 8, 4, 7, 9, 8, 6, 5, 8, 9, 6, 4, 8, 5, 6, 9, 7,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}
function groundGeometry() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5],
      3
    )
  );
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
function curveGeometry() {
  const geometry = new BufferGeometry(),
    positions: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 90; i++) {
    const angle = (Math.PI * i) / 180;
    for (const radius of [
      REVIEW_RADIUS - REVIEW_WIDTH / 2,
      REVIEW_RADIUS + REVIEW_WIDTH / 2,
    ])
      positions.push(radius * Math.cos(angle), 0, radius * Math.sin(angle));
    if (i < 90)
      indices.push(i * 2, i * 2 + 3, i * 2 + 1, i * 2, i * 2 + 2, i * 2 + 3);
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const matrix = (
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number
) => new Matrix4().makeScale(width, height, depth).setPosition(x, 0, z);

export function createExteriorMassing(layout: Graybox) {
  const group = new Group();
  const add = (
    name: string,
    geometry: BufferGeometry,
    color: number,
    transforms: Matrix4[]
  ) => {
    const mesh = new InstancedMesh(
      geometry,
      new MeshBasicMaterial({ color }),
      transforms.length
    );
    mesh.name = name;
    transforms.forEach((transform, i) => mesh.setMatrixAt(i, transform));
    group.add(mesh);
  };
  add(
    'house-shells',
    houseShellGeometry(),
    0x8c98a5,
    layout.lots.map((lot) =>
      matrix(
        lot.house.center.x,
        lot.house.center.z,
        lot.house.width,
        lot.height,
        lot.house.depth
      )
    )
  );
  add(
    'frontage-fences',
    new BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    0x856b50,
    layout.lots.flatMap((lot) =>
      lot.fences.map((fence) =>
        matrix(fence.center.x, fence.center.z, fence.width, 1, fence.depth)
      )
    )
  );
  const plane = groundGeometry();
  const rectangles = (bounds: Graybox['physicalLines']) =>
    bounds.map((b) =>
      matrix(
        (b.minX + b.maxX) / 2,
        (b.minZ + b.maxZ) / 2,
        b.maxX - b.minX,
        1,
        b.maxZ - b.minZ
      )
    );
  add('straight-walkways', plane, 0xb7cfbf, rectangles(layout.physicalLines));
  add(
    'curved-walkways',
    curveGeometry(),
    0xb7cfbf,
    layout.arcs.map((arc) =>
      new Matrix4()
        .makeRotationY(-arc.start)
        .setPosition(arc.center.x, 0, arc.center.z)
    )
  );
  add('streets', plane, 0xc1c7ce, rectangles(layout.proposedStreets));
  return group;
}

export function measureExteriorMassing(layout: Graybox) {
  const group = createExteriorMassing(layout);
  const meshes = group.children as InstancedMesh[];
  const geometries = new Set(meshes.map((mesh) => mesh.geometry));
  const materials = new Set(
    meshes.flatMap((mesh) =>
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    )
  );
  const batches = meshes.map((mesh) => ({
    name: mesh.name,
    instances: mesh.count,
    trianglesPerInstance: mesh.geometry.index!.count / 3,
    submittedTriangles: (mesh.geometry.index!.count / 3) * mesh.count,
  }));
  let surfaceArea = 0;
  const transform = new Matrix4(),
    a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute('position'),
      indices = mesh.geometry.index!;
    for (let instance = 0; instance < mesh.count; instance++) {
      mesh.getMatrixAt(instance, transform);
      for (let i = 0; i < indices.count; i += 3) {
        a.fromBufferAttribute(positions, indices.getX(i)).applyMatrix4(
          transform
        );
        b.fromBufferAttribute(positions, indices.getX(i + 1)).applyMatrix4(
          transform
        );
        c.fromBufferAttribute(positions, indices.getX(i + 2)).applyMatrix4(
          transform
        );
        surfaceArea += b.sub(a).cross(c.sub(a)).length() / 2;
      }
    }
  }
  const triangles = batches.reduce(
    (sum, batch) => sum + batch.submittedTriangles,
    0
  );
  const unbatchedDrawCalls = batches.reduce(
    (sum, batch) => sum + batch.instances,
    0
  );
  const baseline = IMMERSIVE_LAUNCH_PERFORMANCE_BASELINE;
  const budget = IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET;
  const model = {
    method:
      'Count actual CPU-created exterior mesh buffers and instance counts. All batches visible, ' +
      'one base pass, no WebGL renderer; excludes parcels, source overlays ' +
      'and existing scene geometry.',
    integratedRuntime: false,
    batches,
    triangles,
    instancedBasePassDrawCalls: meshes.length,
    unbatchedBasePassDrawCalls: unbatchedDrawCalls,
    uniqueGeometries: geometries.size,
    materials: materials.size,
    textures: 0,
    meshSurfaceAreaIncludingBottoms: surfaceArea,
    houseFootprintArea: layout.lots.reduce(
      (sum, lot) => sum + lot.house.width * lot.house.depth,
      0
    ),
    sourceBudgets: { launch: budget, general: IMMERSIVE_PERFORMANCE_BUDGET },
    staticBaselineScenario: {
      warning:
        'Arithmetic scenario using the source static baseline, not a measured integrated frame.',
      baseline,
      generalBaseline: IMMERSIVE_SCENE_BASELINE,
      drawCalls: baseline.drawCalls + meshes.length,
      unbatchedDrawCalls: baseline.drawCalls + unbatchedDrawCalls,
      triangles: baseline.triangles + triangles,
      geometries: baseline.geometries + geometries.size,
      textures: baseline.textures,
      textureBytes: IMMERSIVE_SCENE_BASELINE.textureBytes,
      materials: IMMERSIVE_SCENE_BASELINE.materialCount + materials.size,
      instancedDrawCallsWithinBudget:
        baseline.drawCalls + meshes.length <= budget.maxDrawCalls,
      unbatchedDrawCallsWithinBudget:
        baseline.drawCalls + unbatchedDrawCalls <= budget.maxDrawCalls,
      trianglesWithinBudget:
        baseline.triangles + triangles <= budget.maxTriangles,
      geometriesWithinBudget:
        baseline.geometries + geometries.size <= budget.maxGeometries,
      texturesWithinBudget: baseline.textures <= budget.maxTextures,
      materialsWithinBudget:
        IMMERSIVE_SCENE_BASELINE.materialCount + materials.size <=
        IMMERSIVE_PERFORMANCE_BUDGET.maxMaterials,
      textureBytesWithinBudget:
        IMMERSIVE_SCENE_BASELINE.textureBytes <=
        IMMERSIVE_PERFORMANCE_BUDGET.maxTextureBytes,
      frameTimeQualified: false,
    },
    remainingGates: [
      'Global batches can submit all instances when any part is visible; no per-lot culling.',
      'Larger surfaces can increase fragment work and shadows; no FPS inference.',
      'Renderer calls, camera routes, LOD, shadows and device frame time remain unmeasured.',
      'Instantiation is an offline model only, not an implemented production optimization.',
    ],
  };
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  return model;
}
