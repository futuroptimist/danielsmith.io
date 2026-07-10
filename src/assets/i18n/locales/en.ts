import type { LocaleStrings } from '../types';

export const EN_LOCALE_STRINGS: LocaleStrings = {
  locale: 'en',
  site: {
    name: 'Daniel Smith Immersive Portfolio',
    structuredData: {
      description:
        'Interactive exhibits within the Daniel Smith immersive portfolio experience.',
      listNameTemplate: '{siteName} Exhibits',
      textCollectionNameTemplate: '{siteName} Text Portfolio',
      textCollectionDescription:
        'Fast-loading summaries of every immersive exhibit tuned for accessible and crawler-friendly reading.',
      immersiveActionName: 'Launch immersive mode',
      properties: {
        labels: {
          category: 'Category',
          outcome: 'Outcome',
          status: 'Status',
        },
        categories: {
          project: 'Project',
          environment: 'Environment',
        },
        statuses: {
          prototype: 'Prototype',
          live: 'Live',
        },
      },
      publisher: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
        logoUrl: 'https://danielsmith.io/favicon.ico',
      },
      author: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
      },
    },
    textFallback: {
      heading: 'Explore the highlights',
      intro:
        'The text portfolio keeps every exhibit accessible with quick summaries, outcomes, and metrics while immersive mode is unavailable.',
      roomHeadingTemplate: '{roomName} exhibits',
      metricsHeading: 'Key metrics',
      linksHeading: 'Further reading',
      about: {
        heading: 'About Daniel',
        summary:
          'Site Reliability Engineer with six years at YouTube focused on automation, observability, and steady releases.',
        highlights: [
          'Built developer platforms and agentic tooling to speed up shipping safely.',
          'Mentors teams on SLOs, incident response, and reliability reviews.',
          'Explores immersive WebGL storytelling that always falls back to accessible text.',
        ],
      },
      skills: {
        heading: 'Skills at a glance',
        items: [
          {
            label: 'Languages',
            value:
              'Python, Go, SQL, C++, TypeScript/JavaScript, Ruby, Objective-C',
          },
          {
            label: 'Infra & tools',
            value:
              'Kubernetes, Docker, Google Cloud (BigQuery), GitHub Actions, WebGL/Three.js, React/Next.js, Astro',
          },
          {
            label: 'Practices',
            value:
              'SRE (SLOs, incident response, capacity), observability, CI/CD, testing, prompt docs & agentic coding',
          },
        ],
      },
      timeline: {
        heading: 'Work timeline',
        entries: [
          {
            period: 'Sep 2018 — May 2025',
            location: 'San Bruno, CA',
            role: 'Site Reliability Engineer (L4)',
            org: 'YouTube (Google)',
            summary:
              'Ran on-call across multiple surfaces, automated monitoring in Python/Go/SQL/C++, and guided reliability reviews for leadership.',
          },
          {
            period: 'Jan 2017 — Sep 2018',
            location: 'Stennis Space Center, MS',
            role: 'Software Engineer',
            org: 'Naval Research Laboratory',
            summary:
              'Shipped C++/Qt data-processing applications and remote demos inside Scrum sprints.',
          },
          {
            period: 'Mar 2014 — Dec 2016',
            location: 'Hattiesburg, MS',
            role: 'Software Developer',
            org: 'The University of Southern Mississippi',
            summary:
              'Built Objective-C frameworks for live content delivery in university iOS apps.',
          },
        ],
      },
      contact: {
        heading: 'Contact',
        emailLabel: 'Email',
        email: 'daniel@danielsmith.io',
        githubLabel: 'GitHub',
        githubUrl: 'https://github.com/futuroptimist',
        resumeLabel: 'Résumé (PDF)',
        resumeUrl: '/resume.pdf',
      },
      recoveryCta: {
        title: 'Ready for the full room?',
        description:
          'Clear the saved text preference and relaunch the immersive portfolio from here.',
        actionLabel: 'Try immersive again',
        ariaLabel:
          'Try immersive mode again and clear the saved text mode preference',
      },
      actions: {
        immersiveLink: 'Try immersive again',
        debugImmersiveLink: 'Debug: force immersive mode',
        clearPreferenceButton: 'Clear saved mode preference',
        clearPreferenceSuccess: 'Saved mode preference cleared',
        resumeLink: 'Download the latest résumé',
        githubLink: 'Explore projects on GitHub',
      },
      reasonHeadings: {
        manual: 'Text-only mode enabled',
        'webgl-unsupported': 'Immersive mode unavailable on this device',
        'low-memory': 'Low-memory device detected',
        'low-end-device': 'Lightweight device detected',
        'low-performance': 'Performance fallback active',
        'immersive-init-error': 'Immersive scene encountered an error',
        'automated-client': 'Automated client detected',
        'data-saver': 'Data-saver mode enabled',
        'console-error': 'Runtime errors detected',
      },
      reasonDescriptions: {
        manual:
          'You requested the lightweight portfolio view. The immersive scene stays just a click away.',
        'webgl-unsupported':
          "Your browser or device couldn't start the WebGL renderer. Enjoy the quick text overview while we keep the immersive scene light.",
        'low-memory':
          'Your device reported limited memory, so we launched the lightweight text tour to keep things smooth.',
        'low-end-device':
          'We detected a lightweight device profile, so we loaded the fast text tour to keep navigation responsive.',
        'low-performance':
          'We detected sustained low frame rates, so we switched to the responsive text tour to keep the experience snappy.',
        'immersive-init-error':
          'Something went wrong starting the immersive scene, so we brought you the text overview instead.',
        'automated-client':
          'We detected an automated client, so we surfaced the fast-loading text portfolio for reliable previews and crawlers.',
        'console-error':
          'We detected a runtime error and switched to the resilient text tour while the immersive scene recovers.',
        'data-saver':
          'Your browser requested a data-saver experience, so we launched the lightweight text tour to minimize bandwidth while keeping the highlights accessible.',
      },
    },
  },
  hud: {
    controlOverlay: {
      heading: 'Controls',
      items: {
        keyboardMove: {
          keys: 'WASD / Arrow keys',
          description: 'Move',
        },
        pointerDrag: {
          keys: 'Left mouse button',
          description: 'Drag to pan',
        },
        pointerZoom: {
          keys: 'Scroll wheel',
          description: 'Zoom',
        },
        keyboardZoom: {
          keys: 'Shift + = / Shift + -',
          description: 'Zoom in or out',
        },
        touchDrag: {
          keys: 'Touch',
          description: 'Drag the left half to move and the right half to pan',
        },
        touchPinch: {
          keys: 'Pinch',
          description: 'Zoom',
        },
        cyclePoi: {
          keys: 'Q / E',
          description: 'Cycle POIs',
        },
        toggleTextMode: {
          keys: 'T',
          description: 'Switch to text mode',
        },
        lightingDebug: {
          keys: 'Shift + L',
          description: 'Toggle lighting debug view',
        },
      },
      interact: {
        defaultLabel: 'Enter',
        description: 'Interact',
        promptTemplates: {
          default: 'Interact with {title}',
          inspect: 'Inspect {title}',
          activate: 'Activate {title}',
        },
      },
      helpButton: {
        labelTemplate: 'Open menu · Press {shortcut}',
        announcementTemplate:
          'Open settings and help. Press {shortcut} to review controls and accessibility tips.',
        shortcutFallback: 'H',
      },
      menu: {
        controls: {
          label: 'Controls',
          keyHint: 'C',
          title: 'Open controls (C)',
        },
        text: {
          label: 'Text',
          keyHint: 'T',
          title: 'Switch to text mode (T)',
        },
        settings: {
          label: 'Settings',
          keyHint: 'H',
          title: 'Open settings and help (H)',
        },
      },
      mobileToggle: {
        expandLabel: 'Show all controls',
        collapseLabel: 'Hide extra controls',
        expandAnnouncement:
          'Showing the full controls list for mobile players.',
        collapseAnnouncement: 'Hiding extra controls to keep the list compact.',
      },
    },
    movementLegend: {
      defaultDescription: 'Interact',
      labels: {
        keyboard: 'Enter',
        pointer: 'Click',
        touch: 'Tap',
        gamepad: 'A',
      },
      interactPromptTemplates: {
        default: '{prompt}',
        keyboard: 'Press {label} to {prompt}',
        pointer: '{label} to {prompt}',
        touch: '{label} to {prompt}',
        gamepad: 'Press {label} to {prompt}',
      },
    },
    customization: {
      heading: 'Customization',
      description:
        'Tune the mannequin style and companion gear for the current mission.',
      variants: {
        title: 'Avatar style',
        description: 'Switch outfits for the mannequin explorer.',
        options: {
          portfolio: {
            label: 'Portfolio',
            description: 'Signature dusk suit with neon visor highlights.',
          },
          casual: {
            label: 'Casual',
            description:
              'Sunset hoodie with teal accents for relaxed walkthroughs.',
          },
          formal: {
            label: 'Formal',
            description: 'Charcoal blazer with gilded trims for keynote demos.',
          },
        },
        selectedAnnouncementTemplate: '{label} avatar selected.',
      },
      accessories: {
        title: 'Accessories',
        description:
          'Toggle the wrist console or holographic drone companions.',
        options: {
          'wrist-console': {
            label: 'Wrist console',
            description:
              'Wearable telemetry cuff that mirrors HUD diagnostics.',
          },
          'holo-drone': {
            label: 'Holographic drone',
            description: 'Shoulder scout drone with a gentle orbiting glow.',
          },
        },
        enabledAnnouncementTemplate: '{label} enabled.',
        disabledAnnouncementTemplate: '{label} disabled.',
      },
    },
    audioSubtitles: {
      labels: {
        ambient: 'Ambient audio',
        poi: 'Priority caption',
      },
      dismissLabels: {
        ambient: 'Dismiss caption',
        poi: 'Dismiss priority caption',
      },
    },
    audioControl: {
      keyHint: 'M',
      groupLabel: 'Ambient audio controls',
      toggle: {
        onLabelTemplate: 'Audio: On · Press {keyHint} to mute',
        offLabelTemplate: 'Audio: Off · Press {keyHint} to unmute',
        titleTemplate: 'Toggle ambient audio ({keyHint})',
        announcementOnTemplate: 'Ambient audio on. Press {keyHint} to toggle.',
        announcementOffTemplate:
          'Ambient audio off. Press {keyHint} to toggle.',
        pendingAnnouncementTemplate:
          'Switching ambient audio state. Please wait…',
      },
      slider: {
        label: 'Ambient volume',
        ariaLabel: 'Ambient audio volume',
        hudLabel: 'Ambient audio volume slider.',
        valueAnnouncementTemplate: 'Ambient audio volume {volume}.',
        mutedAnnouncementTemplate:
          'Ambient audio muted. Volume set to {volume}.',
        mutedValueTemplate: 'Muted · {volume}',
        mutedAriaValueTemplate: 'Muted ({volume})',
      },
    },
    localeToggle: {
      title: 'Language',
      description: 'Switch the HUD language and direction.',
      options: {
        en: { label: 'English', direction: 'ltr' },
        ja: { label: '日本語', direction: 'ltr' },
        ar: { label: 'العربية', direction: 'rtl' },
        'zh-Hans': { label: '中文（简体）', direction: 'ltr' },
        es: { label: 'Español', direction: 'ltr' },
        pt: { label: 'Português', direction: 'ltr' },
        de: { label: 'Deutsch', direction: 'ltr' },
        hu: { label: 'Magyar', direction: 'ltr' },
        'en-x-pseudo': { label: 'Pseudo', direction: 'ltr' },
      },
      switchingAnnouncementTemplate: 'Switching to {target} locale…',
      selectedAnnouncementTemplate: '{label} locale selected.',
      failureAnnouncementTemplate:
        'Unable to switch to {target}. Staying on {current} locale.',
    },
    debugCoordinates: {
      labelEnabled: 'Debug coordinates on',
      labelDisabled: 'Debug coordinates off',
      descriptionEnabled:
        'Shows the XYZ, floor, camera, and stair debug overlay.',
      descriptionDisabled:
        'Debug coordinates stay hidden until you turn them on.',
      overlayLabel: 'Debug coordinates',
      labels: {
        position: 'XYZ',
        activeFloor: 'Active floor',
        predictedFloor: 'Predicted stair floor',
        cameraZoom: 'Camera zoom',
        stairWidth: 'Stair width',
        landing: 'Landing',
        stairNav: 'Stair nav area',
        stairZone: 'Stair zone',
        room: 'Room',
      },
      values: {
        yes: 'Yes',
        no: 'No',
        none: 'None',
      },
    },
    debugColliders: {
      labelEnabled: 'Collider overlay on',
      labelDisabled: 'Collider overlay off',
      descriptionEnabled:
        'Shows invisible walls and collision rectangles for the active floor.',
      descriptionDisabled:
        'Invisible walls and collision rectangles stay hidden until you turn them on.',

      idsLabelEnabled: 'Collider IDs on',
      idsLabelDisabled: 'Collider IDs off',
      idsDescriptionEnabled:
        'Shows collider ID labels while the collider overlay is on.',
      idsDescriptionDisabled:
        'Hides collider ID labels while keeping collider wireframes available.',
      solidIdsLabelEnabled: 'Solid IDs on',
      solidIdsLabelDisabled: 'Solid IDs off',
      solidIdsDescriptionEnabled:
        'Shows stable IDs and wireframes for visible scene solids.',
      solidIdsDescriptionDisabled:
        'Stable solid IDs and wireframes stay hidden.',
      fpsLabelEnabled: 'FPS counter on',
      fpsLabelDisabled: 'FPS counter off',
      fpsDescriptionEnabled:
        'Shows a non-interactive stats.js FPS panel for immersive diagnostics.',
      fpsDescriptionDisabled:
        'Hides the stats.js FPS panel while keeping diagnostics available.',
    },

    lowFpsRecovery: {
      title: 'Low frame rate detected',
      body: 'Immersive mode is running slowly. You can lower graphics or switch to non-immersive mode.',
      dismissLabel: 'Dismiss',
      downgradeBalancedLabel: 'Switch to Balanced',
      downgradePerformanceLabel: 'Switch to Performance',
      textModeLabel: 'Use non-immersive mode',
      announcement: 'Low frame rate detected. Recovery actions are available.',
    },
    graphicsQuality: {
      title: 'Graphics Quality',
      description: 'Pick a preset that matches your device performance.',
      options: {
        cinematic: {
          label: 'Cinematic',
          description:
            'Full post-processing, highest-detail 3D models, cinematic bloom and lighting.',
        },
        balanced: {
          label: 'Balanced',
          description:
            'Moderate bloom, reduced resolution, and medium-detail 3D models for laptops.',
        },
        performance: {
          label: 'Performance',
          description:
            'Disables bloom, lowers resolution, and uses lowest-detail 3D models to prioritize FPS.',
        },
      },
      selectedAnnouncementTemplate: '{label} preset selected.',
    },
    accessibilityPresets: {
      title: 'Accessibility Presets',
      description: 'Tune motion assists and HUD contrast.',
      options: {
        standard: {
          label: 'Standard',
          description: 'Default visuals and audio balance.',
        },
        calm: {
          label: 'Calm',
          description:
            'Softens bloom, LED glow, and ambient audio for a gentler pass.',
        },
        'high-contrast': {
          label: 'High contrast',
          description:
            'Boosts HUD readability while keeping motion cues active.',
        },
        photosensitive: {
          label: 'Photosensitive safe',
          description:
            'Disables bloom, dulls emissives, and boosts HUD contrast.',
        },
      },
      selectedAnnouncementTemplate: '{label} preset selected.',
    },
    motionBlur: {
      heading: 'Motion blur intensity',
      description:
        'Adjust the trail effect applied to fast camera and avatar movement.',
      groupAriaLabel: 'Motion blur controls',
      sliderAnnouncement: 'Motion blur intensity changed.',
      values: {
        off: 'Off',
        lowTemplate: '{percent}% · Low trails',
        mediumTemplate: '{percent}% · Medium trails',
        highTemplate: '{percent}% · High trails',
      },
    },
    softwareRendererWarning: {
      fallbackRendererLabel: 'software WebGL renderer',
      title: 'Software rendering detected',
      descriptionTemplate:
        'Chrome is using {renderer} instead of hardware acceleration. Basic Render Driver, SwiftShader, WARP, and llvmpipe can crash under continuous WebGL animation.',
      recommendation:
        'Enable browser hardware acceleration for the smooth immersive portfolio. Safe immersive mode keeps screenshots and debugging available at a capped frame rate.',
      continueSafeLabel: 'Continue in safe immersive',
      continuousLabel: 'Enable continuous immersive anyway',
      textModeLabel: 'Use text mode',
      reloadSafeLabel: 'Reload this safe immersive URL',
    },
    modeToggle: {
      keyHint: 'T',
      idleLabelTemplate: 'Text mode · Press {keyHint}',
      idleDescriptionTemplate: 'Switch to the text-only portfolio',
      idleAnnouncementTemplate:
        'Switch to the text-only portfolio. Press {keyHint} to activate.',
      idleTitleTemplate: 'Switch to the text-only portfolio ({keyHint})',
      pendingLabelTemplate: 'Switching to text mode…',
      pendingAnnouncementTemplate:
        'Switch to the text-only portfolio. Switching to text mode…',
      activeLabelTemplate: 'Try immersive again · Press {keyHint}',
      activeDescriptionTemplate: 'Return to the immersive portfolio.',
      activeAnnouncementTemplate:
        'Text mode active. Press {keyHint} to try immersive again.',
      errorLabelTemplate: 'Retry text mode · Press {keyHint}',
      errorDescriptionTemplate:
        'Text mode toggle failed. Try again or use the immersive link.',
      errorAnnouncementTemplate:
        'Text mode toggle failed. Press {keyHint} to try again.',
      errorTitleTemplate:
        'Text mode toggle failed. Press {keyHint} to retry text mode.',
    },
    poiOverlay: {
      visited: 'Visited',
      prototype: 'Prototype',
      live: 'Live',
      closeDetails: 'Close POI details',
      relatedCaseStudies: 'Related case studies',
      outcomeFallbackLabel: 'Outcome',
      debugDetailsLabel: 'Debug details',
      debugPoiAnchor: 'POI anchor',
      debugModelTriangles: 'Model triangles',
      discoveryAnnouncementTemplate: '{title} discovered. {summary}',
    },
    helpModal: {
      heading: 'Settings & Help',
      description: [
        'Adjust accessibility presets, graphics quality, audio, and review shortcuts.',
        'Use the help shortcut (default H or ?) to toggle this panel.',
      ].join(' '),
      closeLabel: 'Close',
      closeAriaLabel: 'Close help',
      settings: {
        heading: 'Experience settings',
        description: [
          'Tune audio, video, and accessibility preferences.',
          'These controls stay available even when the menu is closed via keyboard shortcuts.',
        ].join(' '),
      },
      sections: [
        {
          id: 'accessibility',
          title: 'Accessibility & Failover',
          items: [
            {
              label: 'Low performance',
              description:
                'The scene suggests recovery actions if average FPS stays below 5 for 10 seconds.',
            },
            {
              label: 'Manual toggle',
              description:
                'Use the on-screen Text mode button or press T at any time.',
            },
            {
              label: 'Motion blur slider',
              description:
                'Adjust trail strength with the Settings → Motion blur control.',
            },
            {
              label: 'Ambient audio',
              description: 'Toggle with the Audio button or press M.',
            },
          ],
        },
      ],
      announcements: {
        open: 'Help menu opened. Review controls and settings.',
        close: 'Help menu closed.',
      },
    },
  },
  poi: {
    'futuroptimist-living-room-tv': {
      title: 'Futuroptimist',
      summary:
        'Futuroptimist hub for open-source scripts, data pipelines, tests, and YouTube-oriented automation metadata.',
      outcome: {
        label: 'Outcome',
        value:
          'Documents setup, tests, prompt automation, and related projects for the Futuroptimist ecosystem.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        {
          label: 'Workflow',
          value: 'uv, Make targets, pytest, and GitHub Actions',
        },
        {
          label: 'Focus',
          value: 'Scripts, prompt docs, related-project status',
        },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist' },
        { label: 'YouTube', href: 'https://www.youtube.com/@futuroptimist' },
      ],
    },
    'tokenplace-studio-cluster': {
      title: 'token.place',
      summary:
        'Secure peer-to-peer generative AI platform with relay and compute-node paths for sharing idle compute as a public-good network.',
      outcome: {
        label: 'Outcome',
        value:
          'Quickstart docs cover the Python relay, compute server, Docker Compose, tests, and E2EE API v1 guardrails.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'token.place',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        {
          label: 'Runtime',
          value: 'Python relay.py and server.py entrypoints',
        },
        { label: 'Security', value: 'API v1 relay-blind E2EE baseline' },
      ],
      links: [
        { label: 'Site', href: 'https://token.place' },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/token.place',
        },
      ],
    },
    'gabriel-studio-sentry': {
      title: 'Gabriel',
      summary:
        'Open-source "guardian angel" LLM focused on private, local security advice and optional local AI-assisted monitoring.',
      outcome: {
        label: 'Outcome',
        value:
          'The README emphasizes consent, local inference, personal environment knowledge, and actionable security coaching.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gabriel',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Focus', value: 'Privacy-first digital security coaching' },
        { label: 'Docs', value: 'FAQ and project docs in-repo' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/gabriel' },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel',
      summary: [
        'Opinionated boilerplate and CLI for reproducible CI, code quality, docs, prompts, and repo audits.',
      ].join(' '),
      outcome: {
        label: 'Outcome',
        value:
          'Provides init/update commands, checks, Codex prompt docs, audits, and dry-run improvement suggestions.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'flywheel',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        {
          label: 'Automation',
          value: 'init/update CLI · checks · prompt docs',
        },
        {
          label: 'CAD',
          value: 'Flywheel stand, shaft, adapter, and physics docs',
        },
      ],
      links: [
        {
          label: 'Flywheel Repo',
          href: 'https://github.com/futuroptimist/flywheel',
        },
      ],
      interactionPrompt: 'Engage {title} systems',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot3000',
      summary:
        'Self-hosted, open-source job search copilot with a local experimental web interface and documented setup.',
      outcome: {
        label: 'Outcome',
        value:
          'The README warns the web UI is local-only while docs cover setup, architecture, configuration, and tests.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'jobbot3000',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        {
          label: 'Status',
          value: 'Self-hosted copilot with local web preview',
        },
        { label: 'Stack', value: 'Node.js 20+ · npm scripts' },
        { label: 'Safety', value: 'Local-only warning for secrets and PII' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
      ],
    },
    'axel-studio-tracker': {
      title: 'Axel',
      summary:
        'Goal and quest tracker that organizes repos with agentic LLMs, analytics helpers, and a pipx-friendly CLI.',
      outcome: {
        label: 'Outcome',
        value:
          'Alpha releases keep README, FAQ, and threat model coverage in sync with the pytest suite.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'axel',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Status', value: 'Alpha · pipx install axel' },
        {
          label: 'Repo analytics',
          value: 'Quest planning from repo lists and scans',
        },
        {
          label: 'Docs',
          value: 'FAQ · known issues · threat model kept with tests',
        },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/axel' },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves',
      summary:
        'CLI that turns GitHub contribution data into OpenSCAD and STL models for 3D-printed Gridfinity shelves.',
      outcome: {
        label: 'Outcome',
        value:
          'Exports SCAD/STL pairs with metadata so printed shelves mirror contribution timelines.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'gitshelves',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Material', value: '42 mm Gridfinity compatible blocks' },
        { label: 'Sync', value: 'Auto generated from GitHub timelines' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/gitshelves',
        },
      ],
    },
    'danielsmith-portfolio-table': {
      title: 'danielsmith.io',
      summary:
        'Orthographic Three.js/WebGL portfolio with keyboard navigation and a resilient text fallback for accessibility.',
      outcome: {
        label: 'Outcome',
        value: 'Keeps immersive and text deploys aligned across every release.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Stack', value: 'Vite · Three.js · accessibility HUD' },
        { label: 'Deploy', value: 'CI smoke + docs + lint gates' },
      ],
      links: [
        { label: 'Live Site', href: 'https://danielsmith.io' },
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/danielsmith.io',
        },
      ],
    },
    'f2clipboard-kitchen-console': {
      title: 'f2clipboard',
      summary:
        'CLI that ingests Codex task pages and GitHub logs, redacts secrets, and emits ready-to-paste Markdown summaries.',
      outcome: {
        label: 'Outcome',
        value:
          'Automates CI log collection and summarization for quick debugging handoff.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'f2clipboard',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Flow', value: 'Codex task → GitHub PR checks → Markdown' },
        {
          label: 'Safety',
          value: 'Secret redaction before summaries or output',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/f2clipboard',
        },
      ],
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma',
      summary:
        'ESP32 "AI pin" that streams push-to-talk audio to Whisper and returns TTS in a 3D-printed OpenSCAD enclosure.',
      outcome: {
        label: 'Outcome',
        value:
          'Includes firmware, enclosure CAD, STL exports, and assembly docs kept fresh by CI.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sigma',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Hardware', value: 'ESP32 · OpenSCAD enclosure' },
        { label: 'Modes', value: 'Push-to-talk · Whisper + TTS relay' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove',
      summary:
        'Open-source toolkit for learning knitting and crochet while building toward robotic knitting hardware with OpenSCAD parts.',
      outcome: {
        label: 'Outcome',
        value:
          'Docs cover hand-craft basics, gauge calculators, pattern translation, and tension profiles.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'wove',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Craft', value: 'Knitting and crochet learning docs' },
        {
          label: 'Automation',
          value: 'Pattern CLI, planner exports, OpenSCAD hardware',
        },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/wove' },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE',
      summary:
        'Public DSPACE exhibit for the Democratized Space web idle game, focused on quests, resources, exploration, and launch-to-orbit progression.',
      outcome: {
        label: 'Outcome',
        value:
          'Keeps private democratizedspace/dspace repository metadata unavailable while linking official game documentation instead of an unverified mission log.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'democratizedspace',
            repo: 'dspace',
            visibility: 'public',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Game', value: 'Resource management · quests · exploration' },
        { label: 'Docs', value: 'Public docs and developer guide' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/democratizedspace/dspace',
        },
        { label: 'Docs', href: 'https://democratized.space/docs' },
      ],
      interactionPrompt: 'Launch {title} countdown',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper',
      summary:
        'One-button GitHub Action that closes open pull requests authored by you, with a dry-run preview before reaping.',
      outcome: {
        label: 'Outcome',
        value:
          'README documents token setup, workflow dispatch, dry-run summaries, and the gh-powered lookup.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'pr-reaper',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Sweep', value: 'Close your own open PRs in bulk' },
        { label: 'Safety', value: 'dry_run=true preview and step summary' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/pr-reaper' },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube',
      summary:
        'Accessible k3s platform for Raspberry Pis and SBCs integrated with an off-grid solar cube installation.',
      outcome: {
        label: 'Outcome',
        value:
          'Docs cover the 3-node HA k3s happy path, Raspberry Pi imaging, flashing, verification, and solar hardware notes.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'sugarkube',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        {
          label: 'Platform',
          value:
            'k3s, Kubernetes helpers, Cloudflare tunnels, and solar tilt/irrigation notes',
        },
        {
          label: 'Hardware',
          value: 'Solar cube CAD, Pi carrier plates, electronics docs',
        },
        {
          label: 'Guides',
          value: 'Field guides for Pi images and headless provisioning',
        },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sugarkube' },
      ],
    },
  },
};
