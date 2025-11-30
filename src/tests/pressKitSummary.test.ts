import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import * as performance from '../assets/performance';
import { PRESS_KIT_MEDIA_ASSETS } from '../assets/pressKitMedia';
import * as registry from '../scene/poi/registry';
import type { PoiDefinition } from '../scene/poi/types';
import { buildPressKitSummary, writePressKitSummary } from '../tools/pressKit';

const fixedNow = () => new Date('2024-06-01T12:34:56.000Z');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildPressKitSummary', () => {
  it('captures POI metadata and performance budgets', () => {
    const definitions = registry.getPoiDefinitions();
    const expectedCategoryCounts = definitions.reduce(
      (acc, poi) => {
        acc[poi.category] += 1;
        return acc;
      },
      { project: 0, environment: 0 }
    );
    const expectedRooms = new Set(definitions.map((poi) => poi.roomId)).size;
    const expectedReport = performance.createPerformanceBudgetReport(
      performance.IMMERSIVE_SCENE_BASELINE,
      performance.IMMERSIVE_PERFORMANCE_BUDGET
    );

    const summary = buildPressKitSummary({ now: fixedNow });

    expect(summary.generatedAtIso).toBe('2024-06-01T12:34:56.000Z');
    expect(summary.performance.budget).toEqual(
      performance.IMMERSIVE_PERFORMANCE_BUDGET
    );
    expect(summary.performance.baseline).toEqual(
      performance.IMMERSIVE_SCENE_BASELINE
    );
    expect(summary.performance.report).toEqual(expectedReport);
    const headroom = summary.performance.headroom;
    expect(headroom.materials).toMatchObject({
      remaining: expectedReport.materials.remaining,
      overBudgetBy: expectedReport.materials.overBudgetBy,
      status: 'within-budget',
    });
    expect(headroom.materials.percentUsed).toBeCloseTo(
      expectedReport.materials.percentUsed
    );
    expect(headroom.materials.remainingPercent).toBeCloseTo(
      1 - expectedReport.materials.percentUsed
    );

    expect(headroom.drawCalls).toMatchObject({
      remaining: expectedReport.drawCalls.remaining,
      overBudgetBy: expectedReport.drawCalls.overBudgetBy,
      status: 'within-budget',
    });
    expect(headroom.drawCalls.percentUsed).toBeCloseTo(
      expectedReport.drawCalls.percentUsed
    );
    expect(headroom.drawCalls.remainingPercent).toBeCloseTo(
      1 - expectedReport.drawCalls.percentUsed
    );

    expect(headroom.textureBytes).toMatchObject({
      remaining: expectedReport.textureBytes.remaining,
      overBudgetBy: expectedReport.textureBytes.overBudgetBy,
      status: 'within-budget',
    });
    expect(headroom.textureBytes.percentUsed).toBeCloseTo(
      expectedReport.textureBytes.percentUsed
    );
    expect(headroom.textureBytes.remainingPercent).toBeCloseTo(
      1 - expectedReport.textureBytes.percentUsed
    );
    expect(summary.poiCatalog).toHaveLength(definitions.length);
    expect(summary.totals.poiCount).toBe(definitions.length);
    expect(summary.totals.roomsRepresented).toBe(expectedRooms);
    expect(summary.totals.categories).toEqual(expectedCategoryCounts);
    expect(summary.media).toHaveLength(PRESS_KIT_MEDIA_ASSETS.length);
    summary.media.forEach((entry, index) => {
      const asset = PRESS_KIT_MEDIA_ASSETS[index];
      expect(entry).toMatchObject({
        id: asset.id,
        label: asset.label,
        description: asset.description,
        altText: asset.altText,
        type: asset.type,
        relativePath: asset.relativePath,
      });
      expect(entry.filename).toBe(path.basename(asset.relativePath));
    });

    const firstPoi = summary.poiCatalog[0];
    expect(firstPoi.room.id).toBeTruthy();
    expect(firstPoi.room.name).toBeTruthy();
    expect(firstPoi.metrics.length).toBeGreaterThan(0);
    expect(firstPoi.links.length).toBeGreaterThan(0);
  });

  it('falls back to empty arrays when metrics or links are missing', () => {
    const stubPoi: PoiDefinition = {
      id: 'futuroptimist-living-room-tv',
      title: 'Stubbed Futuroptimist Wall',
      summary: 'Stub summary for coverage.',
      interactionPrompt: 'Inspect Stubbed Futuroptimist Wall',
      category: 'project',
      interaction: 'inspect',
      roomId: 'livingRoom',
      position: { x: 0, y: 0, z: 0 },
      interactionRadius: 2,
      footprint: { width: 1, depth: 1 },
    };
    vi.spyOn(registry, 'getPoiDefinitions').mockReturnValue([stubPoi]);

    const summary = buildPressKitSummary({ now: fixedNow });

    expect(summary.poiCatalog).toHaveLength(1);
    expect(summary.poiCatalog[0].metrics).toEqual([]);
    expect(summary.poiCatalog[0].links).toEqual([]);
    expect(summary.totals.categories).toEqual({ project: 1, environment: 0 });
  });

  it('marks headroom entries as invalid when measurements are malformed', () => {
    const report = performance.createPerformanceBudgetReport(
      {
        materialCount: Number.NaN,
        drawCallCount: 12,
        textureBytes: Number.POSITIVE_INFINITY,
      },
      { maxMaterials: -1, maxDrawCalls: 0, maxTextureBytes: 0 }
    );

    vi.spyOn(performance, 'createPerformanceBudgetReport').mockReturnValue(
      report
    );

    const summary = buildPressKitSummary({ now: fixedNow });

    expect(summary.performance.headroom.materials.status).toBe('invalid');
    expect(summary.performance.headroom.textureBytes.status).toBe('invalid');
    expect(summary.performance.headroom.drawCalls.status).toBe('over-budget');
    expect(summary.performance.headroom.drawCalls.remainingPercent).toBe(0);
  });
});

describe('writePressKitSummary', () => {
  it('writes a formatted JSON summary to disk', async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const outputPath = '/tmp/press-kit.json';

    const result = await writePressKitSummary({
      outputPath,
      fsImpl: { mkdir, writeFile },
      now: fixedNow,
    });

    expect(result.outputPath).toBe(outputPath);
    expect(result.summary.generatedAtIso).toBe('2024-06-01T12:34:56.000Z');
    expect(mkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath, payload, encoding] = writeFile.mock.calls[0];
    expect(writtenPath).toBe(outputPath);
    expect(encoding).toBe('utf8');
    expect(payload.endsWith('\n')).toBe(true);
    expect(JSON.parse(payload)).toEqual(result.summary);
  });
});
