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
        resumeUrl: 'docs/resume/2025-09/resume.pdf',
      },
      actions: {
        immersiveLink: 'Launch immersive mode',
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
      },
      accessories: {
        title: 'Accessories',
        description:
          'Toggle the wrist console or holographic drone companions.',
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
      switchingAnnouncementTemplate: 'Switching to {target} locale…',
      selectedAnnouncementTemplate: '{label} locale selected.',
      failureAnnouncementTemplate:
        'Unable to switch to {target}. Staying on {current} locale.',
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
      activeLabelTemplate: 'Text mode active',
      activeDescriptionTemplate: 'Text mode already active.',
      activeAnnouncementTemplate: 'Text mode already active.',
      errorLabelTemplate: 'Retry text mode · Press {keyHint}',
      errorDescriptionTemplate:
        'Text mode toggle failed. Try again or use the immersive link.',
      errorAnnouncementTemplate:
        'Text mode toggle failed. Press {keyHint} to try again.',
      errorTitleTemplate:
        'Text mode toggle failed. Press {keyHint} to retry text mode.',
    },
    narrativeLog: {
      heading: 'Creator story log',
      visitedHeading: 'Visited exhibits',
      empty:
        'Visit exhibits to unlock narrative entries chronicling the creator showcase.',
      defaultVisitedLabel: 'Visited',
      visitedLabelTemplate: 'Visited at {time}',
      liveAnnouncementTemplate: '{title} added to the creator story log.',
      journey: {
        heading: 'Journey beats',
        empty: 'Explore new exhibits to weave journey narration.',
        entryLabelTemplate: '{from} → {to}',
        sameRoomTemplate:
          'Within the {room} {descriptor}, the story shifts from {fromPoi} toward {toPoi}.',
        crossRoomTemplate:
          'Leaving the {fromRoom} {fromDescriptor}, the journey drifts into the {toRoom} {toDescriptor} to spotlight {toPoi}.',
        crossSectionTemplate:
          'Stepping {direction} through the threshold, the path flows into the {toRoom} {toDescriptor} to reach {toPoi}.',
        fallbackTemplate: 'The narrative flows toward {toPoi}.',
        announcementTemplate: 'Journey update — {label}: {story}',
        directions: {
          indoors: 'back inside',
          outdoors: 'outdoors',
        },
      },
      rooms: {
        livingRoom: {
          label: 'living room',
          descriptor: 'cinematic lounge',
          zone: 'interior',
        },
        studio: {
          label: 'studio',
          descriptor: 'automation lab',
          zone: 'interior',
        },
        kitchen: {
          label: 'kitchen lab',
          descriptor: 'culinary robotics wing',
          zone: 'interior',
        },
        backyard: {
          label: 'backyard observatory',
          descriptor: 'dusk-lit garden',
          zone: 'exterior',
        },
      },
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
          id: 'movement',
          title: 'Movement & Camera',
          items: [
            {
              label: 'WASD / Arrow keys',
              description: 'Roll the explorer around the home.',
            },
            { label: 'Mouse drag', description: 'Pan the isometric camera.' },
            { label: 'Scroll wheel', description: 'Adjust zoom level.' },
            {
              label: 'Touch joysticks',
              description:
                'Drag the left pad to move and the right pad to pan.',
            },
            { label: 'Pinch', description: 'Zoom on touch devices.' },
          ],
        },
        {
          id: 'interactions',
          title: 'Interactions',
          items: [
            {
              label: 'Approach glowing POIs',
              description:
                'Press your interact key (Enter/Space/F), tap, or click to open the exhibit overlay.',
            },
            {
              label: 'Q / E or ← / →',
              description:
                'Cycle focus between points of interest with the keyboard.',
            },
            {
              label: 'T',
              description:
                'Toggle between immersive mode and the text fallback.',
            },
            {
              label: 'Shift + L',
              description: 'Compare cinematic lighting with the debug pass.',
            },
          ],
        },
        {
          id: 'accessibility',
          title: 'Accessibility & Failover',
          items: [
            {
              label: 'Low performance',
              description:
                'The scene automatically switches to text mode below 30 FPS.',
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
      title: 'Futuroptimist Creator Desk',
      summary:
        'Automated Futuroptimist scripting desk that stitches research, outlines, and narration-ready drafts for new videos.',
      outcome: {
        label: 'Outcome',
        value:
          'Keeps weekly highlight scripts flowing from the automation pipeline without manual formatting.',
      },
      metrics: [
        {
          label: 'Stars',
          value: '1,280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} stars',
            fallback: '1,280+',
          },
        },
        {
          label: 'Workflow',
          value: 'Resolve-style edit suite · triple display',
        },
        { label: 'Focus', value: 'Futuroptimist ecosystem reels in progress' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist' },
        { label: 'Docs', href: 'https://futuroptimist.dev' },
      ],
      narration: {
        caption:
          'Futuroptimist media wall radiates highlight reels across the living room.',
      },
    },
    'tokenplace-studio-cluster': {
      title: 'token.place Compute Rack',
      summary:
        'Secure peer-to-peer generative AI platform running on a Raspberry Pi lattice with encrypted relay and server nodes.',
      outcome: {
        label: 'Outcome',
        value:
          'Quickstart scripts bring up the relay, server, and mock LLM stack locally for testing.',
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
        { label: 'Cluster', value: '12× Pi 5 nodes in modular bays' },
        { label: 'Network', value: 'Ephemeral tokens · encrypted bursts' },
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
      title: 'Gabriel Sentinel Rover',
      summary:
        'Privacy-first "guardian angel" LLM that delivers local security coaching and integrates with token.place or offline inference.',
      outcome: {
        label: 'Outcome',
        value:
          'Modular ingestion, analysis, notification, and UI stacks stay aligned through typed interfaces.',
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
        { label: 'Focus', value: '360° lidar sweep + local heuristics' },
        { label: 'Cadence', value: 'Red alert flash every 1.0 s' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/gabriel' },
      ],
    },
    'flywheel-studio-flywheel': {
      title: 'Flywheel Kinetic Hub',
      summary: [
        'GitHub template and automation hub that bundles linting, tests, docs, and Codex prompts for fast repo bootstrapping.',
      ].join(' '),
      outcome: {
        label: 'Outcome',
        value:
          'Ships repeatable CI (lint, tests, docs) and prompt libraries so new repos start healthy.',
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
          value: 'CI scaffolds · typed prompts · QA loops',
        },
        { label: 'Docs CTA', value: 'flywheel.futuroptimist.dev →' },
      ],
      links: [
        {
          label: 'Flywheel Repo',
          href: 'https://github.com/futuroptimist/flywheel',
        },
        { label: 'Docs', href: 'https://flywheel.futuroptimist.dev' },
      ],
      narration: {
        caption:
          'Flywheel kinetic hub whirs alive, spotlighting automation prompts and tooling.',
      },
      interactionPrompt: 'Engage {title} systems',
    },
    'jobbot-studio-terminal': {
      title: 'Jobbot Holographic Terminal',
      summary:
        'Self-hosted job search copilot with CLI and experimental web UI for ingesting outreach and tracking applications.',
      outcome: {
        label: 'Outcome',
        value:
          'End-to-end workflows mirror docs and tests so recruiter outreach flows stay covered.',
      },
      metrics: [
        { label: 'Status', value: 'Local-first CLI with preview web UI' },
        {
          label: 'Stack',
          value: 'Node.js 20+ · npm scripts · Playwright preview',
        },
        {
          label: 'Flows',
          value: 'Recruiter outreach ingestion and lifecycle tracking',
        },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/jobbot3000',
        },
        {
          label: 'Automation Log',
          href: 'https://futuroptimist.dev/automation',
        },
      ],
      narration: {
        caption:
          'Jobbot holographic terminal streams automation telemetry in shimmering overlays.',
      },
    },
    'axel-studio-tracker': {
      title: 'Axel Quest Navigator',
      summary:
        'Goal and quest tracker that organizes repos with agentic LLMs, analytics helpers, and a pipx-friendly CLI.',
      outcome: {
        label: 'Outcome',
        value:
          'Alpha releases keep README, FAQ, and threat model coverage in sync with the pytest suite.',
      },
      metrics: [
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
      title: 'Gitshelves Living Room Array',
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
      title: 'danielsmith.io Holographic Map',
      summary:
        'Orthographic Three.js/WebGL portfolio with keyboard navigation and a resilient text fallback for accessibility.',
      outcome: {
        label: 'Outcome',
        value: 'Keeps immersive and text deploys aligned across every release.',
      },
      metrics: [
        {
          label: 'Stars',
          value: '1,280+',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'danielsmith.io',
            format: 'compact',
            template: '{value} stars',
            fallback: '1,280+',
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
      title: 'f2clipboard Incident Console',
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
        { label: 'Speed', value: 'Copy failing logs in under 3 s' },
        { label: 'Formats', value: 'CLI + clipboard + Markdown output' },
      ],
      links: [
        {
          label: 'GitHub',
          href: 'https://github.com/futuroptimist/f2clipboard',
        },
      ],
    },
    'sigma-kitchen-workbench': {
      title: 'Sigma Fabrication Bench',
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
        { label: 'Hardware', value: 'ESP32 · on-device speech stack' },
        { label: 'Modes', value: 'Push-to-talk · local inference loops' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove Fiber Loom',
      summary:
        'Open-source toolkit for learning knitting and crochet while building toward a robotic loom with OpenSCAD hardware.',
      outcome: {
        label: 'Outcome',
        value:
          'Docs cover gauge calculators, planner exports, and tension profiles across yarn weights.',
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
        { label: 'Craft', value: 'Loom calibrates from CAD stitch maps' },
        { label: 'Roadmap', value: 'Path toward robotic weaving labs' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/wove' },
      ],
    },
    'dspace-backyard-rocket': {
      title: 'DSPACE Launch Pad',
      summary:
        'Backyard launch gantry for the private DSPACE rocket project with telemetry-guided countdown cues and a public mission log.',
      outcome: {
        label: 'Outcome',
        value:
          'Maintains countdown sequencing notes alongside GitHub and mission log links while the repo remains private.',
      },
      metrics: [
        {
          label: 'Stars',
          value: 'Syncing from GitHub…',
          source: {
            type: 'githubStars',
            owner: 'futuroptimist',
            repo: 'dspace',
            visibility: 'private',
            format: 'compact',
            template: '{value} stars',
            fallback: 'Syncing from GitHub…',
          },
        },
        { label: 'Countdown', value: 'Autonomous T-0 sequencing' },
        { label: 'Stack', value: 'Three.js FX · Spatial audio' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/dspace' },
        {
          label: 'Mission Log',
          href: 'https://futuroptimist.dev/projects/dspace',
        },
      ],
      narration: {
        caption:
          'dSpace launch pad crackles with countdown energy beside the backyard path.',
        durationMs: 6000,
      },
      interactionPrompt: 'Launch {title} countdown',
    },
    'pr-reaper-backyard-console': {
      title: 'PR Reaper Automation Gate',
      summary:
        'GitHub Actions workflow that bulk-closes stale pull requests with dry-run previews and optional branch cleanup.',
      outcome: {
        label: 'Outcome',
        value:
          'One-button workflow documents inputs, safety model, and audit outputs in the README.',
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
        { label: 'Sweep', value: 'Bulk-close stale PRs with preview mode' },
        { label: 'Cadence', value: 'Cron triggers + manual dry-runs' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/pr-reaper' },
      ],
    },
    'sugarkube-backyard-greenhouse': {
      title: 'Sugarkube Solar Greenhouse',
      summary:
        'k3s-on-Raspberry-Pi platform paired with an off-grid solar cube installation documented with CAD, Pi images, and field guides.',
      outcome: {
        label: 'Outcome',
        value:
          'Step-by-step docs cover solar hardware, Pi provisioning, and Kubernetes helpers for resilient homelabs.',
      },
      metrics: [
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
        {
          label: 'Greenhouse Log',
          href: 'https://futuroptimist.dev/projects/sugarkube',
        },
      ],
      narration: {
        caption:
          'Sugarkube greenhouse cycles soft grow lights and koi pond ambience in sync.',
        durationMs: 6500,
      },
    },
  },
};
