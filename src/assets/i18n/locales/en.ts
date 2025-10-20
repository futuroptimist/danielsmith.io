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
        defaultLabel: 'F',
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
        keyboard: 'F',
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
                'Press your interact key (default F), tap, or click to open the exhibit overlay.',
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
        'Triple-monitor editing bay capturing Futuroptimist releases with a live showreel, timeline, and automation overlays.',
      metrics: [
        { label: 'Stars', value: '1,280+' },
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
        '3D-printed Raspberry Pi lattice orchestrating the token.place volunteer compute mesh with pulsing status beacons.',
      metrics: [
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
        'Autonomous sentry robot with a rotating scanner that sweeps the studio and fires a red perimeter pulse every second.',
      metrics: [
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
        'Kinetic automation hub that accelerates with approach, revealing tech stack glow',
        'and docs callouts.',
      ].join(' '),
      metrics: [
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
        'Holographic command desk broadcasting live telemetry from the Jobbot3000 automation mesh.',
      metrics: [
        { label: 'Ops savings', value: 'Recovered 6h weekly toil' },
        { label: 'Reliability', value: '99.98% SLA self-healing loops' },
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
        'Tabletop command slate where Axel curates next-step quests, projecting repo insights and backlog momentum rings.',
      metrics: [
        {
          label: 'Guidance',
          value: 'Auto-prioritised quests from repo scans',
        },
        { label: 'Modes', value: 'Focus · explore toggles per sprint' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/axel' },
      ],
    },
    'gitshelves-living-room-installation': {
      title: 'Gitshelves Living Room Array',
      summary:
        'Modular wall of 3D-printed commit blocks that transform GitHub streaks into physical shelving mosaics.',
      metrics: [
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
        'Holotable overview of danielsmith.io with layered navigation routes, accessibility presets, and deploy targets.',
      metrics: [
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
        'Kitchen-side diagnostics station where f2clipboard parses Codex logs and pipes concise summaries straight to the clipboard.',
      metrics: [
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
        'Workbench showcasing the Sigma ESP32 AI pin with on-device speech, local inference, and 3D-printed shells.',
      metrics: [
        { label: 'Hardware', value: 'ESP32 · on-device speech stack' },
        { label: 'Modes', value: 'Push-to-talk · local inference loops' },
      ],
      links: [
        { label: 'GitHub', href: 'https://github.com/futuroptimist/sigma' },
      ],
    },
    'wove-kitchen-loom': {
      title: 'Wove Loom Atelier',
      summary:
        'Soft robotics loom where Wove bridges CAD workflows with textiles while teaching knit and crochet fundamentals.',
      metrics: [
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
        'Backyard launch gantry staging the DSPACE model rocket with telemetry-guided countdown cues.',
      metrics: [
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
        'Backyard control gate that visualises pr-reaper sweeping stale pull requests with safe dry-runs and audit logs.',
      metrics: [
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
        'Adaptive greenhouse showcasing Sugarkube automation with responsive grow lights and solar tracking.',
      metrics: [
        {
          label: 'Automation',
          value: 'Sugarkube schedules solar tilt + irrigation',
        },
        { label: 'Throughput', value: '3× daily harvest cadence maintained' },
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
