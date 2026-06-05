import { describe, expect, it, vi } from 'vitest';

import type { LivingRoomMediaWallController } from '../scene/structures/mediaWall';
import { createMediaWallStarBridge } from '../scene/structures/mediaWallStarBridge';

describe('createMediaWallStarBridge', () => {
  const createController = () => {
    const controller: LivingRoomMediaWallController = {
      update: vi.fn(),
      setStarCount: vi.fn(),
      dispose: vi.fn(),
    };
    return controller;
  };

  it('applies a neutral initial state when attaching a controller', () => {
    const bridge = createMediaWallStarBridge();
    const controller = createController();

    bridge.attach(controller);

    expect(controller.setStarCount).toHaveBeenCalledTimes(1);
    expect(controller.setStarCount).toHaveBeenCalledWith(null);
    expect(bridge.getStarCount()).toBeNull();
  });

  it('updates the controller when live star counts arrive', () => {
    const bridge = createMediaWallStarBridge();
    const controller = createController();
    bridge.attach(controller);

    bridge.updateStarCount(1536.4);

    expect(controller.setStarCount).toHaveBeenLastCalledWith(1536);
    expect(bridge.getStarCount()).toBe(1536);
  });

  it('retains the latest star count across detaches and reattaches', () => {
    const bridge = createMediaWallStarBridge(1000);
    const firstController = createController();
    bridge.attach(firstController);

    bridge.updateStarCount(2048);
    expect(bridge.getStarCount()).toBe(2048);

    bridge.detach();
    bridge.updateStarCount(4096);

    const secondController = createController();
    bridge.attach(secondController);

    expect(secondController.setStarCount).toHaveBeenCalledWith(4096);
    expect(firstController.setStarCount).toHaveBeenCalledTimes(2);
  });

  it('sanitizes invalid star counts to a neutral state', () => {
    const bridge = createMediaWallStarBridge();
    const controller = createController();
    bridge.attach(controller);

    bridge.updateStarCount(Number.NaN);
    expect(bridge.getStarCount()).toBeNull();
    expect(controller.setStarCount).toHaveBeenLastCalledWith(null);

    bridge.updateStarCount(-42);
    expect(bridge.getStarCount()).toBeNull();
    expect(controller.setStarCount).toHaveBeenLastCalledWith(null);
  });
});
