import { promises as fs } from 'node:fs';
import path from 'node:path';

import { FLOOR_PLAN } from '../assets/floorPlan';
import {
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  createPerformanceBudgetReport,
  describePerformanceBudgetUsage,
  type PerformanceBudgetStatus,
  type PerformanceBudgetReport,
  type PerformanceBudgetUsage,
  type PerformanceBudget,
  type ScenePerformanceSnapshot,
} from '../assets/performance';
import {
  PRESS_KIT_MEDIA_ASSETS,
  type PressKitMediaAsset,
} from '../assets/pressKitMedia';
import { getPoiDefinitions } from '../scene/poi/registry';
import type {
  PoiCategory,
  PoiDefinition,
  PoiInteraction,
  PoiLink,
  PoiMetric,
} from '../scene/poi/types';

export interface PressKitPoiMetric extends PoiMetric {}

export interface PressKitPoiLink {
  label: string;
  href: string;
}

export interface PressKitPoiEntry {
  id: PoiDefinition['id'];
  title: string;
  summary: string;
  category: PoiCategory;
  interaction: PoiInteraction;
  status?: PoiDefinition['status'];
  room: {
    id: string;
    name: string;
  };
  metrics: PressKitPoiMetric[];
  links: PressKitPoiLink[];
  footprint: {
    width: number;
    depth: number;
  };
  interactionRadius: number;
}

export interface PressKitTotals {
  poiCount: number;
  roomsRepresented: number;
  categories: Record<PoiCategory, number>;
}

export interface PressKitPerformanceHeadroomEntry {
  remaining: number;
  percentUsed: number;
  remainingPercent: number;
  overBudgetBy: number;
  status: PerformanceBudgetStatus;
  label: string;
  statusLabel: string;
  remainingPercentLabel: string;
}

export interface PressKitPerformanceSummary {
  budget: PerformanceBudget;
  baseline: ScenePerformanceSnapshot;
  report: PerformanceBudgetReport;
  headroom: {
    materials: PressKitPerformanceHeadroomEntry;
    drawCalls: PressKitPerformanceHeadroomEntry;
    textureBytes: PressKitPerformanceHeadroomEntry;
  };
}

export interface PressKitMediaEntry extends PressKitMediaAsset {
  filename: string;
}

export interface PressKitSummary {
  generatedAtIso: string;
  performance: PressKitPerformanceSummary;
  totals: PressKitTotals;
  poiCatalog: PressKitPoiEntry[];
  media: PressKitMediaEntry[];
}

export interface BuildPressKitSummaryOptions {
  now?: () => Date;
}

export const describeHeadroomStatus = (
  usage: PerformanceBudgetUsage
): string => {
  if (usage.hasInvalidMeasurements || usage.status === 'invalid') {
    return 'Invalid measurements';
  }
  if (usage.status === 'over-budget' && usage.overBudgetBy > 0) {
    return 'Over budget';
  }
  return 'Within budget';
};

export const formatRemainingPercentLabel = (value: number): string => {
  const remainingPercent = Math.min(1, Math.max(0, value));
  return `${Math.round(remainingPercent * 100)}% remaining`;
};

const getRoomName = (roomId: string): string => {
  const room = FLOOR_PLAN.rooms.find((entry) => entry.id === roomId);
  return room?.name ?? roomId;
};

const normalizeMetrics = (
  metrics: PoiMetric[] | undefined
): PressKitPoiMetric[] => {
  if (!metrics) {
    return [];
  }
  return metrics.map((metric) => ({ ...metric }));
};

const normalizeLinks = (links: PoiLink[] | undefined): PressKitPoiLink[] => {
  if (!links) {
    return [];
  }
  return links.map((link) => ({ label: link.label, href: link.href }));
};

const createPerformanceHeadroom = (
  usage: PerformanceBudgetUsage,
  labelOptions?: Parameters<typeof describePerformanceBudgetUsage>[1]
): PressKitPerformanceHeadroomEntry => {
  const percentUsed = Math.min(1, Math.max(0, usage.percentUsed));
  const remainingPercent = Math.min(1, Math.max(0, usage.remainingPercent));
  const statusLabel = describeHeadroomStatus(usage);
  return {
    remaining: usage.remaining,
    percentUsed,
    remainingPercent,
    overBudgetBy: usage.overBudgetBy,
    status: usage.status,
    label: describePerformanceBudgetUsage(usage, labelOptions),
    statusLabel,
    remainingPercentLabel: formatRemainingPercentLabel(remainingPercent),
  };
};

export function buildPressKitSummary(
  options: BuildPressKitSummaryOptions = {}
): PressKitSummary {
  const now = options.now ?? (() => new Date());
  const generatedAtIso = now().toISOString();

  const poiDefinitions = getPoiDefinitions();
  const poiCatalog: PressKitPoiEntry[] = poiDefinitions.map((poi) => ({
    id: poi.id,
    title: poi.title,
    summary: poi.summary,
    category: poi.category,
    interaction: poi.interaction,
    status: poi.status,
    room: {
      id: poi.roomId,
      name: getRoomName(poi.roomId),
    },
    metrics: normalizeMetrics(poi.metrics),
    links: normalizeLinks(poi.links),
    footprint: {
      width: poi.footprint.width,
      depth: poi.footprint.depth,
    },
    interactionRadius: poi.interactionRadius,
  }));

  const categoryTotals = poiCatalog.reduce<Record<PoiCategory, number>>(
    (acc, poi) => {
      acc[poi.category] += 1;
      return acc;
    },
    { project: 0, environment: 0 }
  );

  const roomsRepresented = new Set(poiCatalog.map((poi) => poi.room.id)).size;

  const media: PressKitMediaEntry[] = PRESS_KIT_MEDIA_ASSETS.map((asset) => ({
    ...asset,
    filename: path.basename(asset.relativePath),
  }));

  const performanceReport = createPerformanceBudgetReport(
    IMMERSIVE_SCENE_BASELINE,
    IMMERSIVE_PERFORMANCE_BUDGET
  );

  return {
    generatedAtIso,
    performance: {
      budget: { ...IMMERSIVE_PERFORMANCE_BUDGET },
      baseline: { ...IMMERSIVE_SCENE_BASELINE },
      report: performanceReport,
      headroom: {
        materials: createPerformanceHeadroom(performanceReport.materials, {
          unitLabel: 'materials',
          formatter: new Intl.NumberFormat('en-US'),
        }),
        drawCalls: createPerformanceHeadroom(performanceReport.drawCalls, {
          unitLabel: 'draw calls',
          formatter: new Intl.NumberFormat('en-US'),
        }),
        textureBytes: createPerformanceHeadroom(
          performanceReport.textureBytes,
          {
            unitLabel: 'bytes',
            formatter: new Intl.NumberFormat('en-US'),
          }
        ),
      },
    },
    totals: {
      poiCount: poiCatalog.length,
      roomsRepresented,
      categories: categoryTotals,
    },
    poiCatalog,
    media,
  };
}

export interface WritePressKitSummaryOptions
  extends BuildPressKitSummaryOptions {
  outputPath?: string;
  pretty?: boolean;
  fsImpl?: Pick<typeof fs, 'mkdir' | 'writeFile'>;
}

const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  path.join('docs', 'assets', 'press-kit.json')
);

export async function writePressKitSummary({
  outputPath = DEFAULT_OUTPUT_PATH,
  pretty = true,
  fsImpl = fs,
  now,
}: WritePressKitSummaryOptions = {}): Promise<{
  outputPath: string;
  summary: PressKitSummary;
}> {
  const summary = buildPressKitSummary({ now });
  const indentation = pretty ? 2 : undefined;
  const payload = `${JSON.stringify(summary, null, indentation)}\n`;
  await fsImpl.mkdir(path.dirname(outputPath), { recursive: true });
  await fsImpl.writeFile(outputPath, payload, 'utf8');
  return { outputPath, summary };
}
