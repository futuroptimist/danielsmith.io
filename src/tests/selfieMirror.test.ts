import {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createSelfieMirror } from '../scene/structures/selfieMirror';

describe('SelfieMirror structure', () => {
  it('creates mirror geometry and collider footprint', () => {
    const mirror = createSelfieMirror({
      position: { x: 18, z: -22 },
      orientationRadians: Math.PI / 6,
      width: 3,
      height: 3.6,
    });

    expect(mirror.group.name).toBe('SelfieMirror');
    expect(mirror.group.position.x).toBeCloseTo(18);
    expect(mirror.group.position.z).toBeCloseTo(-22);
    expect(mirror.group.rotation.y).toBeCloseTo(Math.PI / 6);

    const frame = mirror.group.getObjectByName('SelfieMirrorFrame');
    const display = mirror.group.getObjectByName('SelfieMirrorDisplay');
    const glow = mirror.group.getObjectByName('SelfieMirrorGlow');
    expect(frame).toBeInstanceOf(Mesh);
    expect(display).toBeInstanceOf(Mesh);
    expect(glow).toBeInstanceOf(Mesh);

    expect(mirror.collider.minX).toBeLessThan(mirror.collider.maxX);
    expect(mirror.collider.minZ).toBeLessThan(mirror.collider.maxZ);
    mirror.dispose();
  });

  it('updates camera framing around the player and boosts the glow nearby', () => {
    const mirror = createSelfieMirror({
      position: { x: 2, z: 4 },
      orientationRadians: 0,
    });

    const glow = mirror.group.getObjectByName('SelfieMirrorGlow') as Mesh;
    const glowMaterial = glow.material as MeshBasicMaterial;
    const initialOpacity = glowMaterial.opacity;

    const playerPosition = new Vector3(2, 0.6, 1);
    mirror.update({
      playerPosition,
      playerRotationY: Math.PI,
      playerHeight: 1.92,
    });

    const direction = new Vector3();
    mirror.camera.getWorldDirection(direction);
    const focus = playerPosition
      .clone()
      .add(new Vector3(0, 1.92 * 0.62, 0))
      .sub(mirror.camera.position)
      .normalize();
    expect(direction.x).toBeCloseTo(focus.x, 5);
    expect(direction.y).toBeCloseTo(focus.y, 5);
    expect(direction.z).toBeCloseTo(focus.z, 5);
    expect(glowMaterial.opacity).toBeGreaterThan(initialOpacity);

    mirror.dispose();
  });

  it('renders to the offscreen target while preserving HUD visibility', () => {
    const mirror = createSelfieMirror({
      position: { x: 0, z: 0 },
    });
    const scene = new Scene();
    scene.add(mirror.group);

    const setRenderTarget = vi.fn();
    const render = vi.fn();
    const getRenderTarget = vi.fn(() => null);

    const renderer = {
      getRenderTarget,
      setRenderTarget,
      render,
      autoClear: false,
    } as unknown as WebGLRenderer;

    const display = mirror.group.getObjectByName('SelfieMirrorDisplay') as Mesh;
    const glow = mirror.group.getObjectByName('SelfieMirrorGlow') as Mesh;
    const displayMaterial = display.material as MeshBasicMaterial;
    const pillar = mirror.group.getObjectByName('SelfieMirrorFrame') as Mesh;
    const pillarMaterial = pillar.material as MeshStandardMaterial;

    mirror.render(renderer, scene);

    expect(setRenderTarget).toHaveBeenNthCalledWith(1, mirror.renderTarget);
    expect(setRenderTarget).toHaveBeenNthCalledWith(2, null);
    expect(render).toHaveBeenCalledWith(scene, mirror.camera);
    expect(renderer.autoClear).toBe(false);
    expect(display.visible).toBe(true);
    expect(glow.visible).toBe(true);
    expect(displayMaterial.map).toBe(mirror.renderTarget.texture);
    expect(pillarMaterial).toBeInstanceOf(MeshStandardMaterial);

    mirror.dispose();
  });
});
