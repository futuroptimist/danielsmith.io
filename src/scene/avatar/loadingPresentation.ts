import {
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Object3D,
  type Material,
} from 'three';

export const AVATAR_LOADING_TIMEOUT_MS = 15_000;
export const AVATAR_REVEAL_SECONDS = 0.45;
const MARKER_BASE_OPACITY = 0.55;

/** These materials belong to the player. Restore every flag when the handoff ends. */
function fadeBody(bodies: Object3D[]) {
  const materials = new Map<
    Material,
    { opacity: number; transparent: boolean; depthWrite: boolean }
  >();
  bodies.forEach((body) =>
    body.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (materials.has(material)) continue;
        materials.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
        material.transparent = true;
        material.depthWrite = false;
        material.needsUpdate = true;
      }
    })
  );
  return {
    set(progress: number) {
      materials.forEach((original, material) => {
        material.opacity = original.opacity * progress;
      });
    },
    restore() {
      materials.forEach((original, material) => {
        Object.assign(material, original);
        material.needsUpdate = true;
      });
    },
  };
}

/** Keep the controller visible without presenting an obsolete body during normal loading. */
export function createAvatarLoadingPresentation(
  player: Object3D,
  fallback: Object3D,
  onChange: () => void = () => {}
) {
  const marker = new Group();
  marker.name = 'AvatarLoadingMarker';
  const material = new MeshBasicMaterial({
    color: '#aab8bd',
    transparent: true,
    opacity: MARKER_BASE_OPACITY,
    depthWrite: false,
    depthTest: false,
  });
  const ring = new Mesh(new RingGeometry(0.34, 0.43, 24), material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  const pointer = new Mesh(new ConeGeometry(0.13, 0.3, 3), material);
  pointer.rotation.x = Math.PI / 2;
  pointer.position.set(0, 0.09, 0.5);
  marker.add(ring, pointer);
  marker.traverse((object) => {
    object.renderOrder = 10;
  });
  player.add(marker);
  let state: 'pending' | 'revealing' | 'ready' | 'fallback' | 'disposed' =
    'pending';
  let revealProgress = 0;
  let incoming: ReturnType<typeof fadeBody> | undefined;
  let outgoing: ReturnType<typeof fadeBody> | undefined;
  const finishReveal = () => {
    incoming?.restore();
    outgoing?.restore();
    incoming = outgoing = undefined;
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const setState = (next: typeof state, requestRender = true) => {
    state = next;
    fallback.visible = next === 'fallback';
    marker.visible = next === 'pending';
    if (requestRender) onChange();
  };
  const fail = () => {
    if (state !== 'pending') return;
    clearTimeout(timer);
    setState('fallback');
  };
  const begin = () => {
    if (state === 'disposed' || state === 'ready' || state === 'revealing')
      return;
    clearTimeout(timer);
    revealProgress = 0;
    material.opacity = MARKER_BASE_OPACITY;
    setState('pending');
    timer = setTimeout(fail, AVATAR_LOADING_TIMEOUT_MS);
  };
  begin();
  return {
    begin,
    fail,
    ready(model: Object3D, reducedMotion = false, companions: Object3D[] = []) {
      if (state === 'disposed' || state === 'ready' || state === 'revealing')
        return;
      clearTimeout(timer);
      if (reducedMotion) {
        revealProgress = 1;
        setState('ready');
        return;
      }
      incoming = fadeBody([model, ...companions]);
      incoming.set(0);
      if (fallback.visible) outgoing = fadeBody([fallback]);
      state = 'revealing';
      onChange();
    },
    update(delta: number, reducedMotion = false) {
      if (state !== 'revealing') return;
      revealProgress = reducedMotion
        ? 1
        : Math.min(
            1,
            revealProgress +
              Math.min(AVATAR_REVEAL_SECONDS / 2, Math.max(0, delta)) /
                AVATAR_REVEAL_SECONDS
          );
      // Smooth opacity only: no scale, position, camera, or gait changes.
      const opacity =
        revealProgress * revealProgress * (3 - 2 * revealProgress);
      incoming?.set(opacity);
      outgoing?.set(1 - opacity);
      material.opacity = MARKER_BASE_OPACITY * (1 - opacity);
      if (revealProgress === 1) {
        finishReveal();
        // This update already runs inside a render frame; do not bypass safe-mode cadence.
        setState('ready', false);
      }
    },
    getSnapshot: () => ({
      presentation: state,
      revealProgress,
      fallbackVisible: fallback.visible,
      loadingMarkerVisible: marker.visible,
    }),
    dispose() {
      if (state === 'disposed') return;
      clearTimeout(timer);
      finishReveal();
      setState('disposed');
      marker.removeFromParent();
      ring.geometry.dispose();
      pointer.geometry.dispose();
      material.dispose();
    },
  };
}
