import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AVATAR_LOADING_TIMEOUT_MS,
  AVATAR_REVEAL_SECONDS,
  createAvatarLoadingPresentation,
} from '../scene/avatar/loadingPresentation';

describe('avatar loading presentation', () => {
  afterEach(() => vi.useRealTimers());
  const setup = () => {
    vi.useFakeTimers();
    const player = new Group();
    const fallback = new Group();
    player.add(fallback);
    const changed = vi.fn();
    const presentation = createAvatarLoadingPresentation(
      player,
      fallback,
      changed
    );
    return { player, fallback, changed, presentation };
  };

  it('immediately hides the old body and moves a static marker with the controller', () => {
    const { player, fallback, presentation } = setup();
    expect(fallback.visible).toBe(false);
    expect(player.visible).toBe(true);
    expect(player.getObjectByName('AvatarLoadingMarker')?.parent).toBe(player);
    player.position.set(3, 4, 5);
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS - 1);
    expect(presentation.getSnapshot()).toEqual({
      presentation: 'pending',
      revealProgress: 0,
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
    presentation.dispose();
  });

  it('removes the marker on success without ever revealing the old body', () => {
    const { presentation } = setup();
    presentation.ready(new Group(), true);
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS * 2);
    presentation.fail();
    expect(presentation.getSnapshot()).toEqual({
      presentation: 'ready',
      revealProgress: 1,
      fallbackVisible: false,
      loadingMarkerVisible: false,
    });
    presentation.dispose();
  });

  it.each(['error', 'timeout'])(
    'reveals a usable fallback on %s and allows late success',
    (failure) => {
      const { presentation, player } = setup();
      if (failure === 'error') presentation.fail();
      else vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS);
      expect(player.visible).toBe(true);
      expect(presentation.getSnapshot()).toEqual({
        presentation: 'fallback',
        revealProgress: 0,
        fallbackVisible: true,
        loadingMarkerVisible: false,
      });
      presentation.ready(new Group(), true);
      expect(presentation.getSnapshot().fallbackVisible).toBe(false);
      presentation.dispose();
    }
  );

  it('resets the loading deadline on retry', () => {
    const { presentation } = setup();
    vi.advanceTimersByTime(1000);
    presentation.fail();
    presentation.begin();
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS - 1);
    expect(presentation.getSnapshot().presentation).toBe('pending');
    vi.advanceTimersByTime(1);
    expect(presentation.getSnapshot().presentation).toBe('fallback');
    presentation.dispose();
  });

  it.each([false, true])(
    'crossfades at the moving player, fallback=%s',
    (failed) => {
      const { player, fallback, presentation } = setup();
      const original = new MeshBasicMaterial({ opacity: 0.8 });
      const model = new Mesh(new BoxGeometry(), original);
      const fallbackMaterial = new MeshBasicMaterial();
      fallback.add(new Mesh(new BoxGeometry(), fallbackMaterial));
      player.add(model);
      if (failed) presentation.fail();
      presentation.ready(model);
      expect(original.opacity).toBe(0);
      expect(presentation.getSnapshot().presentation).toBe('revealing');
      player.position.set(3, 0, 5);
      player.rotation.y = Math.PI / 2;
      presentation.update(AVATAR_REVEAL_SECONDS / 2);
      expect(model.getWorldPosition(new Vector3()).toArray()).toEqual([
        3, 0, 5,
      ]);
      expect(original.opacity).toBeCloseTo(0.4);
      expect(original.depthWrite).toBe(false);
      if (failed) expect(fallbackMaterial.opacity).toBeCloseTo(0.5);
      expect(fallback.visible).toBe(failed);
      presentation.fail();
      presentation.begin();
      expect(presentation.getSnapshot().presentation).toBe('revealing');
      presentation.update(AVATAR_REVEAL_SECONDS / 2);
      expect(presentation.getSnapshot().presentation).toBe('ready');
      expect(original.opacity).toBe(0.8);
      expect(original.transparent).toBe(false);
      expect(original.depthWrite).toBe(true);
      expect(fallbackMaterial.opacity).toBe(1);
      expect(fallback.visible).toBe(false);
      presentation.dispose();
    }
  );

  it('does not collapse the reveal into one frame after a long GPU preparation stall', () => {
    const { presentation } = setup();
    presentation.ready(new Group());
    presentation.update(3);
    expect(presentation.getSnapshot().presentation).toBe('revealing');
    expect(presentation.getSnapshot().revealProgress).toBe(0.5);
    presentation.dispose();
  });

  it.each(['reduce', 'dispose'])(
    'restores materials when interrupted by %s',
    (action) => {
      const { player, presentation } = setup();
      const material = new MeshBasicMaterial({
        opacity: 0.7,
        transparent: true,
        depthWrite: false,
      });
      const model = new Mesh(new BoxGeometry(), [material, material]);
      player.add(model);
      presentation.ready(model);
      presentation.update(0.1);
      expect(material.opacity).toBeLessThan(0.7);
      if (action === 'reduce') presentation.update(0, true);
      else presentation.dispose();
      expect(material.opacity).toBe(0.7);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      presentation.dispose();
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it('disposes marker resources once and ignores late events', () => {
    const { player, presentation, changed } = setup();
    const marker = player.getObjectByName('AvatarLoadingMarker')!;
    const ring = marker.children[0] as Mesh;
    const disposeGeometry = vi.spyOn(ring.geometry, 'dispose');
    presentation.dispose();
    const calls = changed.mock.calls.length;
    presentation.dispose();
    presentation.begin();
    presentation.ready(new Group(), true);
    presentation.fail();
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS * 2);
    expect(changed).toHaveBeenCalledTimes(calls);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(marker.parent).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
