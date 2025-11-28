import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { HelpModalHandle } from '../ui/hud/helpModal';
import { attachHelpModalController } from '../ui/hud/helpModalController';

interface StubContext {
  handle: HelpModalHandle;
  getOpenState(): boolean;
  setOpenState(value: boolean): void;
  openSpy: ReturnType<typeof vi.fn>;
  closeSpy: ReturnType<typeof vi.fn>;
  toggleSpy: ReturnType<typeof vi.fn>;
}

const createHelpModalStub = (): StubContext => {
  const element = document.createElement('div');
  let openState = false;
  const openSpy = vi.fn(() => {
    openState = true;
  });
  const closeSpy = vi.fn(() => {
    openState = false;
  });
  const toggleSpy = vi.fn((force?: boolean) => {
    const shouldOpen = force ?? !openState;
    openState = shouldOpen;
  });
  const handle: HelpModalHandle = {
    element,
    settingsContainer: null,
    open: openSpy,
    close: closeSpy,
    toggle: toggleSpy,
    isOpen: () => openState,
    setContent: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    handle,
    getOpenState: () => openState,
    setOpenState: (value: boolean) => {
      openState = value;
    },
    openSpy,
    closeSpy,
    toggleSpy,
  } satisfies StubContext;
};

describe('attachHelpModalController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  it('invokes open/close hooks and announces state changes', () => {
    const events: string[] = [];
    const context = createHelpModalStub();
    const announcer = {
      announce: vi.fn((message: string) => events.push(`announce:${message}`)),
    };
    const controller = attachHelpModalController({
      helpModal: context.handle,
      onOpen: () => events.push('onOpen'),
      onClose: () => events.push('onClose'),
      hudFocusAnnouncer: announcer,
      announcements: { open: 'opened', close: 'closed' },
    });

    context.openSpy.mockImplementationOnce(() => {
      events.push('open');
      context.setOpenState(true);
    });
    context.closeSpy.mockImplementationOnce(() => {
      events.push('close');
      context.setOpenState(false);
    });

    context.handle.open();
    expect(events).toEqual(['onOpen', 'open', 'announce:opened']);
    expect(announcer.announce).toHaveBeenCalledWith('opened');

    events.length = 0;
    context.handle.close();
    expect(events).toEqual(['close', 'onClose', 'announce:closed']);
    expect(announcer.announce).toHaveBeenLastCalledWith('closed');

    controller.dispose();
  });

  it('wraps toggle to emit announcements for inferred state changes', () => {
    const events: string[] = [];
    const context = createHelpModalStub();
    context.toggleSpy.mockImplementation((force?: boolean) => {
      const shouldOpen = force ?? !context.getOpenState();
      events.push(`toggle:${shouldOpen ? 'open' : 'close'}`);
      context.setOpenState(shouldOpen);
    });
    const controller = attachHelpModalController({
      helpModal: context.handle,
      onOpen: () => events.push('onOpen'),
      onClose: () => events.push('onClose'),
      hudFocusAnnouncer: {
        announce: (message: string) => events.push(`announce:${message}`),
      },
      announcements: { open: 'opened', close: 'closed' },
    });

    context.handle.toggle();
    expect(events).toEqual(['onOpen', 'toggle:open', 'announce:opened']);

    events.length = 0;
    context.setOpenState(true);
    context.handle.toggle();
    expect(events).toEqual(['toggle:close', 'onClose', 'announce:closed']);

    events.length = 0;
    context.setOpenState(true);
    context.handle.toggle(false);
    expect(events).toEqual(['toggle:close', 'onClose', 'announce:closed']);

    controller.dispose();
  });

  it('updates announcements dynamically and ignores empty strings', () => {
    const context = createHelpModalStub();
    const announcer = { announce: vi.fn() };
    const controller = attachHelpModalController({
      helpModal: context.handle,
      hudFocusAnnouncer: announcer,
      announcements: { open: 'first open', close: 'first close' },
    });

    context.handle.open();
    expect(announcer.announce).toHaveBeenCalledWith('first open');

    controller.setAnnouncements({ open: '', close: 'updated close' });
    context.handle.open();
    expect(announcer.announce).not.toHaveBeenCalledWith('');

    context.handle.close();
    expect(announcer.announce).toHaveBeenLastCalledWith('updated close');

    controller.setAnnouncements(null);
    context.handle.open();
    expect(announcer.announce).not.toHaveBeenLastCalledWith('first open');

    controller.dispose();
  });

  it('syncs help button aria state with modal visibility', () => {
    const context = createHelpModalStub();
    const button = document.createElement('button');

    const controller = attachHelpModalController({
      helpModal: context.handle,
      helpButton: button,
    });

    expect(button.getAttribute('aria-controls')).toBe(
      context.handle.element.id
    );
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    context.handle.open();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-pressed')).toBe('true');

    context.handle.close();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    controller.dispose();
  });

  it('avoids duplicate announcements when state is unchanged', () => {
    const events: string[] = [];
    const context = createHelpModalStub();
    context.openSpy.mockImplementation(() => {
      events.push('open');
      context.setOpenState(true);
    });
    context.closeSpy.mockImplementation(() => {
      events.push('close');
      context.setOpenState(false);
    });
    const controller = attachHelpModalController({
      helpModal: context.handle,
      onOpen: () => events.push('onOpen'),
      onClose: () => events.push('onClose'),
      hudFocusAnnouncer: {
        announce: (message: string) => events.push(`announce:${message}`),
      },
      announcements: { open: 'opened', close: 'closed' },
    });

    context.handle.open();
    expect(events).toEqual(['onOpen', 'open', 'announce:opened']);

    events.length = 0;
    context.handle.open();
    expect(events).toEqual(['open']);

    events.length = 0;
    context.handle.close();
    expect(events).toEqual(['close', 'onClose', 'announce:closed']);

    events.length = 0;
    context.handle.close();
    expect(events).toEqual(['close']);

    controller.dispose();
  });

  it('restores HUD state when the modal fails to open', () => {
    const events: string[] = [];
    const context = createHelpModalStub();
    context.openSpy.mockImplementation(() => {
      events.push('open');
      // Intentionally leave the open state unchanged to simulate a failure.
    });
    context.closeSpy.mockImplementation(() => {
      events.push('close');
      context.setOpenState(false);
    });
    const controller = attachHelpModalController({
      helpModal: context.handle,
      onOpen: () => events.push('onOpen'),
      onClose: () => events.push('onClose'),
      hudFocusAnnouncer: {
        announce: (message: string) => events.push(`announce:${message}`),
      },
      announcements: { open: 'opened', close: 'closed' },
    });

    context.handle.open();
    expect(events).toEqual(['onOpen', 'open', 'onClose']);
    expect(context.getOpenState()).toBe(false);

    events.length = 0;
    context.toggleSpy.mockImplementation((force?: boolean) => {
      const shouldOpen = force ?? !context.getOpenState();
      events.push(`toggle:${shouldOpen ? 'open' : 'close'}`);
      // Leave state unchanged to simulate a failed toggle.
    });

    context.handle.toggle(true);
    expect(events).toEqual(['onOpen', 'toggle:open', 'onClose']);
    expect(context.getOpenState()).toBe(false);

    controller.dispose();
  });

  it('restores original handlers on dispose', () => {
    const context = createHelpModalStub();
    const controller = attachHelpModalController({
      helpModal: context.handle,
      hudFocusAnnouncer: null,
    });

    expect(context.handle.open).not.toBe(context.openSpy);
    expect(context.handle.close).not.toBe(context.closeSpy);
    expect(context.handle.toggle).not.toBe(context.toggleSpy);

    controller.dispose();

    expect(context.handle.open).toBe(context.openSpy);
    expect(context.handle.close).toBe(context.closeSpy);
    expect(context.handle.toggle).toBe(context.toggleSpy);
  });
});
