import { Group, Mesh, MeshStandardMaterial } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createGitshelvesInstallation } from '../scene/structures/gitshelves';

function getCommitMeshes(group: Group): Mesh[] {
  return group.children.filter((child) =>
    child.name.startsWith('GitshelvesCommit-')
  ) as Mesh[];
}

let originalGetContext: PropertyDescriptor | undefined;

beforeAll(() => {
  originalGetContext = Object.getOwnPropertyDescriptor(
    HTMLCanvasElement.prototype,
    'getContext'
  );
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(type: string) {
      if (type !== '2d') {
        return null;
      }
      return {
        fillStyle: '',
        font: '',
        textAlign: 'left',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      } as CanvasRenderingContext2D;
    },
  });
});

afterAll(() => {
  if (originalGetContext) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext
    );
  } else {
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)
      .getContext;
  }
});

describe('createGitshelvesInstallation', () => {
  it('builds the gitshelves array with colliders around the footprint', () => {
    const build = createGitshelvesInstallation({
      position: { x: 2.4, z: -3.1 },
      orientationRadians: Math.PI / 6,
      columns: 4,
      rows: 3,
    });

    expect(build.group.name).toBe('GitshelvesInstallation');
    expect(build.group.getObjectByName('GitshelvesBase')).toBeTruthy();
    expect(build.group.getObjectByName('GitshelvesPanel')).toBeTruthy();
    expect(build.group.getObjectByName('GitshelvesLabel')).toBeTruthy();

    const commits = getCommitMeshes(build.group);
    expect(commits).toHaveLength(12);

    expect(build.colliders).toHaveLength(1);
    const [collider] = build.colliders;
    expect(collider.minX).toBeLessThan(collider.maxX);
    expect(collider.minZ).toBeLessThan(collider.maxZ);
    expect(collider.minX).toBeLessThan(2.4);
    expect(collider.maxX).toBeGreaterThan(2.4);
    expect(collider.minZ).toBeLessThan(-3.1);
    expect(collider.maxZ).toBeGreaterThan(-3.1);
  });

  it('animates commit cells and header intensity based on emphasis', () => {
    const build = createGitshelvesInstallation({
      position: { x: 0, z: 0 },
    });

    const commit = build.group.getObjectByName('GitshelvesCommit-0-0') as Mesh;
    expect(commit).toBeTruthy();
    const commitMaterial = commit.material as MeshStandardMaterial;
    const baseIntensity = commitMaterial.emissiveIntensity;
    const baseY = commit.position.y;

    build.update({ elapsed: 0, delta: 0.016, emphasis: 0 });
    const afterIdleIntensity = commitMaterial.emissiveIntensity;
    expect(afterIdleIntensity).not.toBe(baseIntensity);

    build.update({ elapsed: 1.2, delta: 0.016, emphasis: 1 });
    expect(commitMaterial.emissiveIntensity).toBeGreaterThan(
      afterIdleIntensity
    );
    expect(commit.position.y).not.toBe(baseY);

    const header = build.group.getObjectByName('GitshelvesHeader') as Mesh;
    expect(header).toBeTruthy();
    const headerMaterial = header.material as MeshStandardMaterial;
    const headerBase = headerMaterial.emissiveIntensity;
    build.update({ elapsed: 2.1, delta: 0.016, emphasis: 0.5 });
    expect(headerMaterial.emissiveIntensity).not.toBe(headerBase);
  });
});
