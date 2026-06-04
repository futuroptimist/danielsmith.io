import { describe, expect, it, vi } from 'vitest';

import { createGlobalAudioController } from '../systems/audio/globalAudioController';

const createRuntime = () => {
  let ambientEnabled = false;
  let preferenceEnabled = false;
  let footstepEnabled = true;
  const runtime = {
    ambient: {
      enable: vi.fn(async () => {
        ambientEnabled = true;
      }),
      disable: vi.fn(() => {
        ambientEnabled = false;
      }),
      isEnabled: vi.fn(() => ambientEnabled),
    },
    preference: {
      isEnabled: vi.fn(() => preferenceEnabled),
      setEnabled: vi.fn((enabled: boolean) => {
        preferenceEnabled = enabled;
      }),
    },
    footstep: {
      setEnabled: vi.fn((enabled: boolean) => {
        footstepEnabled = enabled;
      }),
      isEnabled: vi.fn(() => footstepEnabled),
    },
    stopFootstep: vi.fn(),
    subtitles: { clear: vi.fn() },
    hud: { refresh: vi.fn() },
  };
  return runtime;
};

describe('global audio controller', () => {
  it('enables ambient and footsteps through one persisted path', async () => {
    const runtime = createRuntime();
    const controller = createGlobalAudioController(runtime);

    await controller.enable();

    expect(runtime.ambient.enable).toHaveBeenCalledTimes(1);
    expect(runtime.footstep.setEnabled).toHaveBeenCalledWith(true);
    expect(runtime.preference.setEnabled).toHaveBeenCalledWith(true, 'control');
    expect(runtime.hud.refresh).toHaveBeenCalled();
    expect(controller.isEnabled()).toBe(true);
  });

  it('hard-disables every runtime audio source and persists off', async () => {
    const runtime = createRuntime();
    const controller = createGlobalAudioController(runtime);

    await controller.enable();
    controller.disable();

    expect(runtime.ambient.disable).toHaveBeenCalledTimes(1);
    expect(runtime.footstep.setEnabled).toHaveBeenLastCalledWith(false);
    expect(runtime.stopFootstep).toHaveBeenCalledTimes(1);
    expect(runtime.subtitles.clear).toHaveBeenCalledTimes(1);
    expect(runtime.preference.setEnabled).toHaveBeenLastCalledWith(
      false,
      'control'
    );
    expect(controller.isEnabled()).toBe(false);
  });

  it('can silence runtime sources without overwriting explicit opt-in', async () => {
    const runtime = createRuntime();
    const controller = createGlobalAudioController(runtime);

    await controller.enable();
    runtime.preference.setEnabled.mockClear();
    controller.disable({ persist: false });

    expect(runtime.ambient.disable).toHaveBeenCalledTimes(1);
    expect(runtime.footstep.setEnabled).toHaveBeenLastCalledWith(false);
    expect(runtime.stopFootstep).toHaveBeenCalledTimes(1);
    expect(runtime.preference.setEnabled).not.toHaveBeenCalled();
  });

  it('does not leave UI enabled when ambient startup fails', async () => {
    const runtime = createRuntime();
    runtime.ambient.enable.mockRejectedValueOnce(new Error('autoplay'));
    const controller = createGlobalAudioController(runtime);

    await expect(controller.enable()).rejects.toThrow('autoplay');

    expect(runtime.ambient.disable).toHaveBeenCalledTimes(1);
    expect(runtime.footstep.setEnabled).toHaveBeenCalledWith(false);
    expect(runtime.stopFootstep).toHaveBeenCalledTimes(1);
    expect(runtime.preference.setEnabled).not.toHaveBeenCalledWith(
      true,
      'control'
    );
    expect(runtime.hud.refresh).toHaveBeenCalled();
    expect(controller.isEnabled()).toBe(false);
  });
});
