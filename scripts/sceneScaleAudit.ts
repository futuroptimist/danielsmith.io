import { readFileSync } from 'node:fs';

import {
  Box3,
  InstancedMesh,
  Matrix4,
  Texture,
  Vector3,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { FLOOR_PLAN_SCALE } from '../src/assets/floorPlan';
import { FRONT_ENTRY } from '../src/scene/level/exteriorLayout';
import { FLOOR_TOP_ELEVATIONS } from '../src/scene/level/floorElevations';
import { GARAGE_DOOR } from '../src/scene/level/garageLayout';
import { PARKED_EV } from '../src/scene/level/streetLayout';
import { createAquiloopAquarium } from '../src/scene/structures/aquiloopAquarium';
import {
  createLowerFloorFurnishings,
  createUpperFloorFurnishings,
} from '../src/scene/structures/lowerFloorFurnishings';
import { PORTFOLIO_MINIATURE_TABLE_DIMENSIONS } from '../src/scene/structures/portfolioMiniatureTableContract';
import {
  STAIRCASE_CONFIG,
  WALL_HEIGHT,
} from '../src/scene/structures/portfolioSceneLayout';
import { createWoodworkingWorkshop } from '../src/scene/structures/woodworkingWorkshop';
import {
  AVATAR_BODY_SCALE,
  TARGET_AVATAR_HEIGHT,
  TARGET_ROOM_CLEAR_HEIGHT,
  FLOOR_SLAB_THICKNESS,
} from '../src/scene/units';
import {
  AVATAR_WALK_SPEED,
  AVATAR_RUN_SPEED,
} from '../src/systems/movement/avatarGait';

const dimensions = (object: Object3D) => {
  object.updateWorldMatrix(true, true);
  const bounds = new Box3().setFromObject(object, true);
  const size = bounds.getSize(new Vector3());
  return {
    name: object.name,
    width: size.x,
    height: size.y,
    depth: size.z,
    floor: bounds.min.y,
  };
};
async function main() {
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'AuditTexture',
    loadTexture: async () => new Texture(),
  }));
  const bytes = readFileSync('public/assets/avatar/daniel-animated-avatar.glb');
  const avatar = await loader.parseAsync(new Uint8Array(bytes).buffer, '');
  const aquarium = createAquiloopAquarium({ x: 0, y: 0, z: 0 });
  const bucketSizes: number[][] = [];
  aquarium.group.traverse((object) => {
    if (!(object instanceof InstancedMesh)) return;
    const names = object.userData.partNames as string[] | undefined;
    names?.forEach((name, index) => {
      if (name !== 'five-gallon-bucket') return;
      const matrix = new Matrix4();
      object.getMatrixAt(index, matrix);
      object.geometry.computeBoundingBox();
      bucketSizes.push(
        object.geometry
          .boundingBox!.clone()
          .applyMatrix4(matrix)
          .getSize(new Vector3())
          .toArray()
      );
    });
  });
  const report = {
    units: {
      physicalUnitsPerMetre: 1,
      legacyPlanXZToWorld: FLOOR_PLAN_SCALE,
      note: 'Legacy geometry is not yet fully metre-calibrated; no global transform is applied.',
    },
    targets: {
      avatarHeight: TARGET_AVATAR_HEIGHT,
      roomClearHeight: TARGET_ROOM_CLEAR_HEIGHT,
    },
    avatar: {
      authored: dimensions(avatar.scene),
      bodyScale: AVATAR_BODY_SCALE,
      runtimeStandingHeight: TARGET_AVATAR_HEIGHT,
      walkSpeed: AVATAR_WALK_SPEED,
      runSpeed: AVATAR_RUN_SPEED,
    },
    architecture: {
      wallHeight: WALL_HEIGHT,
      ceilingUndersideAboveFloor: TARGET_ROOM_CLEAR_HEIGHT,
      slabThickness: FLOOR_SLAB_THICKNESS,
      floors: FLOOR_TOP_ELEVATIONS,
      stairRise: STAIRCASE_CONFIG.step.rise,
      stairCount: STAIRCASE_CONFIG.step.count,
      stairRun: STAIRCASE_CONFIG.step.run,
      stairWidth: STAIRCASE_CONFIG.step.width,
      frontDoor: {
        width: FRONT_ENTRY.width * FLOOR_PLAN_SCALE,
        height: FRONT_ENTRY.height,
      },
      garageDoor: {
        width: GARAGE_DOOR.width * FLOOR_PLAN_SCALE,
        height: GARAGE_DOOR.height,
      },
    },
    parkedEV: { width: PARKED_EV.width, length: PARKED_EV.depth },
    portfolioTable: PORTFOLIO_MINIATURE_TABLE_DIMENSIONS,
    aquarium: {
      installation: dimensions(aquarium.group),
      water: dimensions(
        aquarium.group.getObjectByName('aquiloop-water-volume')!
      ),
      buckets: bucketSizes,
    },
    furnishings: [
      ...createLowerFloorFurnishings().group.children,
      ...createUpperFloorFurnishings().group.children,
    ].map(dimensions),
    workshop: createWoodworkingWorkshop().group.children.map(dimensions),
  };
  console.log(JSON.stringify(report, null, 2));
  aquarium.dispose();
}
void main();
