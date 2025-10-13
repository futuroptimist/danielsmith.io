import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  FLOOR_PLAN_LEVELS,
  WALL_THICKNESS,
  getCombinedWallSegments,
  type FloorPlanDefinition,
  type FloorPlanLevel,
} from '../src/floorPlan';
import { getPoiDefinitions } from '../src/poi/registry';

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/assets');
const PADDING = 32;
const SCALE = 16; // pixels per world unit

function formatColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

async function ensureDirectoryExists(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function getPlanBounds(plan: FloorPlanDefinition) {
  if (plan.outline.length === 0) {
    throw new Error('Floor plan outline is empty.');
  }

  const xs = plan.outline.map(([x]) => x);
  const zs = plan.outline.map(([, z]) => z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const widthUnits = maxX - minX;
  const heightUnits = maxZ - minZ;
  const svgWidth = Math.round(widthUnits * SCALE + PADDING * 2);
  const svgHeight = Math.round(heightUnits * SCALE + PADDING * 2);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    svgWidth,
    svgHeight,
  };
}

function renderFloorSvg(level: FloorPlanLevel): string {
  const plan = level.plan;
  const { minX, minZ, svgWidth, svgHeight } = getPlanBounds(plan);

  const projectX = (x: number) => (x - minX) * SCALE + PADDING;
  const projectY = (z: number) => svgHeight - ((z - minZ) * SCALE + PADDING);

  const outlinePath = plan.outline.map(([x, z], index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command}${projectX(x).toFixed(2)},${projectY(z).toFixed(2)}`;
  });
  outlinePath.push('Z');

  const roomLayers = plan.rooms.map((room) => {
    const color = formatColor(room.ledColor);
    const x = projectX(room.bounds.minX);
    const y = projectY(room.bounds.maxZ);
    const width = (room.bounds.maxX - room.bounds.minX) * SCALE;
    const height = (room.bounds.maxZ - room.bounds.minZ) * SCALE;
    const cx = projectX((room.bounds.minX + room.bounds.maxX) / 2);
    const cy = projectY((room.bounds.minZ + room.bounds.maxZ) / 2);

    return `
      <g>
        <rect
          x="${x.toFixed(2)}"
          y="${y.toFixed(2)}"
          width="${width.toFixed(2)}"
          height="${height.toFixed(2)}"
          fill="${color}"
          fill-opacity="0.22"
          stroke="${color}"
          stroke-opacity="0.5"
          stroke-width="1.5"
        />
        <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="12" fill="#d8deff">${room.name}</text>
      </g>
    `;
  });

  const wallStroke = WALL_THICKNESS * SCALE;
  const wallSegments = getCombinedWallSegments(plan);
  const wallLayers = wallSegments.map((segment) => {
    const x1 = projectX(segment.start.x);
    const y1 = projectY(segment.start.z);
    const x2 = projectX(segment.end.x);
    const y2 = projectY(segment.end.z);
    const stroke = segment.rooms.length > 1 ? '#91a3d6' : '#c5d1ff';

    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${wallStroke.toFixed(2)}" stroke-linecap="round" />`;
  });

  // Icons
  const pois = getPoiDefinitions().filter((p) =>
    plan.rooms.some((r) => r.id === p.roomId)
  );
  const iconLayers = pois
    .map((p) => {
      const x = projectX(p.position.x);
      const y = projectY(p.position.z);
      return `<g>
        <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6" fill="#85e5ff" />
        <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="#0b1428" />
      </g>`;
    })
    .join('\n');

  // Spawn marker (uses initial player position derived similarly to runtime: center of first room of ground level)
  let spawnLayer = '';
  if (level.id === 'ground') {
    const firstRoom = plan.rooms[0];
    const spawnX = (firstRoom.bounds.minX + firstRoom.bounds.maxX) / 2;
    const spawnZ = (firstRoom.bounds.minZ + firstRoom.bounds.maxZ) / 2;
    const sx = projectX(spawnX);
    const sy = projectY(spawnZ);
    spawnLayer = `<g>
      <rect x="${(sx - 7).toFixed(2)}" y="${(sy - 7).toFixed(2)}" width="14" height="14" fill="#ffd166" stroke="#ffeb99" stroke-width="1" />
    </g>`;
  }

  const legend = `
    <g>
      <rect x="${(svgWidth - 210).toFixed(2)}" y="${(svgHeight - 86).toFixed(
        2
      )}" width="200" height="76" rx="8" fill="#0e1730" stroke="#223559" stroke-width="1" />
      <g transform="translate(${(svgWidth - 196).toFixed(2)}, ${(
        svgHeight - 70
      ).toFixed(2)})">
        <circle cx="8" cy="10" r="6" fill="#85e5ff" />
        <circle cx="8" cy="10" r="3" fill="#0b1428" />
        <text x="22" y="14" font-family="'Inter', 'Segoe UI', sans-serif" font-size="12" fill="#d8deff">POI</text>
        <rect x="0" y="26" width="14" height="14" fill="#ffd166" stroke="#ffeb99" stroke-width="1" />
        <text x="22" y="38" font-family="'Inter', 'Segoe UI', sans-serif" font-size="12" fill="#d8deff">Spawn</text>
      </g>
    </g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#0b1428" />
  <g>
    <path d="${outlinePath.join(' ')}" fill="#151d2f" stroke="#1e2a3f" stroke-width="2" stroke-linejoin="round" />
    ${roomLayers.join('\n')}
    ${wallLayers.join('\n')}
    ${iconLayers}
    ${spawnLayer}
    ${legend}
  </g>
</svg>
`;
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function generate() {
  await ensureDirectoryExists(OUTPUT_DIR);
  await Promise.all(
    FLOOR_PLAN_LEVELS.map(async (level) => {
      const svg = renderFloorSvg(level);
      const filePath = path.resolve(OUTPUT_DIR, `floorplan-${level.id}.svg`);
      await fs.writeFile(filePath, svg, 'utf8');
    })
  );
}
