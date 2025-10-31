import type { HudFocusAnnouncerHandle } from '../accessibility/hudFocusAnnouncer';

import type { HelpModalHandle } from './helpModal';

export interface HelpModalAnnouncements {
  open?: string | null;
  close?: string | null;
}

export interface HelpModalControllerOptions {
  helpModal: HelpModalHandle;
  onOpen?: () => void;
  onClose?: () => void;
  hudFocusAnnouncer?: Pick<HudFocusAnnouncerHandle, 'announce'> | null;
  announcements?: HelpModalAnnouncements | null;
}

export interface HelpModalControllerHandle {
  setAnnouncements(announcements?: HelpModalAnnouncements | null): void;
  dispose(): void;
}

const sanitizeAnnouncement = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const sanitizeAnnouncements = (
  value?: HelpModalAnnouncements | null
): { open: string | null; close: string | null } => ({
  open: sanitizeAnnouncement(value?.open),
  close: sanitizeAnnouncement(value?.close),
});

export function attachHelpModalController({
  helpModal,
  onOpen,
  onClose,
  hudFocusAnnouncer,
  announcements,
}: HelpModalControllerOptions): HelpModalControllerHandle {
  const originalOpen = helpModal.open;
  const originalClose = helpModal.close;
  const originalToggle = helpModal.toggle;

  let activeAnnouncements = sanitizeAnnouncements(announcements);
  let isOpen = helpModal.isOpen();

  const refreshState = () => {
    isOpen = helpModal.isOpen();
    return isOpen;
  };

  const announce = (message: string | null) => {
    if (!message) {
      return;
    }
    hudFocusAnnouncer?.announce(message);
  };

  helpModal.open = () => {
    const wasOpen = refreshState();
    if (wasOpen) {
      originalOpen.call(helpModal);
      refreshState();
      return;
    }
    onOpen?.();
    originalOpen.call(helpModal);
    const nextIsOpen = refreshState();
    if (!nextIsOpen) {
      onClose?.();
      return;
    }
    announce(activeAnnouncements.open);
  };

  helpModal.close = () => {
    const wasOpen = refreshState();
    if (!wasOpen) {
      originalClose.call(helpModal);
      refreshState();
      return;
    }
    originalClose.call(helpModal);
    const nextIsOpen = refreshState();
    if (!nextIsOpen) {
      onClose?.();
      announce(activeAnnouncements.close);
    }
  };

  helpModal.toggle = (force?: boolean) => {
    const wasOpen = refreshState();
    const targetOpen = force ?? !wasOpen;
    if (targetOpen && !wasOpen) {
      onOpen?.();
    }
    originalToggle.call(helpModal, force);
    const nextIsOpen = refreshState();
    if (!wasOpen && nextIsOpen) {
      announce(activeAnnouncements.open);
      return;
    }
    if (!wasOpen && !nextIsOpen && targetOpen) {
      onClose?.();
      return;
    }
    if (wasOpen && !nextIsOpen) {
      onClose?.();
      announce(activeAnnouncements.close);
    }
  };

  return {
    setAnnouncements(nextAnnouncements) {
      activeAnnouncements = sanitizeAnnouncements(nextAnnouncements);
    },
    dispose() {
      helpModal.open = originalOpen;
      helpModal.close = originalClose;
      helpModal.toggle = originalToggle;
    },
  } satisfies HelpModalControllerHandle;
}
