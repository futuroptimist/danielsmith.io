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
      mobileToggle: {
        expandLabel: wrap('Show all controls'),
        collapseLabel: wrap('Hide extra controls'),
        expandAnnouncement: wrap(
          'Showing the full controls list for mobile players.'
        ),
        collapseAnnouncement: wrap(
          'Hiding extra controls to keep the list compact.'
        ),
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
      interactPromptTemplates: {
        default: wrap('{prompt}'),
        keyboard: wrap('Press {label} to {prompt}'),
        pointer: wrap('{label} to {prompt}'),
        touch: wrap('{label} to {prompt}'),
        gamepad: wrap('Press {label} to {prompt}'),
      },
    },
    narrativeLog: {
      heading: wrap('Creator story log'),
      visitedHeading: wrap('Visited exhibits'),
      empty: wrap(
        'Visit exhibits to unlock narrative entries chronicling the creator showcase.'
      ),
      defaultVisitedLabel: wrap('Visited'),
      visitedLabelTemplate: wrap('Visited at {time}'),
      liveAnnouncementTemplate: wrap('{title} added to the creator story log.'),
      journey: {
        heading: wrap('Journey beats'),
        empty: wrap('Explore new exhibits to weave journey narration.'),
        entryLabelTemplate: wrap('{from} → {to}'),
        sameRoomTemplate: wrap(
          'Within the {room} {descriptor}, the story shifts from {fromPoi} toward {toPoi}.'
        ),
        crossRoomTemplate: wrap(
          'Leaving the {fromRoom} {fromDescriptor}, the journey drifts into the {toRoom} {toDescriptor} to spotlight {toPoi}.'
        ),
        crossSectionTemplate: wrap(
          'Stepping {direction} through the threshold, the path flows into the {toRoom} {toDescriptor} to reach {toPoi}.'
        ),
        fallbackTemplate: wrap('The narrative flows toward {toPoi}.'),
        announcementTemplate: wrap('Journey update — {label}: {story}'),
        directions: {
          indoors: wrap('back inside'),
          outdoors: wrap('outdoors'),
        },
      },
      rooms: {
        livingRoom: {
          label: wrap('living room'),
          descriptor: wrap('cinematic lounge'),
          zone: 'interior',
        },
        studio: {
          label: wrap('studio'),
          descriptor: wrap('automation lab'),
          zone: 'interior',
        },
        kitchen: {
          label: wrap('kitchen lab'),
          descriptor: wrap('culinary robotics wing'),
          zone: 'interior',
        },
        backyard: {
          label: wrap('backyard observatory'),
          descriptor: wrap('dusk-lit garden'),
          zone: 'exterior',
        },
      },
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
