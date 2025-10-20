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
        promptTemplates: {
          default: wrap('Interact with {title}'),
          inspect: wrap('Inspect {title}'),
          activate: wrap('Activate {title}'),
        },
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
      announcements: {
        open: wrap('Help menu opened. Review controls and settings.'),
        close: wrap('Help menu closed.'),
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
