import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  createScanner,
  LanguageVariant,
  ScriptTarget,
  SyntaxKind,
} from 'typescript';

import { MINIATURE_POI_PROXY_REGISTRY } from '../src/scene/miniature/poiProxyRegistry';
import {
  MINIATURE_AUDITED_SOURCE_DIRECTORIES,
  MINIATURE_SCENE_COMPONENT_COVERAGE,
} from '../src/scene/miniature/sceneComponentRegistry';
import type { MiniatureSyncEntry } from '../src/scene/miniature/types';
import { getPoiDefinitions } from '../src/scene/poi/registry';
import type { PoiId } from '../src/scene/poi/types';

const manifestPath = 'src/scene/miniature/manifest.generated.json';
export function normalizedTypeScriptTokens(source: string) {
  const scanner = createScanner(
    ScriptTarget.Latest,
    false,
    LanguageVariant.Standard,
    source
  );
  const tokens: string[] = [];
  let kind = scanner.scan();
  while (kind !== SyntaxKind.EndOfFileToken) {
    if (
      kind !== SyntaxKind.WhitespaceTrivia &&
      kind !== SyntaxKind.NewLineTrivia &&
      kind !== SyntaxKind.SingleLineCommentTrivia &&
      kind !== SyntaxKind.MultiLineCommentTrivia
    ) {
      tokens.push(`${kind}:${scanner.getTokenText()}`);
    }
    kind = scanner.scan();
  }
  return tokens.join('\n');
}
function hashText(text: string) {
  return createHash('sha256').update(text).digest('hex');
}
function hashFiles(files: readonly string[]) {
  return hashText(
    files
      .map(
        (file) =>
          `${file}\n${normalizedTypeScriptTokens(readFileSync(file, 'utf8'))}`
      )
      .join('\n')
  );
}
function entries(): MiniatureSyncEntry[] {
  return [
    ...Object.values(MINIATURE_POI_PROXY_REGISTRY).map((proxy) => proxy.sync),
    ...MINIATURE_SCENE_COMPONENT_COVERAGE.flatMap((entry) =>
      entry.sync ? [entry.sync] : []
    ),
  ];
}
function productionFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const item of readdirSync(dir)) {
    const file = path.join(dir, item);
    const stats = statSync(file);
    if (stats.isDirectory()) out.push(...productionFiles(file));
    else if (
      file.endsWith('.ts') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.d.ts') &&
      !file.includes('__tests__')
    )
      out.push(file);
  }
  return out;
}
function validate() {
  const errors: string[] = [];
  const poiIds = new Set(getPoiDefinitions().map((poi) => poi.id as PoiId));
  const proxyIds = new Set(Object.keys(MINIATURE_POI_PROXY_REGISTRY));
  for (const id of poiIds)
    if (!proxyIds.has(id)) errors.push(`Missing miniature POI proxy: ${id}`);
  for (const id of proxyIds)
    if (!poiIds.has(id as PoiId)) errors.push(`Unknown POI proxy: ${id}`);
  const self = MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table'];
  if (!self.recursionBoundary || self.allowRecursion !== false)
    errors.push(
      'danielsmith.io proxy must be a nonrecursive recursion boundary.'
    );
  const ids = new Set<string>();
  const sourceOwners = new Map<string, string>();
  for (const entry of entries()) {
    if (ids.has(entry.id))
      errors.push(`Duplicate miniature sync id: ${entry.id}`);
    ids.add(entry.id);
    for (const file of [
      ...entry.overworldSourceFiles,
      ...entry.proxySourceFiles,
    ])
      if (!existsSync(file))
        errors.push(`Missing miniature sync file: ${entry.id} -> ${file}`);
    for (const file of entry.overworldSourceFiles) {
      const owner = sourceOwners.get(file);
      if (owner && owner !== entry.id && file.includes('/structures/'))
        errors.push(`Duplicate structure source ownership: ${file}`);
      sourceOwners.set(file, entry.id);
    }
  }
  const classified = new Set<string>();
  for (const entry of MINIATURE_SCENE_COMPONENT_COVERAGE)
    for (const file of entry.sourceFiles) classified.add(file);
  for (const proxy of Object.values(MINIATURE_POI_PROXY_REGISTRY))
    for (const file of proxy.sync.overworldSourceFiles) classified.add(file);
  for (const dir of MINIATURE_AUDITED_SOURCE_DIRECTORIES) {
    for (const file of productionFiles(dir)) {
      if (file === 'src/scene/structures/triangleCount.ts') continue;
      if (
        ![...classified].some(
          (item) => file === item || file.startsWith(`${item}/`)
        )
      )
        errors.push(`Unclassified production geometry source: ${file}`);
    }
  }
  const main = readFileSync('src/main.ts', 'utf8');
  if (/new\s+\w*Geometry\s*\(/.test(main))
    errors.push(
      'Inline Geometry construction in src/main.ts is not auditable.'
    );
  return errors;
}
function generate() {
  const errors = validate();
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    version: 1,
    generatedBy: 'scripts/miniatureManifest.ts',
    entries: entries()
      .map((entry) => ({
        id: entry.id,
        syncRevision: entry.syncRevision,
        syncNote: entry.syncNote ?? '',
        sourceFingerprint: hashFiles(entry.overworldSourceFiles),
        proxyFingerprint: hashFiles(entry.proxySourceFiles),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
function checkDrift(next: ReturnType<typeof generate>) {
  if (!existsSync(manifestPath))
    return [
      'Miniature manifest is missing. Run npm run miniature:manifest:update.',
    ];
  const previous = JSON.parse(
    readFileSync(manifestPath, 'utf8')
  ) as typeof next;
  const errors: string[] = [];
  const prevById = new Map(previous.entries.map((entry) => [entry.id, entry]));
  for (const entry of next.entries) {
    const prev = prevById.get(entry.id);
    if (
      prev &&
      prev.sourceFingerprint !== entry.sourceFingerprint &&
      prev.proxyFingerprint === entry.proxyFingerprint &&
      prev.syncRevision === entry.syncRevision
    )
      errors.push(
        `Miniature proxy review required for ${entry.id}: source changed without proxy change or syncRevision bump.`
      );
  }
  if (JSON.stringify(previous, null, 2) !== JSON.stringify(next, null, 2))
    errors.push(
      'Committed miniature manifest is stale. Run npm run miniature:manifest:update.'
    );
  return errors;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] ?? 'check';
  try {
    const next = generate();
    if (mode === 'update') {
      writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`Updated ${manifestPath}`);
    } else {
      const errors = checkDrift(next);
      if (errors.length) throw new Error(errors.join('\n'));
      console.log('Miniature manifest check passed.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
