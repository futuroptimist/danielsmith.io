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

  const announce = (message: string | null) => {
    if (!message) {
      return;
    }
    hudFocusAnnouncer?.announce(message);
  };

  helpModal.open = () => {
    onOpen?.();
    originalOpen.call(helpModal);
    announce(activeAnnouncements.open);
  };

  helpModal.close = () => {
    originalClose.call(helpModal);
    onClose?.();
    announce(activeAnnouncements.close);
  };

  helpModal.toggle = (force?: boolean) => {
    const shouldOpen = force ?? !helpModal.isOpen();
    if (shouldOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
    originalToggle.call(helpModal, force);
    announce(shouldOpen ? activeAnnouncements.open : activeAnnouncements.close);
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
