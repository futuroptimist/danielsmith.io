import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three';

import type { FloorPlanDefinition } from '../../assets/floorPlan';
import { getNormalizedDoorways } from '../../assets/floorPlan/doorways';

export interface DoorwayOpeningsOptions {
  wallHeight: number;
  baseElevation?: number;
  doorHeight?: number;
  jambThickness?: number;
  lintelThickness?: number;
  trimDepth?: number;
  material?: MeshStandardMaterial;
}

export interface DoorwayOpeningsBuild {
  group: Group;
}

const DEFAULT_DOOR_HEIGHT_RATIO = 0.72;
const DEFAULT_JAMB_THICKNESS = 0.36;
const DEFAULT_LINTEL_THICKNESS = 0.22;
const DEFAULT_TRIM_DEPTH = 0.36;

const DOOR_NAME = 'DoorwayOpenings';

const createDefaultMaterial = () =>
  new MeshStandardMaterial({
    color: new Color(0x52657d),
    emissive: new Color(0x111d2a),
    emissiveIntensity: 0.14,
    roughness: 0.44,
    metalness: 0.28,
  });

export function createDoorwayOpenings(
  plan: FloorPlanDefinition,
  {
    wallHeight,
    baseElevation = 0,
    doorHeight: providedDoorHeight,
    jambThickness = DEFAULT_JAMB_THICKNESS,
    lintelThickness = DEFAULT_LINTEL_THICKNESS,
    trimDepth = DEFAULT_TRIM_DEPTH,
    material: providedMaterial,
  }: DoorwayOpeningsOptions
): DoorwayOpeningsBuild {
  const doorHeight =
    typeof providedDoorHeight === 'number'
      ? providedDoorHeight
      : wallHeight * DEFAULT_DOOR_HEIGHT_RATIO;
  const material = providedMaterial ?? createDefaultMaterial();

  const uniqueDoorways = getNormalizedDoorways(plan);

  const root = new Group();
  root.name = DOOR_NAME;

  uniqueDoorways.forEach((doorway, index) => {
    const doorGroup = new Group();
    doorGroup.name = `${DOOR_NAME}-${doorway.axis}-${index}`;
    doorGroup.position.set(doorway.center.x, baseElevation, doorway.center.z);

    const lintelSpan = Math.max(
      doorway.width - jambThickness * 0.6,
      jambThickness
    );
    const lintelHeight = doorHeight + lintelThickness / 2;

    if (doorway.axis === 'horizontal') {
      const halfWidth = doorway.width / 2;
      const jambOffset = Math.max(halfWidth - jambThickness / 2, 0);
      const jambGeometry = new BoxGeometry(
        jambThickness,
        doorHeight,
        trimDepth
      );

      const leftJamb = new Mesh(jambGeometry, material);
      leftJamb.name = `${DOOR_NAME}-JambLeft-${index}`;
      leftJamb.position.set(-jambOffset, doorHeight / 2, 0);
      doorGroup.add(leftJamb);

      const rightJamb = new Mesh(jambGeometry, material);
      rightJamb.name = `${DOOR_NAME}-JambRight-${index}`;
      rightJamb.position.set(jambOffset, doorHeight / 2, 0);
      doorGroup.add(rightJamb);

      const lintelGeometry = new BoxGeometry(
        lintelSpan,
        lintelThickness,
        trimDepth
      );
      const lintel = new Mesh(lintelGeometry, material);
      lintel.name = `${DOOR_NAME}-Lintel-${index}`;
      lintel.position.set(0, lintelHeight, 0);
      doorGroup.add(lintel);
    } else {
      const halfWidth = doorway.width / 2;
      const jambOffset = Math.max(halfWidth - jambThickness / 2, 0);
      const jambGeometry = new BoxGeometry(
        trimDepth,
        doorHeight,
        jambThickness
      );

      const nearJamb = new Mesh(jambGeometry, material);
      nearJamb.name = `${DOOR_NAME}-JambNear-${index}`;
      nearJamb.position.set(0, doorHeight / 2, -jambOffset);
      doorGroup.add(nearJamb);

      const farJamb = new Mesh(jambGeometry, material);
      farJamb.name = `${DOOR_NAME}-JambFar-${index}`;
      farJamb.position.set(0, doorHeight / 2, jambOffset);
      doorGroup.add(farJamb);

      const lintelGeometry = new BoxGeometry(
        trimDepth,
        lintelThickness,
        lintelSpan
      );
      const lintel = new Mesh(lintelGeometry, material);
      lintel.name = `${DOOR_NAME}-Lintel-${index}`;
      lintel.position.set(0, lintelHeight, 0);
      doorGroup.add(lintel);
    }

    root.add(doorGroup);
  });

  return { group: root };
}
