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
    expect(source).toMatch(
      /reloadWithPendingSceneDetailParam\(\s*pendingReload,/
    );
    expect(source).toContain('storedX === null');
    expect(source).toContain('storedY === null');
    expect(source).toContain('storedZ === null');
  });

  it('passes generated source IDs and purposes into debug collider metadata', () => {
    const source = readMainSource();

    expect(source).toContain('colliderSourceMetadata.set(instance.collider, {');
    expect(source).toContain("sourceType: 'wall',");
    expect(source).toContain('colliderSourceMetadata.set(collider.bounds, {');
    expect(source).toContain('sourceType: collider.sourceType,');
    expect(source).toContain('purpose: collider.purpose,');
    expect(source).toContain(
      'const sourceMetadata = colliderSourceMetadata.get(bounds);'
    );
    expect(source).toContain('sourceId: sourceMetadata?.sourceId,');
    expect(source).toContain('sourceType: sourceMetadata?.sourceType,');
    expect(source).toContain('purpose: sourceMetadata?.purpose,');
    expect(source).toContain('role: sourceMetadata?.role,');
    expect(source).toContain('intent: sourceMetadata?.intent,');
  });

  it('wires lower-floor furnishings once with generated collider metadata', () => {
    const source = readMainSource();

    expect(source.match(/createLowerFloorFurnishings\(/g) ?? []).toHaveLength(
      1
    );
    expect(source).toContain(
      'groundStructureGroup.add(lowerFloorFurnishings.group);'
    );
    expect(source).toContain(
      'lowerFloorFurnishings.colliders.forEach((collider) => {'
    );
    expect(source).toContain('groundColliders.push(collider);');
    expect(source).toContain("sourceType: 'generatedCollider',");
    expect(source).toContain("purpose: 'lower-floor-furnishing',");
    expect(source).toContain('role: collider.category,');
    expect(source).not.toContain(
      'lowerFloorFurnishings.decorativeFootprints.forEach'
    );
  });

  it('keeps the SelfieMirror collider source-backed while preserving debug ID 101A', () => {
    const source = readMainSource();

    expect(source).toContain(
      "const SELFIE_MIRROR_SCENE_OBJECT_ID = 'selfie-mirror-living-room';"
    );
    expect(source).toContain(
      'const SELFIE_MIRROR_COLLIDER_SOURCE_ID = assertLevelSourceId('
    );
    expect(source).toContain('SELFIE_MIRROR_SCENE_OBJECT_DEFINITION.sourceId');
    expect(source).toContain(
      "const SELFIE_MIRROR_COLLIDER_DEBUG_ID = assertDebugColliderId('101A');"
    );
    expect(source).toMatch(
      /namedColliderDebugNames\.set\(\s*mirror\.collider,\s*'LivingRoomSelfieMirrorCollider'\s*\);/
    );
    expect(source).toContain('colliderSourceMetadata.set(mirror.collider, {');
    expect(source).toContain("sourceType: 'sceneObject',");
    expect(source).toContain("intent: 'physical-boundary',");
    expect(source).toContain("role: 'selfieMirror',");
    expect(source).toContain(
      'purpose: getSceneObjectColliderSourcePurpose(\n' +
        '        SELFIE_MIRROR_SCENE_OBJECT_DEFINITION\n' +
        '      ),'
    );
    expect(source).toContain('debugId: SELFIE_MIRROR_COLLIDER_DEBUG_ID,');
    expect(source).toContain('groundColliders.push(mirror.collider);');
  });

  it('does not wire runtime adaptive quality into immersive mode', () => {
    const source = readMainSource();

    expect(source).not.toContain('createAdaptiveQualityController');
    expect(source).not.toContain('adaptiveQualityController');
    expect(source).not.toContain(
      "graphicsQualityManager?.setLevel(level, { source: 'adaptive' })"
    );
    expect(source).toContain('adaptivePolicy: null');
    expect(source).toContain('adaptiveDowngradeCount: 0');
    expect(source).toContain('adaptiveRecoveryCount: 0');
  });

  it('rebuilds scene detail when graphics quality changes', () => {
    const source = readMainSource();

    expect(source).toContain(
      'let pendingLowFpsPerformanceRecoveryReload = false;'
    );
    expect(source).toContain("if (nextLevel === 'performance') {");
    expect(source).toContain('pendingLowFpsPerformanceRecoveryReload = true;');
    expect(source).toContain(
      'const reloadScene = previousSceneDetailLevel !== level;'
    );
    expect(source).toContain(
      "pendingLowFpsPerformanceRecoveryReload && level === 'performance';"
    );
    expect(source).toContain('pendingLowFpsPerformanceRecoveryReload = false;');
    expect(source).toMatch(
      /const didScheduleSceneReload = applyFeaturePolicy\(\{\s*reloadScene,\s*adaptivePerformanceRecoveryLocked,\s*\}\);/
    );
    expect(source).toMatch(/if \(didScheduleSceneReload\) \{\s*return;\s*\}/);
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
      /if \(persistPendingSceneDetailReload\(pendingReload\)\) \{\s*window\.location\.reload\(\);\s*return true;\s*\}/
    );
    expect(source).toContain(
      '[performance] scene detail reload handoff unavailable; applying policy without reload'
    );
  });
});
