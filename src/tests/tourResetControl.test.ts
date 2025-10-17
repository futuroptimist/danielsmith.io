import { describe, expect, it, vi } from 'vitest';

import { createTourResetControl } from '../systems/controls/tourResetControl';

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
    let listener: ((visited: ReadonlySet<string>) => void) | null = null;
    const unsubscribe = vi.fn(() => {
      listener = null;
    });
    const subscribe = (
      next: (visited: ReadonlySet<string>) => void
    ): (() => void) => {
      listener = next;
      next(new Set());
      return unsubscribe;
    };
    const emit = (ids: Iterable<string>) => {
      listener?.(new Set(ids));
    };
    return { subscribe, emit, unsubscribe };
  };

  it('renders disabled state until POIs are visited', () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();

    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: vi.fn(),
    });

    const button = handle.element;
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.disabled).toBe(true);
    expect(button.dataset.state).toBe('empty');
    expect(button.textContent).toBe('Guided tour ready');
    expect(button.dataset.hudAnnounce).toBe(
      'Explore exhibits to unlock the guided tour reset.'
    );

    subscription.emit(['a', 'b']);
    expect(button.disabled).toBe(false);
    expect(button.dataset.state).toBe('ready');
    expect(button.textContent).toBe('Restart guided tour');
    expect(button.dataset.hudAnnounce).toContain('Press G to restart.');

    handle.dispose();
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(container.contains(button)).toBe(false);
    container.remove();
  });

  it('activates via click and keyboard, handling async completion', async () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['seed']);

    const reset = vi.fn(() => Promise.resolve());
    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
      resetKey: 'r',
      windowTarget: window,
    });

    const button = handle.element;
    subscription.emit(['seed']);
    expect(button.disabled).toBe(false);

    button.click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(button.dataset.state).toBe('pending');
    expect(button.disabled).toBe(true);

    await flushPromises();
    subscription.emit([]);
    await flushPromises();
    expect(button.dataset.state).toBe('empty');
    expect(button.disabled).toBe(true);

    subscription.emit(['next']);
    const event = new KeyboardEvent('keydown', { key: 'r' });
    window.dispatchEvent(event);
    expect(reset).toHaveBeenCalledTimes(2);
    await flushPromises();

    handle.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(reset).toHaveBeenCalledTimes(2);
    container.remove();
  });

  it('handles async rejections without leaving pending state', async () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['seed']);

    const reset = vi.fn(() => Promise.reject(new Error('nope')));
    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
      resetKey: 'r',
      windowTarget: window,
    });

    const button = handle.element;
    subscription.emit(['seed']);
    expect(button.disabled).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(button.dataset.state).toBe('pending');
    subscription.emit(['seed']);
    await flushPromises();
    await flushPromises();
    expect(button.dataset.state).toBe('ready');
    expect(button.disabled).toBe(false);

    handle.dispose();
    container.remove();
  });

  it('recovers from synchronous reset errors', () => {
    const container = createContainer();
    const subscription = createVisitedSubscription();
    subscription.emit(['seed']);

    const reset = vi.fn(() => {
      throw new Error('boom');
    });

    const handle = createTourResetControl({
      container,
      subscribeVisited: subscription.subscribe,
      onReset: reset,
    });

    subscription.emit(['seed']);
    const button = handle.element;
    button.click();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(button.dataset.state).toBe('ready');
    expect(button.disabled).toBe(false);

    handle.dispose();
    container.remove();
  });
});
