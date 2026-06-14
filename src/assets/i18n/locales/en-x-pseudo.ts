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
      properties: {
        labels: {
          category: wrap('Category'),
          outcome: wrap('Outcome'),
          status: wrap('Status'),
        },
        categories: {
          project: wrap('Project'),
          environment: wrap('Environment'),
        },
        statuses: {
          prototype: wrap('Prototype'),
          live: wrap('Live'),
        },
      },
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
      recoveryCta: {
        title: wrap('Ready for the full room?'),
        description: wrap(
          'Clear the saved text preference and relaunch the immersive portfolio from here.'
        ),
        actionLabel: wrap('Try immersive again'),
        ariaLabel: wrap(
          'Try immersive mode again and clear the saved text mode preference'
        ),
      },
      actions: {
        immersiveLink: wrap('Try immersive again'),
        debugImmersiveLink: wrap('Debug: force immersive mode'),
        clearPreferenceButton: wrap('Clear saved mode preference'),
        clearPreferenceSuccess: wrap('Saved mode preference cleared'),
        resumeLink: wrap('Download the latest résumé'),
        githubLink: wrap('Explore projects on GitHub'),
      },
      reasonHeadings: {
        manual: wrap('Text-only mode enabled'),
        'webgl-unsupported': wrap('Immersive mode unavailable on this device'),
        'low-memory': wrap('Low-memory device detected'),
        'low-end-device': wrap('Lightweight device detected'),
        'low-performance': wrap('Performance fallback active'),
        'immersive-init-error': wrap('Immersive scene encountered an error'),
        'automated-client': wrap('Automated client detected'),
        'data-saver': wrap('Data-saver mode enabled'),
        'console-error': wrap('Runtime errors detected'),
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
        defaultLabel: wrap('Enter'),
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
      menu: {
        controls: {
          label: wrap('Controls'),
          keyHint: wrap('C'),
          title: wrap('Open controls (C)'),
        },
        text: {
          label: wrap('Text'),
          keyHint: wrap('T'),
          title: wrap('Switch to text mode (T)'),
        },
        settings: {
          label: wrap('Settings'),
          keyHint: wrap('H'),
          title: wrap('Open settings and help (H)'),
        },
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
        keyboard: wrap('Enter'),
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
    audioSubtitles: {
      labels: {
        ambient: wrap('Ambient audio'),
        poi: wrap('Narration'),
      },
      dismissLabels: {
        ambient: wrap('Dismiss caption'),
        poi: wrap('Dismiss narration'),
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
    localeToggle: {
      title: wrap('Language'),
      description: wrap('Switch the HUD language and direction.'),
      options: {
        en: { label: wrap('English'), direction: 'ltr' },
        ja: { label: wrap('日本語'), direction: 'ltr' },
        ar: { label: wrap('العربية'), direction: 'rtl' },
        'zh-Hans': { label: wrap('中文（简体）'), direction: 'ltr' },
        'en-x-pseudo': { label: wrap('Pseudo'), direction: 'ltr' },
      },
      switchingAnnouncementTemplate: wrap('Switching to {target} locale…'),
      selectedAnnouncementTemplate: wrap('{label} locale selected.'),
      failureAnnouncementTemplate: wrap(
        'Unable to switch to {target}. Staying on {current} locale.'
      ),
    },
    tourGuideToggle: {
      labelEnabled: wrap('Guided tour on'),
      labelDisabled: wrap('Guided tour off'),
      descriptionEnabled: wrap(
        'Highlights the next recommended exhibit in the immersive tour.'
      ),
      descriptionDisabled: wrap(
        'Guided tour highlights are hidden until you turn them back on.'
      ),
    },
    narrationToggle: {
      labelEnabled: wrap('Narration on'),
      labelDisabled: wrap('Narration off'),
      descriptionEnabled: wrap(
        'Narration popups and captions are shown for future exhibit moments.'
      ),
      descriptionDisabled: wrap(
        'Narration popups and captions stay hidden until you turn them on.'
      ),
    },
    debugCoordinates: {
      labelEnabled: wrap('Debug coordinates on'),
      labelDisabled: wrap('Debug coordinates off'),
      descriptionEnabled: wrap(
        'Shows the XYZ, floor, camera, and stair debug overlay.'
      ),
      descriptionDisabled: wrap(
        'Debug coordinates stay hidden until you turn them on.'
      ),
      overlayLabel: wrap('Debug coordinates'),
      labels: {
        position: wrap('XYZ'),
        activeFloor: wrap('Active floor'),
        predictedFloor: wrap('Predicted stair floor'),
        cameraZoom: wrap('Camera zoom'),
        stairWidth: wrap('Stair width'),
        landing: wrap('Landing'),
        stairNav: wrap('Stair nav area'),
        stairZone: wrap('Stair zone'),
        room: wrap('Room'),
      },
      values: {
        yes: wrap('Yes'),
        no: wrap('No'),
        none: wrap('None'),
      },
    },
    debugColliders: {
      labelEnabled: wrap('Collider overlay on'),
      labelDisabled: wrap('Collider overlay off'),
      descriptionEnabled: wrap(
        'Shows invisible walls and collision rectangles for the active floor.'
      ),
      descriptionDisabled: wrap(
        'Invisible walls and collision rectangles stay hidden until you turn them on.'
      ),

      idsLabelEnabled: '⟦Collider IDs on⟧',
      idsLabelDisabled: '⟦Collider IDs off⟧',
      idsDescriptionEnabled:
        '⟦Shows collider ID labels while the collider overlay is on.⟧',
      idsDescriptionDisabled:
        '⟦Hides collider ID labels while keeping collider wireframes available.⟧',
      solidIdsLabelEnabled: '⟦Solid IDs on⟧',
      solidIdsLabelDisabled: '⟦Solid IDs off⟧',
      solidIdsDescriptionEnabled:
        '⟦Shows stable IDs and wireframes for visible scene solids.⟧',
      solidIdsDescriptionDisabled:
        '⟦Stable solid IDs and wireframes stay hidden.⟧',
      fpsLabelEnabled: wrap('FPS counter on'),
      fpsLabelDisabled: wrap('FPS counter off'),
      fpsDescriptionEnabled: wrap(
        'Shows the debug-only stats.js FPS panel without blocking HUD controls.'
      ),
      fpsDescriptionDisabled: wrap('The debug FPS panel stays hidden.'),
    },
    tourReset: {
      heading: wrap('Guided tour'),
      resetKey: 'g',
      label: wrap('Restart guided tour'),
      description: wrap('Clear visited POIs and replay the curated path.'),
      emptyLabel: wrap('Guided tour ready'),
      emptyDescription: wrap(
        'Explore exhibits to unlock the guided tour reset.'
      ),
      pendingLabel: wrap('Resetting tour…'),
      pendingDescription: wrap('Resetting the guided tour…'),
      restartPromptTemplate: wrap('Press {key} to restart.'),
      guidedTourDescription: wrap('Show recommended exhibits when idle.'),
      guidedTourLabelOn: wrap('Guided tour highlights: On'),
      guidedTourLabelOff: wrap('Guided tour highlights: Off'),
      toggleAnnouncementOn: wrap(
        'Guided tour highlights enabled. Activate to disable recommendations.'
      ),
      toggleAnnouncementOff: wrap(
        'Guided tour highlights disabled. Activate to enable recommendations.'
      ),
      toggleTitleOn: wrap('Disable guided tour highlights'),
      toggleTitleOff: wrap('Enable guided tour highlights'),
    },
    softwareRendererWarning: {
      fallbackRendererLabel: wrap('software WebGL renderer'),
      title: wrap('Software rendering detected'),
      descriptionTemplate: wrap(
        'Chrome is using {renderer} instead of hardware acceleration. Basic Render Driver, SwiftShader, WARP, and llvmpipe can crash under continuous WebGL animation.'
      ),
      recommendation: wrap(
        'Enable browser hardware acceleration for the smooth immersive portfolio. Safe immersive mode keeps screenshots and debugging available at a capped frame rate.'
      ),
      continueSafeLabel: wrap('Continue in safe immersive'),
      continuousLabel: wrap('Enable continuous immersive anyway'),
      textModeLabel: wrap('Use text mode'),
      reloadSafeLabel: wrap('Reload this safe immersive URL'),
    },
    modeToggle: {
      keyHint: 'T',
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
      activeLabelTemplate: wrap('Try immersive again · Press {keyHint}'),
      activeDescriptionTemplate: wrap('Return to the immersive portfolio.'),
      activeAnnouncementTemplate: wrap(
        'Text mode active. Press {keyHint} to try immersive again.'
      ),
      errorLabelTemplate: wrap('Retry text mode · Press {keyHint}'),
      errorDescriptionTemplate: wrap(
        'Text mode toggle failed. Try again or use the immersive link.'
      ),
      errorAnnouncementTemplate: wrap(
        'Text mode toggle failed. Press {keyHint} to try again.'
      ),
      errorTitleTemplate: wrap(
        'Text mode toggle failed. Press {keyHint} to retry text mode.'
      ),
    },
    poiOverlay: {
      visited: wrap('Visited'),
      nextHighlight: wrap('Next highlight'),
      prototype: wrap('Prototype'),
      live: wrap('Live'),
      closeDetails: wrap('Close POI details'),
      relatedCaseStudies: wrap('Related case studies'),
      outcomeFallbackLabel: wrap('Outcome'),
      discoveryAnnouncementTemplate: wrap('{title} discovered. {summary}'),
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
      description: wrap(
        [
          'Adjust accessibility presets, graphics quality, audio, and review shortcuts.',
          'Use the help shortcut (default H or ?) to toggle this panel.',
        ].join(' ')
      ),
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
      sections: [
        {
          id: 'movement',
          title: wrap('Movement & Camera'),
          items: [
            {
              label: wrap('WASD / Arrow keys'),
              description: wrap('Roll the explorer around the home.'),
            },
            {
              label: wrap('Mouse drag'),
              description: wrap('Pan the isometric camera.'),
            },
            {
              label: wrap('Scroll wheel'),
              description: wrap('Adjust zoom level.'),
            },
            {
              label: wrap('Shift + = / Shift + -'),
              description: wrap('Zoom in or out without a mouse wheel.'),
            },
            {
              label: wrap('Touch joysticks'),
              description: wrap(
                'Drag the left pad to move and the right pad to pan.'
              ),
            },
            {
              label: wrap('Pinch'),
              description: wrap('Zoom on touch devices.'),
            },
          ],
        },
        {
          id: 'interactions',
          title: wrap('Interactions'),
          items: [
            {
              label: wrap('Approach glowing POIs'),
              description: wrap(
                'Press your interact key (Enter/Space/F), tap, or click to open the exhibit overlay.'
              ),
            },
            {
              label: wrap('Q / E or ← / →'),
              description: wrap(
                'Cycle focus between points of interest with the keyboard.'
              ),
            },
            {
              label: wrap('T'),
              description: wrap(
                'Toggle between immersive mode and the text fallback.'
              ),
            },
            {
              label: wrap('Shift + L'),
              description: wrap(
                'Compare cinematic lighting with the debug pass.'
              ),
            },
          ],
        },
        {
          id: 'accessibility',
          title: wrap('Accessibility & Failover'),
          items: [
            {
              label: wrap('Low performance'),
              description: wrap(
                'The scene automatically switches to text mode below 30 FPS.'
              ),
            },
            {
              label: wrap('Manual toggle'),
              description: wrap(
                'Use the on-screen Text mode button or press T at any time.'
              ),
            },
            {
              label: wrap('Motion blur slider'),
              description: wrap(
                'Adjust trail strength with the Settings → Motion blur control.'
              ),
            },
            {
              label: wrap('Ambient audio'),
              description: wrap('Toggle with the Audio button or press M.'),
            },
          ],
        },
      ],
      announcements: {
        open: wrap('Help menu opened. Review controls and settings.'),
        close: wrap('Help menu closed.'),
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: wrap('Futuroptimist'),
      summary: wrap(
        'Futuroptimist hub for open-source scripts, data pipelines, tests, and YouTube-oriented automation metadata.'
      ),
      metrics: [
        {
          label: wrap('Stars'),
          value: wrap('Syncing from GitHub…'),
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: wrap('{value} stars'),
            fallback: wrap('Syncing from GitHub…'),
          },
        },
        {
          label: wrap('Workflow'),
          value: wrap('uv, Make targets, pytest, and GitHub Actions'),
        },
        {
          label: wrap('Focus'),
          value: wrap('Scripts, prompt docs, related-project status'),
        },
      ],
    },
  },
};
