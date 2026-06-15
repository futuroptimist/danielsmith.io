import { describe, expect, it, vi } from 'vitest';

import { LowFpsRecoveryMonitor } from '../scene/performance/lowFpsRecoveryMonitor';

function feed(monitor: LowFpsRecoveryMonitor, fps: number, seconds: number) {
  const delta = 1 / fps;
  const frames = Math.ceil(seconds * fps);
  for (let frame = 0; frame <= frames; frame += 1) {
    monitor.recordFrame(delta, frame * delta * 1000);
  }
}

describe('LowFpsRecoveryMonitor', () => {
  it('does not trigger before a full ten second window', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 4, 9.75);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('triggers after averaged FPS stays below five for at least ten seconds', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 4, 10.25);

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger.mock.calls[0]?.[0]).toMatchObject({ frameCount: 41 });
    expect(onTrigger.mock.calls[0]?.[0].averageFps).toBeLessThan(5);
  });

  it('does not trigger when averaged FPS is five or higher', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 5, 12);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('suppresses repeated popups during cooldown', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 4, 10.25);
    monitor.dismiss(10_250);
    feed(monitor, 4, 10.25);

    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(monitor.getState(20_000).cooldownRemainingMs).toBeGreaterThan(0);
  });

  it('can trigger again after cooldown when low FPS is observed again', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 4, 10.25);
    monitor.dismiss(10_250);
    for (let frame = 0; frame <= 41; frame += 1) {
      monitor.recordFrame(0.25, 40_500 + frame * 250);
    }

    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it('resets sampling and visibility when immersive mode exits', () => {
    const onTrigger = vi.fn();
    const monitor = new LowFpsRecoveryMonitor({ onTrigger });

    feed(monitor, 4, 10.25);
    monitor.reset();

    expect(monitor.getState().visible).toBe(false);
    expect(monitor.getState().frameCount).toBe(0);
  });
});
