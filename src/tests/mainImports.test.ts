import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const mainPath = resolve(currentDir, '../main.ts');
const readMainSource = () => readFileSync(mainPath, 'utf-8');

describe('main module imports', () => {
  it('keeps camera-relative yaw helpers wired in', () => {
    const source = readMainSource();
    expect(source).toMatch(
      /import\s*\{[^}]*\bcomputeCameraRelativeYaw\b[^}]*\}\s*from '\.\/systems\/movement\/facing';/
    );
  });

  it('falls back to a URL scene-detail reload handoff when sessionStorage is blocked', () => {
    const source = readMainSource();

    expect(source).toContain(
      "const PENDING_SCENE_DETAIL_RELOAD_PARAM = 'sceneDetailReloadLevel';"
    );
    expect(source).toContain('function reloadWithPendingSceneDetailParam');
    expect(source).toContain(
      'url.searchParams.set(PENDING_SCENE_DETAIL_RELOAD_PARAM, level);'
    );
    expect(source).toContain('window.location.assign(url.toString());');
    expect(source).toContain('if (reloadWithPendingSceneDetailParam(level))');
  });

  it('does not reload when no scene-detail handoff can be persisted', () => {
    const source = readMainSource();

    expect(source).toContain(
      'window.sessionStorage.getItem(PENDING_SCENE_DETAIL_RELOAD_KEY) === level'
    );
    expect(source).toMatch(
      /if \(persistPendingSceneDetailReloadLevel\(level\)\) \{\s*window\.location\.reload\(\);\s*return;\s*\}/
    );
    expect(source).toContain(
      '[performance] scene detail reload handoff unavailable; applying policy without reload'
    );
  });
});
