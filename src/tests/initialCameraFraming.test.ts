import { describe, expect, it } from 'vitest';

import { PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT } from '../scene/avatar/mannequin';
import {
  INITIAL_AVATAR_VIEWPORT_HEIGHT_RATIO,
  resolveInitialAvatarCameraFraming,
} from '../scene/camera/initialFraming';

const CAMERA_WORLD_UP_Y = 0.8164965809277261;
const MIN_CAMERA_ZOOM = 0.65;
const MAX_CAMERA_ZOOM = 12;

function resolveFramingForViewport() {
  return resolveInitialAvatarCameraFraming({
    avatarHeight: PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
    baseCameraSize: 53.1,
    cameraWorldUpY: CAMERA_WORLD_UP_Y,
    minZoom: MIN_CAMERA_ZOOM,
    maxZoom: MAX_CAMERA_ZOOM,
    targetViewportHeightRatio: INITIAL_AVATAR_VIEWPORT_HEIGHT_RATIO,
  });
}

describe('resolveInitialAvatarCameraFraming', () => {
  it('targets half-height avatar framing before clamping when limits allow it', () => {
    const framing = resolveInitialAvatarCameraFraming({
      avatarHeight: PORTFOLIO_MANNEQUIN_VISUAL_HEIGHT,
      baseCameraSize: 8,
      cameraWorldUpY: CAMERA_WORLD_UP_Y,
      minZoom: MIN_CAMERA_ZOOM,
      maxZoom: MAX_CAMERA_ZOOM,
    });

    expect(framing.zoom).toBeCloseTo(framing.unclampedZoom, 6);
    expect(framing.effectiveViewportHeightRatio).toBeCloseTo(0.5, 6);
  });

  it('uses the same deterministic clamped initial zoom on desktop and iPhone SE viewports', () => {
    const desktopViewport = { width: 1280, height: 720 };
    const iphoneSeViewport = { width: 320, height: 568 };
    const desktop = resolveFramingForViewport();
    const iphoneSe = resolveFramingForViewport();

    expect(desktopViewport.height).toBeGreaterThan(iphoneSeViewport.height);

    expect(desktop.zoom).toBe(MAX_CAMERA_ZOOM);
    expect(iphoneSe.zoom).toBe(MAX_CAMERA_ZOOM);
    expect(desktop.unclampedZoom).toBeGreaterThan(MAX_CAMERA_ZOOM);
    expect(iphoneSe.unclampedZoom).toBeCloseTo(desktop.unclampedZoom, 6);
    expect(iphoneSe.effectiveViewportHeightRatio).toBeCloseTo(
      desktop.effectiveViewportHeightRatio,
      6
    );
  });
});
