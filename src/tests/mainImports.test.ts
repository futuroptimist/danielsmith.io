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
    expect(source).toContain(
      "const PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM = 'sceneDetailAdaptiveLock';"
    );
    expect(source).toContain('function reloadWithPendingSceneDetailParam');
    expect(source).toContain('url.searchParams.set(');
    expect(source).toContain('PENDING_SCENE_DETAIL_RELOAD_PARAM,');
    expect(source).toContain(
      "url.searchParams.set(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_PARAM, '1');"
    );
    expect(source).toContain('window.location.assign(url.toString());');
    expect(source).toContain(
      'if (reloadWithPendingSceneDetailParam(pendingReload))'
    );
  });

  it('carries the adaptive recovery lock through scene-detail reload handoffs', () => {
    const source = readMainSource();

    expect(source).toContain(
      "adaptivePerformanceRecoveryLocked: level === 'performance'"
    );
    expect(source).toContain('initialAdaptivePerformanceRecoveryLocked:');
    expect(source).toContain(
      'sceneDetailReloadOverride?.adaptivePerformanceRecoveryLocked === true'
    );
    expect(source).toContain(
      'return { level: stored, adaptivePerformanceRecoveryLocked: adaptiveLock };'
    );
  });

  it('does not reload when no scene-detail handoff can be persisted', () => {
    const source = readMainSource();

    expect(source).toContain(
      'window.sessionStorage.getItem(PENDING_SCENE_DETAIL_RELOAD_KEY) ==='
    );
    expect(source).toContain(
      'window.sessionStorage.getItem(PENDING_SCENE_DETAIL_ADAPTIVE_LOCK_KEY) ==='
    );
    expect(source).toMatch(
      /if \(persistPendingSceneDetailReload\(pendingReload\)\) \{\s*window\.location\.reload\(\);\s*return;\s*\}/
    );
    expect(source).toContain(
      '[performance] scene detail reload handoff unavailable; applying policy without reload'
    );
  });
});
