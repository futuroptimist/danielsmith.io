import { promises as fs } from 'node:fs';
import path from 'node:path';

import { FLOOR_PLAN } from '../assets/floorPlan';
import {
  IMMERSIVE_PERFORMANCE_BUDGET,
  IMMERSIVE_SCENE_BASELINE,
  type PerformanceBudget,
  type ScenePerformanceSnapshot,
} from '../assets/performance';
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

export interface PressKitSummary {
  generatedAtIso: string;
  performance: {
    budget: PerformanceBudget;
    baseline: ScenePerformanceSnapshot;
  };
  totals: PressKitTotals;
  poiCatalog: PressKitPoiEntry[];
}

export interface BuildPressKitSummaryOptions {
  now?: () => Date;
}

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

  return {
    generatedAtIso,
    performance: {
      budget: { ...IMMERSIVE_PERFORMANCE_BUDGET },
      baseline: { ...IMMERSIVE_SCENE_BASELINE },
    },
    totals: {
      poiCount: poiCatalog.length,
      roomsRepresented,
      categories: categoryTotals,
    },
    poiCatalog,
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
