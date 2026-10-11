import {
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  type Object3D,
} from 'three';

export const AVATAR_LOADING_TIMEOUT_MS = 15_000;

/** Keep the controller visible without presenting an obsolete body during normal loading. */
export function createAvatarLoadingPresentation(
  player: Object3D,
  fallback: Object3D,
  onChange: () => void = () => {}
) {
  const marker = new Group();
  marker.name = 'AvatarLoadingMarker';
  const material = new MeshBasicMaterial({
    color: '#57d7ff',
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
  let state: 'pending' | 'ready' | 'fallback' | 'disposed' = 'pending';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const setState = (next: typeof state) => {
    state = next;
    fallback.visible = next === 'fallback';
    marker.visible = next === 'pending';
    onChange();
  };
  const fail = () => {
    if (state !== 'pending') return;
    clearTimeout(timer);
    setState('fallback');
  };
  const begin = () => {
    if (state === 'disposed' || state === 'ready') return;
    clearTimeout(timer);
    setState('pending');
    timer = setTimeout(fail, AVATAR_LOADING_TIMEOUT_MS);
  };
  begin();
  return {
    begin,
    fail,
    ready() {
      if (state === 'disposed') return;
      clearTimeout(timer);
      setState('ready');
    },
    getSnapshot: () => ({
      presentation: state,
      fallbackVisible: fallback.visible,
      loadingMarkerVisible: marker.visible,
    }),
    dispose() {
      if (state === 'disposed') return;
      clearTimeout(timer);
      setState('disposed');
      marker.removeFromParent();
      ring.geometry.dispose();
      pointer.geometry.dispose();
      material.dispose();
    },
  };
}
