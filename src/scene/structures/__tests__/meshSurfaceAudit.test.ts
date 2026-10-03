import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN_SCALE, WALL_THICKNESS } from '../../../assets/floorPlan';
import { createDoorController } from '../../../systems/doors/controller';
import { createExteriorDoorDefinitions } from '../../level/exteriorLayout';
import { generateFloorSurfaces } from '../../level/generateFloorSurfaces';
import { generateWallSegmentInstances } from '../../level/generateWalls';
import { PORTFOLIO_LEVEL } from '../../level/portfolioLevel';
import { createBasementStaircase } from '../basementStaircase';
import { createResidentialExterior } from '../residentialExterior';
import { createWallSegmentMeshes } from '../wallSegmentsMesh';

import {
  findMeshSurfaceOverlaps,
  formatMeshSurfaceOverlaps,
} from './helpers/meshSurfaceAudit';

const triangle = (points = [0, 0, 0, 2, 0, 0, 0, 2, 0]) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return new Mesh(geometry, new MeshBasicMaterial());
};

describe('rendered triangle surface audit', () => {
  it('starts each material-group draw at its effective range for static instances', () => {
    const root = new Group();
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        [10, 0, 0, 12, 0, 0, 10, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0],
        3
      )
    );
    geometry.addGroup(0, 3, 0);
    geometry.addGroup(3, 3, 1);
    geometry.setDrawRange(1, 5);
    const instances = new InstancedMesh(
      geometry,
      [new MeshBasicMaterial(), new MeshBasicMaterial()],
      1
    );
    instances.setMatrixAt(0, new Matrix4());
    root.add(instances, triangle());
    expect(findMeshSurfaceOverlaps(root)).toHaveLength(1);
  });

  it.each(['x', 'y', 'z'] as const)(
    'detects static instance overlaps normal to world %s',
    (axis) => {
      const root = new Group();
      const surface = triangle();
      if (axis === 'x') surface.rotation.y = Math.PI / 2;
      if (axis === 'y') surface.rotation.x = -Math.PI / 2;
      surface.updateMatrix();
      const instances = new InstancedMesh(
        surface.geometry,
        new MeshBasicMaterial(),
        2
      );
      instances.name = 'StaticPocket';
      instances.setMatrixAt(0, surface.matrix);
      const offset = new Matrix4().makeTranslation(
        axis === 'x' ? 0.0001 : 0,
        axis === 'y' ? 0.0001 : 0,
        axis === 'z' ? 0.0001 : 0
      );
      instances.setMatrixAt(1, offset.multiply(surface.matrix));
      root.add(instances);
      const findings = findMeshSurfaceOverlaps(root);
      expect(findings).toHaveLength(1);
      expect(findings[0].a.instanceIndex).toBe(0);
      expect(findings[0].b.instanceIndex).toBe(1);
      expect(findings[0].planeDistance).toBeCloseTo(0.0001, 6);
      expect(findings[0].overlapArea).toBeCloseTo(2, 6);
      expect(formatMeshSurfaceOverlaps(findings)).toContain('instance 1');
      instances.count = 1;
      expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    }
  );

  it('detects nearly coplanar transformed faces and reports mesh and source identity', () => {
    const root = new Group();
    const parent = new Group();
    parent.position.set(6, 4, 2);
    parent.rotation.set(0.2, 0.5, 0.1);
    parent.scale.set(2, 1, 3);
    const a = triangle();
    const b = triangle();
    a.name = 'Rail';
    a.userData.levelSourceId = 'fixture.rail';
    b.name = 'Trim';
    b.userData.levelSourceId = 'fixture.trim';
    b.position.z = 0.0001;
    parent.add(a, b);
    root.add(parent);
    const findings = findMeshSurfaceOverlaps(root);
    expect(findings).toHaveLength(1);
    expect(findings[0].planeDistance).toBeCloseTo(0.0003, 6);
    expect(findings[0].overlapArea).toBeCloseTo(4, 5);
    expect(formatMeshSurfaceOverlaps(findings)).toContain(
      'Rail [fixture.rail]'
    );
    expect(formatMeshSurfaceOverlaps(findings)).toContain(
      'Trim [fixture.trim]'
    );
    b.position.z = 0.01;
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
  });

  it('ignores overlapping triangle bounds without overlapping face area', () => {
    const root = new Group();
    root.add(triangle(), triangle([2, 2, 0, 0.8, 2, 0, 2, 0.8, 0]));
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
  });

  it('ignores edge contacts, perpendicular intersections, and opposite-facing joins', () => {
    const root = new Group();
    const a = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    const b = a.clone();
    b.position.x = 2;
    root.add(a, b);
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    root.clear();
    const perpendicular = triangle();
    perpendicular.rotation.x = Math.PI / 2;
    root.add(triangle(), perpendicular);
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    root.clear();
    root.add(triangle(), triangle([0, 0, 0, 0, 2, 0, 2, 0, 0]));
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    (root.children[1] as Mesh).material = new MeshBasicMaterial({
      side: DoubleSide,
    });
    expect(findMeshSurfaceOverlaps(root)).toHaveLength(1);
  });

  it('respects indexed geometry, material groups, draw ranges and hidden ancestors', () => {
    const root = new Group();
    const hidden = new Group();
    const a = triangle();
    const b = triangle();
    b.geometry.setIndex([0, 1, 2]);
    b.geometry.addGroup(0, 3, 1);
    const visibleMaterial = new MeshBasicMaterial();
    b.material = [new MeshBasicMaterial({ visible: false }), visibleMaterial];
    hidden.add(b);
    root.add(a, hidden);
    expect(findMeshSurfaceOverlaps(root)).toHaveLength(1);
    hidden.visible = false;
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    hidden.visible = true;
    visibleMaterial.visible = false;
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
    visibleMaterial.visible = true;
    b.geometry.setDrawRange(0, 0);
    expect(findMeshSurfaceOverlaps(root)).toEqual([]);
  });

  it('uses rendered facing for mirrored transforms and back-side materials', () => {
    const root = new Group();
    const a = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    const b = a.clone();
    b.scale.x = -1;
    root.add(a, b);
    expect(findMeshSurfaceOverlaps(root).length).toBeGreaterThan(0);
    root.clear();
    const reversed = triangle([0, 0, 0, 0, 2, 0, 2, 0, 0]);
    reversed.material = new MeshBasicMaterial({ side: BackSide });
    root.add(triangle(), reversed);
    expect(findMeshSurfaceOverlaps(root)).toHaveLength(1);
  });
});

describe('garage shared-wall screenshot regression', () => {
  it('keeps the sliding pocket faces clear of the actual shared wall', () => {
    const floor = PORTFOLIO_LEVEL.floors.find(
      (entry) => entry.id === 'ground'
    )!;
    const material = new MeshBasicMaterial();
    const walls = createWallSegmentMeshes({
      instances: generateWallSegmentInstances(floor, {
        coordinateScale: FLOOR_PLAN_SCALE,
        baseElevation: 0,
        wallHeight: 6,
        wallThickness: WALL_THICKNESS,
        fenceHeight: 2.4,
        fenceThickness: 0.28,
        getRoomCategory: (id) =>
          floor.rooms.find((room) => room.id === id)!.category,
      }).filter((wall) => wall.sourceId === 'ground.studio.east_wall'),
      getMaterial: () => material,
    });
    const exterior = createResidentialExterior(
      floor,
      FLOOR_PLAN_SCALE,
      createExteriorDoorDefinitions(FLOOR_PLAN_SCALE).map(createDoorController)
    );
    const root = new Group();
    const pocket = exterior.group.getObjectByName(
      'Exterior:ground.garage.houseDoor:slate'
    )!;
    expect(walls.meshes.length).toBeGreaterThan(0);
    expect(pocket).toBeInstanceOf(InstancedMesh);
    root.add(walls.group, pocket);
    const findings = findMeshSurfaceOverlaps(root).filter(
      ({ a, b }) =>
        [a, b].some((face) => face.sourceId === 'ground.studio.east_wall') &&
        [a, b].some((face) => face.sourceId === 'ground.garage.houseDoor')
    );
    expect(formatMeshSurfaceOverlaps(findings)).toBe('');
    exterior.group.add(pocket);
    exterior.dispose();
    walls.meshes.forEach((mesh) => mesh.geometry.dispose());
    material.dispose();
  });
});

describe('basement staircase screenshot regressions', () => {
  it.each(['west', 'east'])(
    'keeps the %s final parapet clear of the ground rail and trim faces',
    (side) => {
      const stair = createBasementStaircase();
      const finalStepName =
        `BasementStairs-basement-${side}RampRail-` +
        `step-${stair.config.step.count}`;
      const groundRailName = `BasementStairs-ground-${side}VoidRail`;
      const findings = findMeshSurfaceOverlaps(stair.group).filter(
        ({ a, b }) => {
          const names = [a.mesh.name, b.mesh.name];
          return (
            names.includes(finalStepName) &&
            names.some(
              (name) =>
                name === groundRailName || name === `${groundRailName}-trim`
            )
          );
        }
      );
      expect(formatMeshSurfaceOverlaps(findings)).toBe('');
    }
  );

  it('keeps ground-floor slab faces clear of the long basement opening trim', () => {
    const stair = createBasementStaircase();
    const floor = PORTFOLIO_LEVEL.floors.find(
      (entry) => entry.id === 'ground'
    )!;
    const tiles = generateFloorSurfaces(floor, {
      elevation: stair.definition.upperFloorElevation,
      cutoutsBySurfaceId: {
        'livingRoom-floor-main': stair.floorCutouts,
      },
    });
    const root = new Group();
    root.add(stair.group, tiles.group);
    const findings = findMeshSurfaceOverlaps(root).filter(({ a, b }) => {
      const surfaces = [a, b];
      return (
        surfaces.some(
          (surface) => surface.sourceId === stair.definition.sources.trim
        ) &&
        surfaces.some(
          (surface) =>
            surface.mesh.userData.levelSource?.sourceType === 'floorSurface'
        )
      );
    });
    expect(formatMeshSurfaceOverlaps(findings)).toBe('');
  });
});
