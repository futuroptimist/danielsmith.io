import { Raycaster, type Intersection } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createColliderDebugEntries,
  createColliderVisualizer,
} from '../scene/debug/colliderVisualizer';

const ground = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
const upper = { minX: 2, maxX: 3, minZ: 2, maxZ: 3 };
const staticCollider = { minX: 4, maxX: 5, minZ: 4, maxZ: 5 };

describe('collider visualizer', () => {
  it('builds active-floor debug entries without mutating collider arrays', () => {
    const entries = createColliderDebugEntries({
      groundColliders: [ground],
      upperFloorColliders: [upper],
      staticColliders: [staticCollider],
    });

    expect(entries).toEqual([
      { floor: 'ground', category: 'ground', name: 'ground-1', bounds: ground },
      { floor: 'upper', category: 'upper', name: 'upper-1', bounds: upper },
      {
        floor: 'ground',
        category: 'static',
        name: 'static-1',
        bounds: staticCollider,
      },
    ]);
  });

  it('only displays colliders for the active floor when enabled', () => {
    const visualizer = createColliderVisualizer(
      createColliderDebugEntries({
        groundColliders: [ground],
        upperFloorColliders: [upper],
        staticColliders: [staticCollider],
      }),
      'ground'
    );

    expect(visualizer.getState()).toEqual({
      enabled: false,
      visibleColliderCount: 0,
      totalColliderCount: 3,
    });

    visualizer.setEnabled(true);
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 2,
      totalColliderCount: 3,
    });
    expect(visualizer.getColliders().filter((entry) => entry.visible)).toEqual([
      expect.objectContaining({ floor: 'ground', category: 'ground' }),
      expect.objectContaining({ floor: 'ground', category: 'static' }),
    ]);

    visualizer.setActiveFloorId('upper');
    expect(visualizer.getState()).toEqual({
      enabled: true,
      visibleColliderCount: 1,
      totalColliderCount: 3,
    });
    expect(visualizer.getColliders().filter((entry) => entry.visible)).toEqual([
      expect.objectContaining({ floor: 'upper', category: 'upper' }),
    ]);

    visualizer.setEnabled(false);
    expect(visualizer.getState()).toEqual({
      enabled: false,
      visibleColliderCount: 0,
      totalColliderCount: 3,
    });

    visualizer.dispose();
  });

  it('marks meshes as debug-only and opts them out of raycasting', () => {
    const visualizer = createColliderVisualizer(
      createColliderDebugEntries({
        groundColliders: [ground],
        upperFloorColliders: [],
        staticColliders: [],
      })
    );
    const mesh = visualizer.group.children[0];

    expect(visualizer.group.userData).toMatchObject({
      debugOnly: true,
      nonInteractive: true,
    });
    expect(mesh.userData).toMatchObject({
      debugOnly: true,
      nonInteractive: true,
    });
    expect(mesh.raycast(new Raycaster(), [] as Intersection[])).toBeUndefined();

    visualizer.dispose();
  });
});
