import type { LocaleOverrides } from '../types';

const wrap = (value: string) => `⟦${value}⟧`;

export const EN_X_PSEUDO_OVERRIDES: LocaleOverrides = {
  locale: 'en-x-pseudo',
  site: {
    name: wrap('Daniel Smith Immersive Portfolio'),
    structuredData: {
      description: wrap(
        'Interactive exhibits within the Daniel Smith immersive portfolio experience.'
      ),
    },
  },
  hud: {
    controlOverlay: {
      heading: wrap('Controls'),
      interact: {
        defaultLabel: wrap('F'),
        description: wrap('Interact'),
      },
      helpButton: {
        labelTemplate: wrap('Open menu · Press {shortcut}'),
        announcementTemplate: wrap(
          'Open settings and help. Press {shortcut} to review controls and accessibility tips.'
        ),
        shortcutFallback: wrap('H'),
      },
    },
    movementLegend: {
      defaultDescription: wrap('Interact'),
      labels: {
        keyboard: wrap('F'),
        pointer: wrap('Click'),
        touch: wrap('Tap'),
        gamepad: wrap('A'),
      },
    },
    keyBindings: {
      heading: wrap('Keyboard shortcuts'),
      description: wrap(
        'Select a binding, press a key, and press Escape to cancel if needed.'
      ),
      capturePrompt: wrap('Press a key…'),
      captureInstruction: wrap(
        'Listening for a key press. Press Escape to cancel.'
      ),
      unboundLabel: wrap('Unbound'),
      resetLabel: wrap('Reset'),
      resetAllLabel: wrap('Reset all'),
      slotLabels: {
        primary: wrap('Primary'),
        secondary: wrap('Alternate'),
        fallbackTemplate: wrap('Binding {index}'),
      },
      actions: {
        moveForward: {
          label: wrap('Move north'),
          description: wrap('Move away from the camera (north).'),
        },
        moveBackward: {
          label: wrap('Move south'),
          description: wrap('Move toward the camera (south).'),
        },
        moveLeft: {
          label: wrap('Move west'),
          description: wrap('Strafe left relative to the camera.'),
        },
        moveRight: {
          label: wrap('Move east'),
          description: wrap('Strafe right relative to the camera.'),
        },
        interact: {
          label: wrap('Interact'),
          description: wrap('Activate exhibits and confirm HUD controls.'),
        },
        help: {
          label: wrap('Open help'),
          description: wrap('Toggle the Settings & Help panel.'),
        },
      },
    },
    narrativeLog: {
      heading: wrap('Creator story log'),
      empty: wrap(
        'Visit exhibits to unlock narrative entries chronicling the creator showcase.'
      ),
      defaultVisitedLabel: wrap('Visited'),
      visitedLabelTemplate: wrap('Visited at {time}'),
      liveAnnouncementTemplate: wrap('{title} added to the creator story log.'),
    },
    helpModal: {
      heading: wrap('Settings & Help'),
      closeLabel: wrap('Close'),
      closeAriaLabel: wrap('Close help'),
      settings: {
        heading: wrap('Experience settings'),
        description: wrap(
          [
            'Tune audio, video, and accessibility preferences.',
            'These controls stay available even when the menu is closed via keyboard shortcuts.',
          ].join(' ')
        ),
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: wrap('Futuroptimist Creator Desk'),
      summary: wrap(
        'Triple-monitor editing bay capturing Futuroptimist releases with a live showreel, timeline, and automation overlays.'
      ),
      metrics: [
        { label: wrap('Stars'), value: wrap('1,280+') },
        {
          label: wrap('Workflow'),
          value: wrap('Resolve-style edit suite · triple display'),
        },
        {
          label: wrap('Focus'),
          value: wrap('Futuroptimist ecosystem reels in progress'),
        },
      ],
    },
  },
};
