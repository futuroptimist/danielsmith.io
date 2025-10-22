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
    expect(
      document.querySelector('.audio-subtitles__caption')?.textContent
    ).toBe('Flywheel hub spins up with automation prompts.');
    vi.advanceTimersByTime(1);
    caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe('Interior hum lingers in the background.');
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    vi.advanceTimersByTime(2000);
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
    expect(
      document.querySelector('.audio-subtitles__caption')?.textContent
    ).toBe('Second ambient cue');
    vi.advanceTimersByTime(1);
    expect(
      document.querySelector('.audio-subtitles__caption')?.textContent
    ).toBe('First ambient cue');
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'true'
    );
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('queues lower-priority captions and replays them after the active clip', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'ambient-hum',
      text: 'Ambient baseline cushions the room.',
      source: 'ambient',
      priority: 2,
      durationMs: 1000,
    });

    handle.show({
      id: 'poi-flywheel',
      text: 'Flywheel hub spins with narrated highlights.',
      source: 'poi',
      priority: 0,
      durationMs: 800,
    });

    let caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe('Ambient baseline cushions the room.');

    vi.advanceTimersByTime(1000);
    caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe(
      'Flywheel hub spins with narrated highlights.'
    );

    vi.advanceTimersByTime(800);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('requeues preempted captions so they resume after higher-priority clips', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'ambient-hum',
      text: 'Ambient hum steadies the space.',
      source: 'ambient',
      priority: 1,
      durationMs: 1200,
    });

    vi.advanceTimersByTime(200);

    handle.show({
      id: 'poi-narration',
      text: 'Narration cuts through with project stats.',
      source: 'poi',
      priority: 5,
      durationMs: 600,
    });

    let caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe(
      'Narration cuts through with project stats.'
    );

    vi.advanceTimersByTime(600);
    caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe('Ambient hum steadies the space.');

    vi.advanceTimersByTime(1200);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('refreshes queued captions when repeated ids update their payloads', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'ambient-hum',
      text: 'Initial ambient copy.',
      source: 'ambient',
      priority: 2,
      durationMs: 900,
    });

    handle.show({
      id: 'poi-narration',
      text: 'Narration takes the stage.',
      source: 'poi',
      priority: 3,
      durationMs: 500,
    });

    handle.show({
      id: 'ambient-hum',
      text: 'Updated ambient copy after narration.',
      source: 'ambient',
      priority: 2,
      durationMs: 700,
    });

    let caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe('Narration takes the stage.');

    vi.advanceTimersByTime(500);
    caption = document.querySelector('.audio-subtitles__caption');
    expect(caption?.textContent).toBe('Updated ambient copy after narration.');

    vi.advanceTimersByTime(700);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });

  it('clears the active and queued captions when clear is called without an id', () => {
    const handle = createAudioSubtitles();
    handle.show({
      id: 'poi-narration',
      text: 'Long-running narration clip.',
      source: 'poi',
      priority: 4,
      durationMs: 5000,
    });

    handle.show({
      id: 'ambient-hum',
      text: 'Queued ambient track awaiting playback.',
      source: 'ambient',
      priority: 1,
      durationMs: 600,
    });

    handle.clear();

    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );

    vi.advanceTimersByTime(5000);
    expect(document.querySelector('.audio-subtitles')?.dataset.visible).toBe(
      'false'
    );
    handle.dispose();
  });
});
