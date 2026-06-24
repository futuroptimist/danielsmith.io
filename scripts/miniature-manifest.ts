import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import {
  LanguageVariant,
  ScriptTarget,
  SyntaxKind,
  createScanner,
} from 'typescript';

import { POI_MINIATURE_PROXIES } from '../src/scene/miniature/poiProxyRegistry';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../src/scene/miniature/sceneComponentRegistry';
import { getPoiDefinitions } from '../src/scene/poi/registry';

export interface ManifestEntry {
  id: string;
  syncRevision: number;
  syncNote?: string;
  sourceFiles: string[];
  proxyFiles: string[];
  sourceFingerprint: string;
  proxyFingerprint: string;
}

export interface MiniatureManifest {
  version: 1;
  generatedBy: 'scripts/miniature-manifest.ts';
  entries: ManifestEntry[];
}

const manifestPath = 'src/scene/miniature/miniatureManifest.generated.json';
const geometrySourceFiles = [
  'src/scene/environments/backyard.ts',
  'src/scene/level/portfolioLevel.ts',
  'src/scene/level/generateFloorSurfaces.ts',
  'src/scene/level/generateWalls.ts',
  'src/scene/structures/ceilingPanels.ts',
  'src/scene/structures/doorwayOpenings.ts',
  'src/scene/structures/floorTiles.ts',
  'src/scene/structures/mediaWall.ts',
  'src/scene/structures/mediaWallStarBridge.ts',
  'src/scene/structures/selfieMirror.ts',
  'src/scene/structures/staircase.ts',
  'src/scene/structures/upperLandingFloorCutouts.ts',
  'src/scene/structures/upperStairwellLanding.ts',
  'src/scene/structures/wallSegmentsMesh.ts',
  'src/scene/lighting/ledStrips.ts',
  'src/scene/avatar/mannequin.ts',
  'src/scene/avatar/accessories.ts',
];

export function normalizeTypeScriptTokens(sourceText: string): string {
  const scanner = createScanner(
    ScriptTarget.Latest,
    true,
    LanguageVariant.Standard,
    sourceText
  );
  const tokens: string[] = [];
  let token = scanner.scan();
  while (token !== SyntaxKind.EndOfFileToken) {
    tokens.push(`${SyntaxKind[token]}:${scanner.getTokenText()}`);
    token = scanner.scan();
  }
  return tokens.join('\n');
}

function hashText(text: string) {
  return createHash('sha256').update(text).digest('hex');
}

function hashFiles(files: readonly string[], metadata: object) {
  const chunks = [JSON.stringify(metadata)];
  for (const file of [...files].sort()) {
    if (!existsSync(file))
      throw new Error(`Missing miniature manifest file: ${file}`);
    chunks.push(file, normalizeTypeScriptTokens(readFileSync(file, 'utf8')));
  }
  return hashText(chunks.join('\n---\n'));
}

export function buildMiniatureManifest(): MiniatureManifest {
  const allEntries = [
    ...POI_MINIATURE_PROXIES,
    ...MINIATURE_SCENE_COMPONENT_COVERAGE,
  ];
  const ids = new Set<string>();
  for (const entry of allEntries) {
    if (ids.has(entry.id))
      throw new Error(`Duplicate miniature registry id: ${entry.id}`);
    ids.add(entry.id);
    for (const file of [...entry.sourceFiles, ...entry.proxyFiles]) {
      if (!existsSync(file))
        throw new Error(`Miniature registry file does not exist: ${file}`);
    }
  }

  const poiIds = new Set(getPoiDefinitions().map((poi) => poi.id));
  const proxyPoiIds = new Set(
    POI_MINIATURE_PROXIES.map((proxy) => proxy.poiId)
  );
  for (const poiId of poiIds) {
    if (!proxyPoiIds.has(poiId))
      throw new Error(`Missing miniature POI proxy for ${poiId}`);
  }
  for (const proxy of POI_MINIATURE_PROXIES) {
    if (!poiIds.has(proxy.poiId))
      throw new Error(`Miniature proxy references unknown POI ${proxy.poiId}`);
    if (
      proxy.poiId === 'danielsmith-portfolio-table' &&
      !proxy.recursionBoundary
    ) {
      throw new Error(
        'danielsmith.io miniature proxy must be a recursion boundary'
      );
    }
  }

  const ownedSources = new Map<string, string>();
  for (const entry of allEntries) {
    for (const sourceFile of entry.sourceFiles) {
      const owner = ownedSources.get(sourceFile);
      if (owner && owner !== entry.id && sourceFile.includes('/structures/')) {
        throw new Error(
          `Duplicate miniature source ownership for ${sourceFile}: ${owner} and ${entry.id}`
        );
      }
      ownedSources.set(sourceFile, entry.id);
    }
  }
  for (const sourceFile of geometrySourceFiles) {
    if (!ownedSources.has(sourceFile)) {
      throw new Error(
        `Audited geometry source is not classified for miniature coverage: ${sourceFile}`
      );
    }
  }

  if (/new\s+\w+Geometry\s*\(/.test(readFileSync('src/main.ts', 'utf8'))) {
    throw new Error(
      'Move inline Geometry construction out of src/main.ts before updating miniature coverage.'
    );
  }

  return {
    version: 1,
    generatedBy: 'scripts/miniature-manifest.ts',
    entries: allEntries.map((entry) => ({
      id: entry.id,
      syncRevision: entry.syncRevision,
      syncNote: entry.syncNote,
      sourceFiles: [...entry.sourceFiles].sort(),
      proxyFiles: [...entry.proxyFiles].sort(),
      sourceFingerprint: hashFiles(entry.sourceFiles, {
        id: entry.id,
        revision: entry.syncRevision,
        note: entry.syncNote,
      }),
      proxyFingerprint: hashFiles(entry.proxyFiles, {
        id: entry.id,
        revision: entry.syncRevision,
        note: entry.syncNote,
      }),
    })),
  };
}

export function validateMiniatureManifest(
  committed: MiniatureManifest,
  next: MiniatureManifest
) {
  const previousById = new Map(
    committed.entries.map((entry) => [entry.id, entry])
  );
  for (const entry of next.entries) {
    const previous = previousById.get(entry.id);
    if (!previous) continue;
    if (
      previous.sourceFingerprint !== entry.sourceFingerprint &&
      previous.proxyFingerprint === entry.proxyFingerprint &&
      previous.syncRevision === entry.syncRevision
    ) {
      throw new Error(
        `Miniature source changed without proxy update or syncRevision bump: ${entry.id}`
      );
    }
  }
  if (JSON.stringify(committed, null, 2) !== JSON.stringify(next, null, 2)) {
    throw new Error(
      'Committed miniature manifest is stale. Run npm run miniature:manifest:update.'
    );
  }
}

function main() {
  const mode = process.argv[2] ?? 'check';
  const manifest = buildMiniatureManifest();
  if (mode === 'update') {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Updated ${relative(process.cwd(), manifestPath)}`);
    return;
  }
  if (!existsSync(manifestPath)) throw new Error(`Missing ${manifestPath}`);
  const committed = JSON.parse(
    readFileSync(manifestPath, 'utf8')
  ) as MiniatureManifest;
  validateMiniatureManifest(committed, manifest);
  console.log('Miniature manifest is current.');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
