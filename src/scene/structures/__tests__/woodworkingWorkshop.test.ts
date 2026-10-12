import { Box3, InstancedMesh, LOD, PerspectiveCamera } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { FLOOR_PLAN_SCALE } from '../../../assets/floorPlan';
import { collidesWithColliders } from '../../../systems/collision';
import { ORDERED_SCENE_DETAIL_LEVELS } from '../../graphics/sceneDetailPolicy';
import { CAREER_MUSEUM_OBJECTS } from '../../level/careerMuseumLayout';
import { getFloorTopElevation } from '../../level/floorElevations';
import { WORKSHOP_RESERVATION } from '../../level/woodworkingLayout';
import { createWoodworkingWorkshop } from '../woodworkingWorkshop';

describe('woodworking corner', () => {
  it.each(ORDERED_SCENE_DETAIL_LEVELS)(
    'keeps recognizable projects within physical bounds in %s',
    (level) => {
      const build = createWoodworkingWorkshop(level);
      build.group.updateMatrixWorld(true);
      const names: string[] = [];
      let triangles = 0;
      const geometries = new Set();
      const materials = new Set();
      build.group.traverse((object) => {
        if (!(object instanceof InstancedMesh)) return;
        names.push(...object.userData.partNames);
        expect(object.frustumCulled).toBe(true);
        expect(object.boundingSphere).not.toBeNull();
        geometries.add(object.geometry);
        materials.add(object.material);
        triangles += (object.geometry.index!.count / 3) * object.count;
      });
      for (const name of [
        'birdhouse-entry',
        'detached-roof-panel',
        'picture-frame-side',
        'unfinished-stool-leg',
        'planter-slatted-side',
        'loose-shelf-stack',
        'enclosed-upper-wheel',
        'stationary-chuck',
      ])
        expect(names).toContain(name);
      expect(geometries.size).toBe(2);
      expect(materials.size).toBeLessThanOrEqual(5);
      expect(triangles).toBeLessThan(3000);
      for (const station of build.stations) {
        const box = new Box3().setFromObject(station.group);
        expect(box.min.y).toBeGreaterThanOrEqual(-5.001);
        expect(box.max.y).toBeLessThanOrEqual(station.collider.maxY + 0.001);
        expect(box.min.x).toBeGreaterThanOrEqual(station.collider.minX - 0.001);
        expect(box.max.x).toBeLessThanOrEqual(station.collider.maxX + 0.001);
        expect(box.min.z).toBeGreaterThanOrEqual(station.collider.minZ - 0.001);
        expect(box.max.z).toBeLessThanOrEqual(station.collider.maxZ + 0.001);
        expect(box.min.x).toBeGreaterThanOrEqual(
          WORKSHOP_RESERVATION.minX * FLOOR_PLAN_SCALE
        );
        expect(box.max.x).toBeLessThanOrEqual(
          WORKSHOP_RESERVATION.maxX * FLOOR_PLAN_SCALE
        );
        expect(box.min.z).toBeGreaterThanOrEqual(
          WORKSHOP_RESERVATION.minZ * FLOOR_PLAN_SCALE
        );
        expect(box.max.z).toBeLessThanOrEqual(
          WORKSHOP_RESERVATION.maxZ * FLOOR_PLAN_SCALE
        );
      }
      build.dispose();
    }
  );

  it('keeps museum anchors, stair approach and running perimeter lanes clear', () => {
    const build = createWoodworkingWorkshop();
    const colliders = build.stations.map((station) => station.collider);
    for (const object of CAREER_MUSEUM_OBJECTS.filter(
      (entry) => entry.kind === 'career-exhibit'
    )) {
      expect(
        collidesWithColliders(
          object.position.x * FLOOR_PLAN_SCALE,
          object.position.z * FLOOR_PLAN_SCALE + 2.5,
          3.6,
          colliders
        )
      ).toBe(false);
    }
    // Both walking and a conservative doubled-radius running envelope.
    for (const radius of [0.75, 1.5]) {
      for (let t = 0; t <= 1; t += 0.01) {
        for (const [x, z] of [
          [-29, -33 + 45 * t],
          [-29 + 58 * t, -33],
          [3.8, -33 + 24 * t],
        ]) {
          expect(
            collidesWithColliders(
              x * Math.SQRT1_2,
              z * Math.SQRT1_2,
              radius,
              colliders
            )
          ).toBe(false);
        }
      }
    }
    for (const collider of colliders) {
      const x = (collider.minX + collider.maxX) / 2;
      const z = (collider.minZ + collider.maxZ) / 2;
      expect(
        collidesWithColliders(x, z, 0.75, colliders, {
          feetY: getFloorTopElevation('basement'),
          height: 1.8,
          activeConnectionId: null,
        })
      ).toBe(true);
      expect(
        collidesWithColliders(x, z, 0.75, colliders, {
          feetY: 0,
          height: 1.8,
          activeConnectionId: null,
        })
      ).toBe(false);
    }
    build.dispose();
  });

  it('drops fine detail at distance and disposes shared resources exactly once', () => {
    const build = createWoodworkingWorkshop();
    const camera = new PerspectiveCamera();
    camera.position.set(100, 40, 100);
    camera.updateMatrixWorld();
    build.group.updateMatrixWorld(true);
    const resources = new Set<{ dispose(): void }>();
    build.group.traverse((object) => {
      if (object instanceof LOD) {
        object.update(camera);
        expect(object.getCurrentLevel()).toBe(1);
      }
      if (object instanceof InstancedMesh) {
        resources.add(object);
        resources.add(object.geometry);
        if (!Array.isArray(object.material)) resources.add(object.material);
      }
    });
    const spies = [...resources].map((resource) =>
      vi.spyOn(resource, 'dispose')
    );
    build.dispose();
    build.dispose();
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    expect(build.group.children).toHaveLength(0);
  });
});
