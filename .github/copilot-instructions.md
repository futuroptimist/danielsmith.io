# GitHub Copilot Instructions for danielsmith.io

This repository is a production-ready Vite + Three.js web application featuring an
immersive 3D environment. Follow these guidelines when working with Copilot.

## Project Overview

- **Stack**: TypeScript + Three.js + Vite
- **Architecture**: Data-driven scene composition with accessibility-first HUD overlays
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Linting**: ESLint + Prettier with 100-character line length limit

## Code Style & Conventions

### TypeScript Standards

- Use TypeScript for all source files
- Prefer explicit types over `any`
- Export types and interfaces for reusability
- Follow existing naming conventions:
  - PascalCase for classes and types
  - camelCase for functions and variables
  - SCREAMING_SNAKE_CASE for constants

### Line Length & Formatting

- **Maximum line length**: 100 characters (enforced by Prettier)
- Run `npm run format:write` before committing
- Use `npm run format:check` to verify formatting

### Imports & Dependencies

- Prefer existing libraries over adding new dependencies
- Group imports: external libraries first, then internal modules
- Use absolute paths from `src/` root when appropriate
- Follow the import resolver configuration in `.eslintrc.json`

## Architecture Patterns

### Data Flow (State Management)

State flows in one direction: Assets → Systems → Scene → UI

1. **Assets** (`src/assets/`): Immutable data (floor plans, POI metadata, performance budgets,
   i18n strings). Keep these modules side-effect free.
2. **Systems** (`src/systems/`): Transform assets into behavior (keyboard controls, collision,
   audio, failover heuristics). Emit typed handles for consumption.
3. **Scene** (`src/scene/`): Three.js composition (meshes, rigs, lighting). Builders return
   lightweight APIs; tests observe state without mutating internals.
4. **UI** (`src/ui/`): DOM overlays mirror scene state for accessibility. Subscribe to system
   handles; never reach back into scene objects.

### Camera-Relative Movement

The camera is orthographic/isometric with the room rotated ~45°. Directional input is defined
from the camera's perspective:

- North = away from camera (`W` / `ArrowUp`)
- South = toward camera (`S` / `ArrowDown`)
- West/East = `A`/`D` or arrow keys

**IMPORTANT**: Always compute movement vectors and avatar facing camera-relative. Use helpers
from `src/systems/movement/facing.ts`:

- `getCameraRelativeMovementVector(...)`
- Convert vectors to yaw and apply rotation via `rotateYaw`

Never hard-code axis assumptions tied to world coordinates; always derive from camera.

### Points of Interest (POIs)

POIs are data-driven features with:

- Registry in `src/assets/pois/`
- Metadata in TypeScript for automation-friendly updates
- Holographic pedestals with animated tooltips
- DOM overlay mirrors for screen readers
- Proximity-based halos for interaction feedback

When adding or modifying POIs, update both the scene representation and accessibility overlay.

### Testing Requirements

#### Unit Tests (Vitest)

- Place tests in `src/tests/` or `src/**/__tests__/`
- Mirror the structure of the source being tested
- Use Vitest utilities already in the suite
- Export `CI=1` locally to mirror pipeline behavior
- All new features require test coverage

#### E2E Tests (Playwright)

- Place E2E specs in `playwright/`
- Use `npm run test:e2e` to run locally
- Install browsers with: `npx playwright install --with-deps chromium-headless-shell`
- Visual smoke thresholds are defined in `playwright.config.ts`
- Keyboard traversal macro validates accessibility

#### Quality Gates

Run these commands before committing:

```bash
npm run format:write
npm run lint
npm run test:ci
npm run docs:check
npm run smoke
```

Or use the convenience command:

```bash
npm run check
```

## Documentation Standards

- Update `docs/` when behavior, prompts, or workflows change
- Store generated images as SVG or PNG in `docs/assets/`
- Keep README synchronized with feature additions
- Update architecture docs in `docs/architecture/` for structural changes
- Maintain prompt library in `docs/prompts/` for automation

## Common Tasks

### Adding a New System

1. Create module in `src/systems/`
2. Export typed handles for scene/UI consumption
3. Add unit tests in `src/tests/`
4. Update architecture docs if introducing new patterns

### Modifying the Scene

1. Make changes in `src/scene/`
2. Ensure Three.js objects are cleaned up properly (dispose geometries/materials)
3. Test with both performance modes
4. Update visual smoke tests if layout changes
5. Regenerate screenshots if needed: `npm run screenshot`

### Updating Floor Plan

1. Edit layout data in `src/assets/floorplan/`
2. Regenerate diagrams: `npm run floorplan:diagram`
3. Update collision bounds if needed
4. Verify navigation with keyboard traversal test

### Adding UI Overlays

1. Create component in `src/ui/`
2. Subscribe to system handles, not scene objects
3. Include ARIA labels and focus management
4. Test keyboard navigation
5. Update accessibility overlay guide in `docs/guides/`

## Performance Considerations

- Budgets defined in `src/assets/performance.ts`
- See `docs/architecture/performance-budgets.md` for details
- Test enforced in `src/tests/performanceBudget.test.ts`
- Use lazy loading for heavy assets
- Dispose Three.js objects when no longer needed

## Accessibility Guidelines

- Follow checklist in `docs/guides/accessibility-overlays.md`
- Maintain ARIA labels aligned with in-world metadata
- Ensure focus order is logical
- Test with keyboard-only navigation
- Provide text alternatives for visual content
- Consider reduced motion preferences

## Preview & Development

### Local Development

```bash
npm install
npm run dev
```

### Preview with Correct Mode

Always load the immersive scene with query parameters:

```
http://localhost:5173/?mode=immersive&disablePerformanceFailover=1
```

Use `createImmersiveModeUrl(...)` from `src/immersiveUrl.ts` to append additional parameters.

## Commit Standards

When Copilot suggests commit messages:

- Use pattern: `{emoji} : – <summary>`
- Keep body under 72 characters per line
- Focus on concise **what/why** and **how to test**
- Reference issues with `Refs: #<id>` when applicable

## Security

- Never commit secrets
- Run `git diff --cached | ./scripts/scan-secrets.py` before pushing
- Validate user input
- Sanitize data before rendering

## Additional Resources

- Roadmap: `docs/roadmap.md`
- Backlog: `docs/backlog.md`
- Architecture: `docs/architecture/scene-stack.md`
- Prompts: `docs/prompts/`
- Agent playbook: `AGENTS.md`

## When in Doubt

- Review existing code for patterns
- Check related projects in the Futur Optimist org
- Keep trunk green
- Make small, composable changes
- Add clarifying comments or update docs for complex refactors
