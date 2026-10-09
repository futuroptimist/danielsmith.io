import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Texture,
  type WebGLRenderer,
} from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareAvatarRendering } from '../scene/avatar/prepareRendering';

function fixture() {
  let ready = false;
  const programs: Array<{ program: object }> = [];
  const query = vi.fn(() => ready);
  const renderer = {
    info: { programs },
    compile: vi.fn(() => {
      programs.push({ program: {} });
    }),
    initTexture: vi.fn(),
    extensions: {
      has: () => true,
      get: () => ({ COMPLETION_STATUS_KHR: 0x91b1 }),
    },
    getContext: () => ({ getProgramParameter: query }),
  };
  const model = new Group();
  const material = new MeshStandardMaterial({ map: new Texture() });
  model.add(
    new Mesh(new BoxGeometry(), material),
    new Mesh(new BoxGeometry(), material)
  );
  const controller = new AbortController();
  return {
    renderer,
    query,
    controller,
    ready: () => {
      ready = true;
    },
    start: () =>
      prepareAvatarRendering(
        renderer as unknown as WebGLRenderer,
        model,
        new PerspectiveCamera(),
        new Scene(),
        controller.signal
      ),
  };
}

describe('avatar GPU preparation lifecycle', () => {
  beforeEach(() =>
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  );
  afterEach(() => vi.useRealTimers());
  it('waits for parallel compilation and uploads a shared atlas only once', async () => {
    const f = fixture();
    const result = f.start();
    expect(f.renderer.initTexture).toHaveBeenCalledTimes(1);
    expect(f.query).toHaveBeenCalledTimes(1);
    f.ready();
    await vi.advanceTimersByTimeAsync(10);
    expect(await result).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels without querying the context after scene disposal', async () => {
    const f = fixture();
    const result = f.start();
    f.controller.abort();
    f.query.mockImplementation(() => {
      throw new Error('Disposed WebGL context');
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toBe(false);
    expect(f.query).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does no GPU work when the load was already cancelled', async () => {
    const f = fixture();
    f.controller.abort();
    expect(await f.start()).toBe(false);
    expect(f.renderer.compile).not.toHaveBeenCalled();
  });
  it('bounds a driver that never finishes and cleans up its polling', async () => {
    const f = fixture();
    const rejected = expect(f.start()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
});
