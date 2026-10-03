import type { MeshStandardMaterial } from 'three';

export const BASEMENT_LANDING_WALL_OPACITY = 0.8;

/** Own only this wall segment's material; the shared wall and collider stay intact. */
export function createBasementLandingCutaway(source: MeshStandardMaterial) {
  const material = source.clone();
  const original = {
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
  };
  let active = false;
  let disposed = false;
  return {
    material,
    setActive(next: boolean) {
      if (disposed || next === active) return;
      active = next;
      material.opacity = active
        ? BASEMENT_LANDING_WALL_OPACITY
        : original.opacity;
      material.transparent = active || original.transparent;
      material.depthWrite = active ? false : original.depthWrite;
      material.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      material.dispose();
    },
  };
}
