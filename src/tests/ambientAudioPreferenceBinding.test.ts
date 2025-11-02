import { describe, expect, it, vi } from 'vitest';

import {
  AmbientAudioPreference,
  bindAmbientAudioPreference,
} from '../systems/audio/ambientAudioPreference';

class FakeAmbientAudioController {
  enabled = false;

  readonly enableMock = vi.fn(async () => {
    this.enabled = true;
  });

  readonly disableMock = vi.fn(() => {
    this.enabled = false;
  });

  async enable(): Promise<void> {
    await this.enableMock();
    this.enabled = true;
  }

  disable(): void {
    this.disableMock();
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

describe('bindAmbientAudioPreference', () => {
  it('enables ambient audio after pointer interaction when preference is stored', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
      defaultEnabled: false,
    });
    const controller = new FakeAmbientAudioController();

    preference.setEnabled(true, 'storage');

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger: { warn: vi.fn() },
    });

    expect(controller.enableMock).not.toHaveBeenCalled();

    windowStub.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    expect(controller.enableMock).toHaveBeenCalledTimes(1);
    expect(controller.isEnabled()).toBe(true);

    binding.dispose();
  });

  it('retries on failure and logs a warning', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
      defaultEnabled: false,
    });
    const controller = new FakeAmbientAudioController();
    const logger = { warn: vi.fn() };

    preference.setEnabled(true, 'storage');

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger,
    });

    controller.enableMock.mockRejectedValueOnce(new Error('autoplay'));

    windowStub.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
    expect(controller.isEnabled()).toBe(false);

    windowStub.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() =>
      expect(controller.enableMock).toHaveBeenCalledTimes(2)
    );
    expect(controller.isEnabled()).toBe(true);

    binding.dispose();
  });

  it('ignores control-sourced changes because the UI already applied them', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
    });
    const controller = new FakeAmbientAudioController();

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger: { warn: vi.fn() },
    });

    await controller.enable();
    preference.setEnabled(true, 'control');

    windowStub.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    expect(controller.enableMock).toHaveBeenCalledTimes(1);

    preference.setEnabled(false, 'control');
    expect(controller.disableMock).not.toHaveBeenCalled();

    binding.dispose();
  });

  it('disables the controller when preference changes via storage', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
    });
    const controller = new FakeAmbientAudioController();

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger: { warn: vi.fn() },
    });

    preference.setEnabled(true, 'storage');
    await controller.enable();
    preference.setEnabled(false, 'storage');

    expect(controller.disableMock).toHaveBeenCalledTimes(1);

    binding.dispose();
  });

  it('supports keydown interactions without modifiers', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
    });
    const controller = new FakeAmbientAudioController();

    preference.setEnabled(true, 'storage');

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger: { warn: vi.fn() },
    });

    windowStub.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    await Promise.resolve();

    expect(controller.enableMock).toHaveBeenCalledTimes(1);

    binding.dispose();
  });

  it('cleans up gesture listeners on dispose', async () => {
    const windowStub = new EventTarget();
    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storage: null,
    });
    const controller = new FakeAmbientAudioController();

    preference.setEnabled(true, 'storage');

    const binding = bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: windowStub as unknown as Window,
      logger: { warn: vi.fn() },
    });

    binding.dispose();

    windowStub.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();

    expect(controller.enableMock).not.toHaveBeenCalled();
  });

  it('enables immediately when no window target is supplied', async () => {
    const preference = new AmbientAudioPreference({ storage: null });
    const controller = new FakeAmbientAudioController();

    preference.setEnabled(true, 'storage');

    bindAmbientAudioPreference({
      controller,
      preference,
      windowTarget: null,
      logger: { warn: vi.fn() },
    });

    await Promise.resolve();

    expect(controller.enableMock).toHaveBeenCalledTimes(1);
  });
});
