import { describe, expect, it, vi } from 'vitest';

import { createAdaptiveQualityController } from '../systems/performance/adaptiveQuality';

describe('adaptive quality controller', () => {
  it('downgrades quality before escalating feature cuts', () => {
    let now = 0;
    const setLevel = vi.fn();
    const controller = createAdaptiveQualityController({
      initialLevel: 'cinematic',
      cooldownMs: 0,
      now: () => now,
      onSetQualityLevel: setLevel,
    });

    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(setLevel).toHaveBeenLastCalledWith('balanced', 'sustained-low-fps');
    now += 1;
    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(setLevel).toHaveBeenLastCalledWith(
      'performance',
      'sustained-low-fps'
    );
    now += 1;
    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(controller.getState().forceLowDpr).toBe(true);
    now += 1;
    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(controller.getState()).toMatchObject({
      disableBloom: true,
      disableComposer: true,
    });
  });

  it('uses a cooldown to avoid flapping downgrade events', () => {
    let now = 1000;
    const controller = createAdaptiveQualityController({
      initialLevel: 'balanced',
      cooldownMs: 5000,
      now: () => now,
    });

    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(controller.forceDowngrade('sustained-low-fps')).toBe(false);
    now += 5000;
    expect(controller.forceDowngrade('sustained-low-fps')).toBe(true);
    expect(controller.getState().downgradeCount).toBe(2);
  });

  it('records sustained low FPS before downgrading', () => {
    let now = 0;
    const controller = createAdaptiveQualityController({
      initialLevel: 'balanced',
      sustainedDurationMs: 1000,
      cooldownMs: 0,
      now: () => now,
    });

    expect(controller.recordFrame(0.1)).toBe(false);
    now += 100;
    expect(controller.recordFrame(0.9)).toBe(true);
    expect(controller.getState().lastDowngradeReason).toBe('sustained-low-fps');
  });
});
