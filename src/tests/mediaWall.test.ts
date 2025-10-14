import { beforeAll, describe, expect, it } from 'vitest';

import { createLivingRoomMediaWall } from '../scene/structures/mediaWall';

describe('createLivingRoomMediaWall', () => {
  beforeAll(() => {
    const noop = () => {};
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(type: string) {
        if (type !== '2d') {
          return null;
        }
        return {
          save: noop,
          restore: noop,
          clearRect: noop,
          beginPath: noop,
          fillRect: noop,
          strokeRect: noop,
          arc: noop,
          closePath: noop,
          fill: noop,
          stroke: noop,
          moveTo: noop,
          lineTo: noop,
          createLinearGradient: () => ({
            addColorStop: noop,
          }),
          quadraticCurveTo: noop,
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 0,
          textAlign: 'left',
          textBaseline: 'alphabetic',
          font: '',
          globalAlpha: 1,
          fillText: noop,
        } as unknown as CanvasRenderingContext2D;
      },
    });
  });
  it('includes a TV screen with YouTube text and exposes POI bindings', () => {
    const bounds = { minX: -16, maxX: 16, minZ: -16, maxZ: -4 };
    const build = createLivingRoomMediaWall(bounds);

    // Screen mesh should be present and named predictably
    const screen = build.group.getObjectByName('LivingRoomMediaWallScreen');
    expect(screen).toBeTruthy();

    // Badge should exist as well
    const badge = build.group.getObjectByName('LivingRoomMediaWallBadge');
    expect(badge).toBeTruthy();

    // POI bindings should expose screen and glow for interaction/visuals
    expect(build.poiBindings.futuroptimistTv.screen).toBeTruthy();
    expect(build.poiBindings.futuroptimistTv.glow).toBeTruthy();
  });
});
