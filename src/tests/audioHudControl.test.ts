import { describe, expect, it, vi } from 'vitest';

import { formatMessage, getAudioHudControlStrings } from '../assets/i18n';
import { createAudioHudControl } from '../systems/controls/audioHudControl';

const resolveKeyHint = (
  strings: ReturnType<typeof getAudioHudControlStrings>,
  toggleKey = 'm'
) => {
  const normalize = (value: string | undefined) => {
    if (!value) {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.length === 1 ? trimmed.toUpperCase() : trimmed;
  };
  return normalize(toggleKey) || normalize(strings.keyHint) || 'M';
};

describe('createAudioHudControl', () => {
  it('renders controls, syncs state, and handles async toggles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let enabled = false;
    let volume = 0.6;
    let toggleCallCount = 0;
    let resolveToggle: (() => void) | undefined;

    const handle = createAudioHudControl({
      container,
      getEnabled: () => enabled,
      setEnabled: (next) => {
        enabled = next;
        toggleCallCount += 1;
        return new Promise<void>((resolve) => {
          resolveToggle = () => resolve();
        });
      },
      getVolume: () => volume,
      setVolume: (value) => {
        volume = value;
      },
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button.audio-toggle'
    );
    const slider = container.querySelector<HTMLInputElement>(
      '.audio-volume__slider'
    );
    const valueText = container.querySelector('.audio-volume__value');
    const wrapper = container.querySelector<HTMLDivElement>('.audio-hud');
    const label = container.querySelector('.audio-volume__label');
    const labelElement =
      container.querySelector<HTMLLabelElement>('label.audio-volume');
    const strings = getAudioHudControlStrings();
    const keyHint = resolveKeyHint(strings);
    const formatMutedAnnouncement = (volume: string) =>
      formatMessage(strings.slider.mutedAnnouncementTemplate, { volume });
    const formatMutedValue = (volume: string) =>
      formatMessage(strings.slider.mutedValueTemplate, { volume });
    const formatMutedAria = (volume: string) =>
      formatMessage(strings.slider.mutedAriaValueTemplate, { volume });
    const formatVolumeAnnouncement = (volume: string) =>
      formatMessage(strings.slider.valueAnnouncementTemplate, { volume });
    const formatPendingAnnouncement = () =>
      formatMessage(strings.toggle.pendingAnnouncementTemplate, { keyHint });

    expect(button).toBeTruthy();
    expect(slider).toBeTruthy();
    expect(labelElement?.htmlFor).toBe(slider?.id ?? null);
    expect(slider?.id).toMatch(/^audio-volume-slider-\d+$/);
    expect(wrapper?.getAttribute('aria-label')).toBe(strings.groupLabel);
    expect(wrapper?.getAttribute('aria-busy')).toBe('false');
    expect(wrapper?.getAttribute('aria-disabled')).toBeNull();
    expect(button?.getAttribute('aria-busy')).toBe('false');
    expect(button?.getAttribute('aria-disabled')).toBeNull();
    expect(label?.textContent).toBe(strings.slider.label);
    expect(button?.title).toBe(
      formatMessage(strings.toggle.titleTemplate, { keyHint })
    );
    expect(valueText?.textContent).toBe(formatMutedValue('60%'));
    expect(slider?.getAttribute('aria-valuemin')).toBe('0');
    expect(slider?.getAttribute('aria-valuemax')).toBe('1');
    expect(slider?.getAttribute('aria-valuetext')).toBe(formatMutedAria('60%'));
    expect(slider?.getAttribute('aria-describedby')).toBe(
      valueText?.id ?? null
    );
    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(strings.toggle.announcementOffTemplate, { keyHint })
    );
    expect(slider?.dataset.hudAnnounce).toBe(formatMutedAnnouncement('60%'));

    button?.dispatchEvent(new Event('click'));
    expect(toggleCallCount).toBe(1);
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(wrapper?.getAttribute('aria-busy')).toBe('true');
    expect(wrapper?.getAttribute('aria-disabled')).toBe('true');
    expect(slider?.disabled).toBe(true);
    expect(slider?.getAttribute('aria-busy')).toBe('true');
    expect(slider?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.dataset.hudAnnounce).toBe(formatPendingAnnouncement());
    expect(slider?.dataset.hudAnnounce).toBe(formatPendingAnnouncement());

    // Second click while pending should be ignored.
    button?.dispatchEvent(new Event('click'));
    expect(toggleCallCount).toBe(1);

    resolveToggle?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(button?.disabled).toBe(false);
    expect(button?.dataset.state).toBe('on');
    expect(button?.getAttribute('aria-busy')).toBe('false');
    expect(button?.getAttribute('aria-disabled')).toBeNull();
    expect(wrapper?.getAttribute('aria-busy')).toBe('false');
    expect(wrapper?.getAttribute('aria-disabled')).toBeNull();
    expect(slider?.disabled).toBe(false);
    expect(slider?.getAttribute('aria-busy')).toBe('false');
    expect(slider?.getAttribute('aria-disabled')).toBeNull();
    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(strings.toggle.announcementOnTemplate, { keyHint })
    );
    expect(valueText?.textContent).toBe('60%');
    expect(slider?.getAttribute('aria-valuetext')).toBe('60%');
    expect(slider?.dataset.hudAnnounce).toBe(formatVolumeAnnouncement('60%'));

    slider!.value = '0.82';
    slider?.dispatchEvent(new Event('input'));
    expect(volume).toBeCloseTo(0.82, 5);
    expect(valueText?.textContent).toBe('82%');
    expect(slider?.dataset.hudAnnounce).toBe(formatVolumeAnnouncement('82%'));

    volume = 0.25;
    enabled = false;
    handle.refresh();
    expect(button?.dataset.state).toBe('off');
    expect(valueText?.textContent).toBe(formatMutedValue('25%'));
    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(strings.toggle.announcementOffTemplate, { keyHint })
    );
    expect(slider?.getAttribute('aria-valuetext')).toBe(formatMutedAria('25%'));
    expect(slider?.dataset.hudAnnounce).toBe(formatMutedAnnouncement('25%'));

    slider!.value = '1.6';
    slider?.dispatchEvent(new Event('input'));
    expect(volume).toBe(1);
    expect(valueText?.textContent).toBe(formatMutedValue('100%'));
    expect(slider?.dataset.hudAnnounce).toBe(formatMutedAnnouncement('100%'));

    handle.dispose();
    expect(container.querySelector('.audio-hud')).toBeNull();
  });

  it('handles pending async volume updates with announcements and error recovery', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const enabled = true;
    let volume = 0.4;
    let resolveVolume: (() => void) | null = null;
    let rejectNext = false;
    let throwNext = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = createAudioHudControl({
      container,
      getEnabled: () => enabled,
      setEnabled: () => undefined,
      getVolume: () => volume,
      setVolume: (value) => {
        if (throwNext) {
          throwNext = false;
          throw new Error('volume-throw');
        }
        return new Promise<void>((resolve, reject) => {
          resolveVolume = () => {
            if (rejectNext) {
              rejectNext = false;
              reject(new Error('volume-fail'));
              return;
            }
            volume = value;
            resolve();
          };
        });
      },
    });

    const wrapper = container.querySelector<HTMLDivElement>('.audio-hud');
    const slider = container.querySelector<HTMLInputElement>(
      '.audio-volume__slider'
    );
    const button = container.querySelector<HTMLButtonElement>(
      'button.audio-toggle'
    );
    const strings = getAudioHudControlStrings();
    const keyHint = resolveKeyHint(strings);
    const pendingAnnouncement = formatMessage(
      strings.toggle.pendingAnnouncementTemplate,
      { keyHint }
    );

    expect(slider?.disabled).toBe(false);
    slider!.value = '0.75';
    slider?.dispatchEvent(new Event('input'));
    expect(slider?.disabled).toBe(true);
    expect(slider?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(wrapper?.dataset.pending).toBe('true');
    expect(wrapper?.getAttribute('aria-disabled')).toBe('true');
    expect(slider?.dataset.hudAnnounce).toBe(pendingAnnouncement);
    expect(button?.dataset.hudAnnounce).toBe(pendingAnnouncement);

    resolveVolume?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper?.dataset.pending).toBe('false');
    expect(slider?.disabled).toBe(false);
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute('aria-busy')).toBe('false');
    expect(button?.getAttribute('aria-disabled')).toBeNull();
    expect(wrapper?.getAttribute('aria-disabled')).toBeNull();
    expect(slider?.getAttribute('aria-disabled')).toBeNull();
    expect(slider?.value).toBe('0.75');
    expect(slider?.dataset.hudAnnounce).toBe(
      formatMessage(strings.slider.valueAnnouncementTemplate, { volume: '75%' })
    );

    rejectNext = true;
    slider!.value = '0.25';
    slider?.dispatchEvent(new Event('input'));
    expect(wrapper?.dataset.pending).toBe('true');
    resolveVolume?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to set ambient audio volume:',
      expect.any(Error)
    );
    expect(wrapper?.dataset.pending).toBe('false');
    expect(slider?.value).toBe('0.75');
    expect(slider?.dataset.hudAnnounce).toBe(
      formatMessage(strings.slider.valueAnnouncementTemplate, { volume: '75%' })
    );

    warnSpy.mockClear();
    throwNext = true;
    slider!.value = '0.5';
    slider?.dispatchEvent(new Event('input'));
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to set ambient audio volume:',
      expect.any(Error)
    );
    expect(wrapper?.dataset.pending).toBe('false');
    expect(slider?.value).toBe('0.75');
    expect(slider?.dataset.hudAnnounce).toBe(
      formatMessage(strings.slider.valueAnnouncementTemplate, { volume: '75%' })
    );
    expect(slider?.disabled).toBe(false);
    expect(slider?.getAttribute('aria-disabled')).toBeNull();

    handle.dispose();

    warnSpy.mockRestore();
  });

  it('responds to keyboard toggles and recovers from failures', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let enabled = true;
    let rejected = false;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = createAudioHudControl({
      container,
      getEnabled: () => enabled,
      setEnabled: () => {
        enabled = !enabled;
        if (!rejected) {
          rejected = true;
          return Promise.reject(new Error('fail'));
        }
        return undefined;
      },
      getVolume: () => 0.4,
      setVolume: vi.fn(),
      toggleKey: 'm',
    });

    const strings = getAudioHudControlStrings();
    const keyHint = resolveKeyHint(strings, 'm');

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'm', ctrlKey: true })
    );
    expect(warnSpy).not.toHaveBeenCalled();

    const event = new KeyboardEvent('keydown', { key: 'M' });
    window.dispatchEvent(event);
    await Promise.resolve();
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to toggle ambient audio:',
      expect.any(Error)
    );
    const button = container.querySelector<HTMLButtonElement>(
      'button.audio-toggle'
    );
    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(strings.toggle.announcementOffTemplate, { keyHint })
    );
    const volumeSlider = container.querySelector<HTMLInputElement>(
      '.audio-volume__slider'
    );
    expect(volumeSlider?.dataset.hudAnnounce).toBe(
      formatMessage(strings.slider.mutedAnnouncementTemplate, {
        volume: '40%',
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(warnSpy).toHaveBeenCalledTimes(1);

    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(strings.toggle.announcementOnTemplate, { keyHint })
    );
    expect(volumeSlider?.dataset.hudAnnounce).toBe(
      formatMessage(strings.slider.valueAnnouncementTemplate, {
        volume: '40%',
      })
    );

    handle.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('updates localized strings when setStrings is invoked', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createAudioHudControl({
      container,
      getEnabled: () => false,
      setEnabled: vi.fn(),
      getVolume: () => 0.6,
      setVolume: vi.fn(),
      strings: getAudioHudControlStrings('en'),
    });

    const button = container.querySelector<HTMLButtonElement>('.audio-toggle');
    const slider = container.querySelector<HTMLInputElement>(
      '.audio-volume__slider'
    );
    const label = container.querySelector('.audio-volume__label');
    const labelElement =
      container.querySelector<HTMLLabelElement>('label.audio-volume');
    const wrapper = container.querySelector('.audio-hud');
    const valueText = container.querySelector('.audio-volume__value');

    const pseudoStrings = getAudioHudControlStrings('en-x-pseudo');
    const keyHint = resolveKeyHint(pseudoStrings);
    handle.setStrings(pseudoStrings);

    expect(wrapper?.getAttribute('aria-label')).toBe(pseudoStrings.groupLabel);
    expect(wrapper?.getAttribute('aria-busy')).toBe('false');
    expect(button?.title).toBe(
      formatMessage(pseudoStrings.toggle.titleTemplate, { keyHint })
    );
    expect(button?.textContent).toBe(
      formatMessage(pseudoStrings.toggle.offLabelTemplate, { keyHint })
    );
    expect(button?.dataset.hudAnnounce).toBe(
      formatMessage(pseudoStrings.toggle.announcementOffTemplate, { keyHint })
    );
    expect(label?.textContent).toBe(pseudoStrings.slider.label);
    expect(slider?.getAttribute('aria-label')).toBe(
      pseudoStrings.slider.ariaLabel
    );
    expect(labelElement?.htmlFor).toBe(slider?.id ?? null);
    expect(slider?.getAttribute('aria-describedby')).toBe(
      valueText?.id ?? null
    );
    expect(slider?.dataset.hudAnnounce).toBe(
      formatMessage(pseudoStrings.slider.mutedAnnouncementTemplate, {
        volume: '60%',
      })
    );
    expect(valueText?.textContent).toBe(
      formatMessage(pseudoStrings.slider.mutedValueTemplate, {
        volume: '60%',
      })
    );

    handle.dispose();
    expect(container.querySelector('.audio-hud')).toBeNull();
  });
});
