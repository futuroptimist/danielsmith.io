import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createAudioSubtitles } from '../ui/hud/audioSubtitles';

describe('audio subtitles overlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('shows captions with labels and auto-hides after the configured duration', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'ambient-hum',
      text: 'Soft interior hum envelopes the living room.',
      source: 'ambient',
      durationMs: 1200,
    });

    const element = document.querySelector('.audio-subtitles');
    expect(element).toBeTruthy();
    expect(element?.getAttribute('aria-live')).toBe('polite');
    expect(element?.dataset.visible).toBe('true');
    expect(element?.querySelector('.audio-subtitles__label')?.textContent).toBe(
      'Ambient audio'
    );
    expect(
      element?.querySelector('.audio-subtitles__caption')?.textContent
    ).toBe('Soft interior hum envelopes the living room.');

    vi.advanceTimersByTime(1199);
    expect(element?.dataset.visible).toBe('true');

    vi.advanceTimersByTime(1);
    expect(element?.dataset.visible).toBe('false');
    handle.dispose();
  });

  it('respects priorities and refreshes timers for identical message ids', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'poi-flywheel',
      text: 'Flywheel hub spins up with automation prompts.',
      source: 'poi',
      priority: 5,
      durationMs: 5000,
    });

    handle.show({
      id: 'ambient-hum',
      text: 'Interior hum lingers in the background.',
      source: 'ambient',
      priority: 1,
      durationMs: 2000,
    });

    let caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe(
      'Flywheel hub spins up with automation prompts.'
    );

    vi.advanceTimersByTime(3000);

    handle.show({
      id: 'poi-flywheel',
      text: 'Flywheel hub spins up with automation prompts.',
      source: 'poi',
      priority: 0,
      durationMs: 2000,
    });

    caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe(
      'Flywheel hub spins up with automation prompts.'
    );
    vi.advanceTimersByTime(1999);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('clears captions only when the matching identifier is provided', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'poi-jobbot',
      text: 'Jobbot terminal emits cascading telemetry.',
      source: 'poi',
      durationMs: 0,
    });

    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    handle.clear('different');
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    handle.clear('poi-jobbot');
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('guards anonymous captions against stale hide timers', () => {
    const handle = createAudioSubtitles();
    handle.show({
      text: 'First ambient cue',
      source: 'ambient',
      durationMs: 1000,
    });

    handle.show({
      text: 'Second ambient cue',
      source: 'ambient',
      durationMs: 1000,
    });

    vi.advanceTimersByTime(999);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });
});
