import { Group, Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AVATAR_LOADING_TIMEOUT_MS,
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
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
    presentation.dispose();
  });

  it('removes the marker on success without ever revealing the old body', () => {
    const { presentation } = setup();
    presentation.ready();
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS * 2);
    presentation.fail();
    expect(presentation.getSnapshot()).toEqual({
      presentation: 'ready',
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
        fallbackVisible: true,
        loadingMarkerVisible: false,
      });
      presentation.ready();
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

  it('disposes marker resources once and ignores late events', () => {
    const { player, presentation, changed } = setup();
    const marker = player.getObjectByName('AvatarLoadingMarker')!;
    const ring = marker.children[0] as Mesh;
    const disposeGeometry = vi.spyOn(ring.geometry, 'dispose');
    presentation.dispose();
    const calls = changed.mock.calls.length;
    presentation.dispose();
    presentation.begin();
    presentation.ready();
    presentation.fail();
    vi.advanceTimersByTime(AVATAR_LOADING_TIMEOUT_MS * 2);
    expect(changed).toHaveBeenCalledTimes(calls);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(marker.parent).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
