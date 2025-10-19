import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../../../assets/floorPlan';
import { createDoorwayOpenings } from '../../structures/doorwayOpenings';

const HORIZONTAL_DOOR_KEYS = {
  livingToKitchen: { x: -18, z: -8 },
  livingToStudio: { x: 15, z: -8 },
  kitchenToBackyard: { x: -18, z: 16 },
  studioToBackyard: { x: 15, z: 16 },
};

const VERTICAL_DOOR_KEY = { x: -4, z: 4 };

const EPSILON = 1e-5;

const findDoorwayGroup = (
  children: readonly THREE.Object3D[],
  position: { x: number; z: number }
) => {
  return children.find(
    (child) =>
      Math.abs(child.position.x - position.x) < EPSILON &&
      Math.abs(child.position.z - position.z) < EPSILON
  );
};

describe('createDoorwayOpenings', () => {
  it('creates doorway trim for each unique opening on the ground floor', () => {
    const { group } = createDoorwayOpenings(FLOOR_PLAN, {
      wallHeight: 6,
      doorHeight: 4.4,
      jambThickness: 0.32,
      lintelThickness: 0.2,
      trimDepth: 0.42,
    });

    expect(group.name).toBe('DoorwayOpenings');
    expect(group.children).toHaveLength(5);

    const livingKitchen = findDoorwayGroup(
      group.children,
      HORIZONTAL_DOOR_KEYS.livingToKitchen
    );
    expect(livingKitchen?.children).toHaveLength(3);

    const lintel = livingKitchen?.children.find((child) =>
      child.name.includes('Lintel')
    );
    expect(lintel).toBeDefined();
    if (lintel) {
      const lintelMesh = lintel as THREE.Mesh;
      const geometry = lintelMesh.geometry as THREE.BoxGeometry;
      expect(geometry.parameters.height).toBeCloseTo(0.2, 5);
      expect(lintel.position.y).toBeCloseTo(4.4 + 0.1, 5);
    }

    const leftJamb = livingKitchen?.children.find((child) =>
      child.name.includes('JambLeft')
    );
    const rightJamb = livingKitchen?.children.find((child) =>
      child.name.includes('JambRight')
    );
    expect(leftJamb).toBeDefined();
    expect(rightJamb).toBeDefined();
    if (leftJamb && rightJamb) {
      const leftMesh = leftJamb as THREE.Mesh;
      const rightMesh = rightJamb as THREE.Mesh;
      const leftGeometry = leftMesh.geometry as THREE.BoxGeometry;
      const rightGeometry = rightMesh.geometry as THREE.BoxGeometry;
      expect(leftGeometry.parameters.width).toBeCloseTo(0.32, 5);
      expect(rightGeometry.parameters.width).toBeCloseTo(0.32, 5);
      expect(leftMesh.position.x).toBeCloseTo(-3.84, 2);
      expect(rightMesh.position.x).toBeCloseTo(3.84, 2);
      expect(leftMesh.position.y).toBeCloseTo(2.2, 5);
      expect(rightMesh.position.y).toBeCloseTo(2.2, 5);
    }

    const verticalDoor = findDoorwayGroup(group.children, VERTICAL_DOOR_KEY);
    expect(verticalDoor?.children).toHaveLength(3);
    if (verticalDoor) {
      const near = verticalDoor.children.find((child) =>
        child.name.includes('JambNear')
      ) as THREE.Mesh | undefined;
      const far = verticalDoor.children.find((child) =>
        child.name.includes('JambFar')
      ) as THREE.Mesh | undefined;
      expect(near).toBeDefined();
      expect(far).toBeDefined();
      if (near && far) {
        const geometry = near.geometry as THREE.BoxGeometry;
        expect(geometry.parameters.depth).toBeCloseTo(0.32, 5);
        expect(near.position.z).toBeCloseTo(-3.84, 2);
        expect(far.position.z).toBeCloseTo(3.84, 2);
      }
    }

    const backyardDoor = findDoorwayGroup(
      group.children,
      HORIZONTAL_DOOR_KEYS.kitchenToBackyard
    );
    expect(backyardDoor?.children).toHaveLength(3);
  });

  it('derives doorway height from the wall height when unspecified', () => {
    const { group } = createDoorwayOpenings(FLOOR_PLAN, {
      wallHeight: 6,
    });

    expect(group.children.length).toBeGreaterThan(0);
    const firstDoor = group.children[0];
    const lintel = firstDoor.children.find((child) =>
      child.name.includes('Lintel')
    ) as THREE.Mesh | undefined;
    expect(lintel).toBeDefined();
    if (lintel) {
      expect(lintel.position.y).toBeCloseTo(6 * 0.72 + 0.11, 5);
    }
  });
});
