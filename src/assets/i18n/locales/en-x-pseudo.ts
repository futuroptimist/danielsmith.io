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
    textFallback: {
      heading: wrap('Explore the highlights'),
      intro: wrap(
        'The text portfolio keeps every exhibit accessible with quick summaries, outcomes, and metrics while immersive mode is unavailable.'
      ),
      roomHeadingTemplate: wrap('{roomName} exhibits'),
      metricsHeading: wrap('Key metrics'),
      linksHeading: wrap('Further reading'),
      about: {
        heading: wrap('About Daniel'),
        summary: wrap(
          'Site Reliability Engineer with six years at YouTube focused on automation, observability, and steady releases.'
        ),
        highlights: [
          wrap(
            'Built developer platforms and agentic tooling to speed up shipping safely.'
          ),
          wrap(
            'Mentors teams on SLOs, incident response, and reliability reviews.'
          ),
          wrap(
            'Explores immersive WebGL storytelling that always falls back to accessible text.'
          ),
        ],
      },
      skills: {
        heading: wrap('Skills at a glance'),
        items: [
          {
            label: wrap('Languages'),
            value: wrap(
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C'
            ),
          },
          {
            label: wrap('Infra & tools'),
            value: wrap(
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro'
            ),
          },
          {
            label: wrap('Practices'),
            value: wrap(
              'SRE (SLOs, incident response, capacity), observability, CI/CD, testing, prompt docs & agentic coding'
            ),
          },
        ],
      },
      timeline: {
        heading: wrap('Work timeline'),
        entries: [
          {
            period: wrap('Sep 2018 — May 2025'),
            location: wrap('San Bruno, CA'),
            role: wrap('Site Reliability Engineer (L4)'),
            org: wrap('YouTube (Google)'),
            summary: wrap(
              'Ran on-call across multiple surfaces, automated monitoring in Python/Go/SQL/C++, and guided reliability reviews for leadership.'
            ),
          },
          {
            period: wrap('Jan 2017 — Sep 2018'),
            location: wrap('Stennis Space Center, MS'),
            role: wrap('Software Engineer'),
            org: wrap('Naval Research Laboratory'),
            summary: wrap(
              'Shipped C++/Qt data-processing applications and remote demos inside Scrum sprints.'
            ),
          },
          {
            period: wrap('Mar 2014 — Dec 2016'),
            location: wrap('Hattiesburg, MS'),
            role: wrap('Software Developer'),
            org: wrap('The University of Southern Mississippi'),
            summary: wrap(
              'Built Objective-C frameworks for live content delivery in university iOS apps.'
            ),
          },
        ],
      },
      contact: {
        heading: wrap('Contact'),
        emailLabel: wrap('Email'),
        email: wrap('daniel@danielsmith.io'),
        githubLabel: wrap('GitHub'),
        githubUrl: wrap('https://github.com/futuroptimist'),
        resumeLabel: wrap('Résumé (PDF)'),
        resumeUrl: wrap('docs/resume/2025-09/resume.pdf'),
      },
      actions: {
        immersiveLink: wrap('Launch immersive mode'),
        resumeLink: wrap('Download the latest résumé'),
        githubLink: wrap('Explore projects on GitHub'),
      },
      reasonDescriptions: {
        manual: wrap(
          'You requested the lightweight portfolio view. The immersive scene stays just a click away.'
        ),
        'webgl-unsupported': wrap(
          "Your browser or device couldn't start the WebGL renderer. Enjoy the quick text overview while we keep the immersive scene light."
        ),
        'low-memory': wrap(
          'Your device reported limited memory, so we launched the lightweight text tour to keep things smooth.'
        ),
        'low-end-device': wrap(
          'We detected a lightweight device profile, so we loaded the fast text tour to keep navigation responsive.'
        ),
        'low-performance': wrap(
          'We detected sustained low frame rates, so we switched to the responsive text tour to keep the experience snappy.'
        ),
        'immersive-init-error': wrap(
          'Something went wrong starting the immersive scene, so we brought you the text overview instead.'
        ),
        'automated-client': wrap(
          'We detected an automated client, so we surfaced the fast-loading text portfolio for reliable previews and crawlers.'
        ),
        'console-error': wrap(
          'We detected a runtime error and switched to the resilient text tour while the immersive scene recovers.'
        ),
        'data-saver': wrap(
          'Your browser requested a data-saver experience, so we launched the lightweight text tour to minimize bandwidth while keeping the highlights accessible.'
        ),
      },
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
    customization: {
      heading: wrap('Customization'),
      description: wrap(
        'Tune the mannequin style and companion gear for the current mission.'
      ),
      variants: {
        title: wrap('Avatar style'),
        description: wrap('Switch outfits for the mannequin explorer.'),
      },
      accessories: {
        title: wrap('Accessories'),
        description: wrap(
          'Toggle the wrist console or holographic drone companions.'
        ),
      },
    },
    audioControl: {
      keyHint: wrap('M'),
      groupLabel: wrap('Ambient audio controls'),
      toggle: {
        onLabelTemplate: wrap('Audio: On · Press {keyHint} to mute'),
        offLabelTemplate: wrap('Audio: Off · Press {keyHint} to unmute'),
        titleTemplate: wrap('Toggle ambient audio ({keyHint})'),
        announcementOnTemplate: wrap(
          'Ambient audio on. Press {keyHint} to toggle.'
        ),
        announcementOffTemplate: wrap(
          'Ambient audio off. Press {keyHint} to toggle.'
        ),
        pendingAnnouncementTemplate: wrap(
          'Switching ambient audio state. Please wait…'
        ),
      },
      slider: {
        label: wrap('Ambient volume'),
        ariaLabel: wrap('Ambient audio volume'),
        hudLabel: wrap('Ambient audio volume slider.'),
        valueAnnouncementTemplate: wrap('Ambient audio volume {volume}.'),
        mutedAnnouncementTemplate: wrap(
          'Ambient audio muted. Volume set to {volume}.'
        ),
        mutedValueTemplate: wrap('Muted · {volume}'),
        mutedAriaValueTemplate: wrap('Muted ({volume})'),
      },
    },
    modeToggle: {
      idleLabelTemplate: wrap('Text mode · Press {keyHint}'),
      idleDescriptionTemplate: wrap('Switch to the text-only portfolio'),
      idleAnnouncementTemplate: wrap(
        'Switch to the text-only portfolio. Press {keyHint} to activate.'
      ),
      idleTitleTemplate: wrap('Switch to the text-only portfolio ({keyHint})'),
      pendingLabelTemplate: wrap('Switching to text mode…'),
      pendingAnnouncementTemplate: wrap(
        'Switch to the text-only portfolio. Switching to text mode…'
      ),
      activeLabelTemplate: wrap('Text mode active'),
      activeDescriptionTemplate: wrap('Text mode already active.'),
      activeAnnouncementTemplate: wrap('Text mode already active.'),
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
