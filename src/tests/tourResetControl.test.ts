import { describe, expect, it, vi } from 'vitest';

import { getGuidedTourControlStrings } from '../assets/i18n';
import type { PoiId } from '../scene/poi/types';
import { createTourResetControl } from '../systems/controls/tourResetControl';
import { GuidedTourPreference } from '../systems/guidedTour/preference';

describe('createTourResetControl', () => {
  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const createContainer = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return container;
  };

  const createVisitedSubscription = () => {
    let listener: ((visited: ReadonlySet<PoiId>) => void) | null = null;
    const unsubscribe = vi.fn(() => {
      listener = null;
    });
    const subscribe = (
      next: (visited: ReadonlySet<PoiId>) => void
    ): (() => void) => {
      listener = next;
      next(new Set());
      return unsubscribe;
    };
    const emit = (ids: Iterable<string>) => {
      listener?.(new Set(ids as Iterable<PoiId>));
    };
    return { subscribe, emit, unsubscribe };
  };

  const createPreference = () =>
    new GuidedTourPreference({
      storage: {
        getItem: () => null,
        setItem: () => {
          /* noop */
        },
      },
      windowTarget: window,
      defaultEnabled: true,
    });

  it('renders disabled state until POIs are visited', () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    const preference = createPreference();

    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: vi.fn(),
      guidedTourPreference: preference,
      strings: getGuidedTourControlStrings('en'),
    });

    const wrapper = handle.element;
    expect(wrapper).toBeInstanceOf(HTMLElement);
    const resetButton = wrapper.querySelector(
      '.tour-reset'
    ) as HTMLButtonElement;
    expect(resetButton).toBeTruthy();
    expect(wrapper.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.disabled).toBe(true);
    expect(resetButton.dataset.state).toBe('empty');
    expect(resetButton.textContent).toBe('Guided tour ready');
    expect(resetButton.dataset.hudAnnounce).toBe(
      'Explore exhibits to unlock the guided tour reset.'
    );

    subscription.emit([
      'futuroptimist-living-room-tv',
      'tokenplace-studio-cluster',
    ]);
    expect(resetButton.disabled).toBe(false);
    expect(resetButton.dataset.state).toBe('ready');
    expect(resetButton.textContent).toBe('Restart guided tour');
    expect(resetButton.dataset.hudAnnounce).toContain('Press G to restart.');
    expect(wrapper.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.getAttribute('aria-busy')).toBe('false');

    handle.dispose();
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(container.contains(wrapper)).toBe(false);
    preference.dispose();
    container.remove();
  });

  it('activates via click and keyboard, handling async completion', async () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['futuroptimist-living-room-tv']);
    const preference = createPreference();

    const reset = vi.fn(() => Promise.resolve());
    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
      resetKey: 'r',
      windowTarget: window,
      guidedTourPreference: preference,
      strings: getGuidedTourControlStrings('en'),
    });

    const resetButton = handle.element.querySelector(
      '.tour-reset'
    ) as HTMLButtonElement;
    subscription.emit(['futuroptimist-living-room-tv']);
    expect(resetButton.disabled).toBe(false);

    resetButton.click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetButton.dataset.state).toBe('pending');
    expect(resetButton.disabled).toBe(true);
    expect(handle.element.getAttribute('aria-busy')).toBe('true');
    expect(resetButton.getAttribute('aria-busy')).toBe('true');

    await flushPromises();
    subscription.emit([]);
    await flushPromises();
    expect(resetButton.dataset.state).toBe('empty');
    expect(resetButton.disabled).toBe(true);
    expect(handle.element.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.getAttribute('aria-busy')).toBe('false');

    subscription.emit(['tokenplace-studio-cluster']);
    const event = new KeyboardEvent('keydown', { key: 'r' });
    window.dispatchEvent(event);
    expect(reset).toHaveBeenCalledTimes(2);
    await flushPromises();
    await flushPromises();
    expect(handle.element.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.getAttribute('aria-busy')).toBe('false');

    handle.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(reset).toHaveBeenCalledTimes(2);
    preference.dispose();
    container.remove();
  });

  it('handles async rejections without leaving pending state', async () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['futuroptimist-living-room-tv']);
    const preference = createPreference();

    const reset = vi.fn(() => Promise.reject(new Error('nope')));
    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
      resetKey: 'r',
      windowTarget: window,
      guidedTourPreference: preference,
      strings: getGuidedTourControlStrings('en'),
    });

    const resetButton = handle.element.querySelector(
      '.tour-reset'
    ) as HTMLButtonElement;
    subscription.emit(['futuroptimist-living-room-tv']);
    expect(resetButton.disabled).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetButton.dataset.state).toBe('pending');
    subscription.emit(['futuroptimist-living-room-tv']);
    await flushPromises();
    await flushPromises();
    expect(resetButton.dataset.state).toBe('ready');
    expect(resetButton.disabled).toBe(false);
    expect(handle.element.getAttribute('aria-busy')).toBe('false');
    expect(resetButton.getAttribute('aria-busy')).toBe('false');

    handle.dispose();
    preference.dispose();
    container.remove();
  });

  it('recovers from synchronous reset errors', () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['futuroptimist-living-room-tv']);
    const preference = createPreference();

    const reset = vi.fn(() => {
      throw new Error('boom');
    });

    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
      guidedTourPreference: preference,
      strings: getGuidedTourControlStrings('en'),
    });

    subscription.emit(['futuroptimist-living-room-tv']);
    const resetButton = handle.element.querySelector(
      '.tour-reset'
    ) as HTMLButtonElement;
    resetButton.click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(resetButton.dataset.state).toBe('ready');
    expect(resetButton.disabled).toBe(false);

    handle.dispose();
    preference.dispose();
    container.remove();
  });

  it('toggles guided tour highlights and announces state', () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    const preference = createPreference();

    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: vi.fn(),
      guidedTourPreference: preference,
      strings: getGuidedTourControlStrings('en'),
    });

    const wrapper = handle.element;
    const toggleButton = wrapper.querySelector(
      '.guided-tour-control__toggle'
    ) as HTMLButtonElement;
    expect(toggleButton).toBeTruthy();
    expect(toggleButton.dataset.state).toBe('on');
    expect(toggleButton.dataset.hudAnnounce).toContain('enabled');

    toggleButton.click();
    expect(preference.isEnabled()).toBe(false);
    expect(toggleButton.dataset.state).toBe('off');
    expect(toggleButton.dataset.hudAnnounce).toContain('disabled');

    toggleButton.click();
    expect(preference.isEnabled()).toBe(true);

    handle.dispose();
    preference.dispose();
    container.remove();
  });
});
