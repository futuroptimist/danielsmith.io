import { describe, expect, it, vi } from 'vitest';

import { createMovementLegend } from '../ui/hud/movementLegend';

type Frame = FrameRequestCallback | null;

type VisibilityState = 'visible' | 'hidden' | 'prerender' | 'unloaded';

const createContainer = () => {
  const container = document.createElement('div');

  const item = document.createElement('div');
  item.dataset.inputMethods = 'keyboard gamepad';
  container.appendChild(item);

  const interact = document.createElement('div');
  interact.dataset.role = 'interact';

  const label = document.createElement('span');
  label.dataset.role = 'interact-label';
  label.textContent = 'Interact';
  interact.appendChild(label);

  const description = document.createElement('span');
  description.dataset.role = 'interact-description';
  description.textContent = 'Press to interact';
  interact.appendChild(description);

  container.appendChild(interact);
  document.body.appendChild(container);

  return container;
};

const createMockWindow = () => {
  let gamepads: Array<{ connected: boolean; buttons: [{ pressed: boolean }] }> =
    [{ connected: true, buttons: [{ pressed: true }] }];
  let scheduledFrame: Frame = null;
  let rafId = 0;
  let activeId: number | null = null;
  let visibility: VisibilityState = 'visible';
  const visibilityListeners = new Set<() => void>();

  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    scheduledFrame = callback;
    rafId += 1;
    activeId = rafId;
    return rafId;
  });

  const cancelAnimationFrame = vi.fn((id: number) => {
    if (id === activeId) {
      scheduledFrame = null;
      activeId = null;
    }
  });

  const triggerFrame = () => {
    const callback = scheduledFrame;
    if (!callback) {
      return;
    }
    // Clear before invoking in case the monitor stops scheduling while hidden.
    scheduledFrame = null;
    callback(0);
  };

  const setVisibility = (state: VisibilityState) => {
    visibility = state;
    visibilityListeners.forEach((listener) => listener());
  };

  const windowTarget: Window = {
    navigator: {
      getGamepads: () => gamepads,
    } as Navigator,
    document: {
      get visibilityState() {
        return visibility;
      },
      addEventListener: (
        _type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        if (typeof listener === 'function') {
          visibilityListeners.add(listener as () => void);
        } else if ('handleEvent' in listener) {
          visibilityListeners.add(listener.handleEvent.bind(listener));
        }
      },
      removeEventListener: (
        _type: string,
        listener: EventListenerOrEventListenerObject
      ) => {
        if (typeof listener === 'function') {
          visibilityListeners.delete(listener as () => void);
        } else if ('handleEvent' in listener) {
          visibilityListeners.delete(listener.handleEvent.bind(listener));
        }
      },
    } as Document,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame,
    cancelAnimationFrame,
  } as unknown as Window;

  return {
    windowTarget,
    requestAnimationFrame,
    cancelAnimationFrame,
    triggerFrame,
    setVisibility,
    setGamepads: (next: typeof gamepads) => {
      gamepads = next;
    },
    hasScheduledFrame: () => scheduledFrame !== null,
  };
};

describe('createMovementLegend gamepad monitoring', () => {
  it('pauses polling when hidden and resumes when visible again', () => {
    const container = createContainer();
    const mockWindow = createMockWindow();

    const legend = createMovementLegend({
      container,
      windowTarget: mockWindow.windowTarget,
    });

    const initialCalls = mockWindow.requestAnimationFrame.mock.calls.length;
    mockWindow.triggerFrame();
    expect(container.dataset.activeInput).toBe('gamepad');

    mockWindow.setVisibility('hidden');
    expect(mockWindow.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockWindow.hasScheduledFrame()).toBe(false);

    mockWindow.setGamepads([{ connected: true, buttons: [{ pressed: true }] }]);
    mockWindow.setVisibility('visible');
    expect(mockWindow.requestAnimationFrame.mock.calls.length).toBeGreaterThan(
      initialCalls
    );
    expect(mockWindow.hasScheduledFrame()).toBe(true);

    mockWindow.triggerFrame();
    expect(container.dataset.activeInput).toBe('gamepad');

    legend.dispose();
    expect(mockWindow.cancelAnimationFrame).toHaveBeenCalled();
    container.remove();
  });
});
