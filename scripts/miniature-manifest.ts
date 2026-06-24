import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import ts from 'typescript';
import { MINIATURE_POI_PROXY_ENTRIES } from '../src/scene/miniature/poiProxyRegistry';
import { MINIATURE_SCENE_COMPONENT_COVERAGE } from '../src/scene/miniature/sceneComponentRegistry';
import { getPoiDefinitions } from '../src/scene/poi/registry';

const MANIFEST = 'data/miniature/source-manifest.json';
export interface MiniatureManifestEntry {
  id: string;
  sourceHash: string;
  proxyHash: string;
  syncRevision: number;
  syncNote?: string;
}
export interface MiniatureManifest {
  version: 1;
  entries: MiniatureManifestEntry[];
}

export function normalizedTypeScriptTokens(source: string): string {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    source
  );
  const tokens: string[] = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    tokens.push(`${ts.SyntaxKind[kind]}:${scanner.getTokenText()}`);
  }
  return tokens.join('\n');
}

function hashFiles(files: readonly string[]) {
  const hash = createHash('sha256');
  for (const file of files) {
    if (!existsSync(file))
      throw new Error(`Missing miniature sync file: ${file}`);
    hash.update(file);
    hash.update('\0');
    hash.update(normalizedTypeScriptTokens(readFileSync(file, 'utf8')));
  }
  return hash.digest('hex');
}

function assertRegistry() {
  const pois = getPoiDefinitions()
    .map((p) => p.id)
    .sort();
  const proxies = MINIATURE_POI_PROXY_ENTRIES.map((p) => p.id).sort();
  if (JSON.stringify(pois) !== JSON.stringify(proxies))
    throw new Error(`POI/proxy mismatch: ${pois} vs ${proxies}`);
  const seen = new Set<string>();
  for (const entry of [
    ...MINIATURE_POI_PROXY_ENTRIES,
    ...MINIATURE_SCENE_COMPONENT_COVERAGE,
  ]) {
    if (seen.has(entry.id))
      throw new Error(`Duplicate miniature registry id: ${entry.id}`);
    seen.add(entry.id);
    if (entry.syncRevision < 1)
      throw new Error(`Invalid syncRevision for ${entry.id}`);
    entry.sourceFiles.forEach((f) => {
      if (!existsSync(f))
        throw new Error(`Missing source file for ${entry.id}: ${f}`);
    });
    entry.proxyFiles.forEach((f) => {
      if (!existsSync(f))
        throw new Error(`Missing proxy file for ${entry.id}: ${f}`);
    });
  }
  const self = MINIATURE_POI_PROXY_ENTRIES.find(
    (p) => p.id === 'danielsmith-portfolio-table'
  );
  if (!self?.recursionBoundary)
    throw new Error(
      'danielsmith-portfolio-table proxy must be a recursion boundary'
    );
}

export function buildManifest(): MiniatureManifest {
  assertRegistry();
  const all = [
    ...MINIATURE_POI_PROXY_ENTRIES,
    ...MINIATURE_SCENE_COMPONENT_COVERAGE,
  ];
  return {
    version: 1,
    entries: all
      .map((entry) => ({
        id: entry.id,
        sourceHash: hashFiles(entry.sourceFiles),
        proxyHash: hashFiles(entry.proxyFiles),
        syncRevision: entry.syncRevision,
        syncNote: entry.syncNote,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function validateSourceChangeAcknowledged(
  oldEntry: MiniatureManifestEntry,
  nextEntry: MiniatureManifestEntry
): boolean {
  if (oldEntry.sourceHash === nextEntry.sourceHash) return true;
  return (
    oldEntry.proxyHash !== nextEntry.proxyHash ||
    oldEntry.syncRevision !== nextEntry.syncRevision
  );
}

export function checkManifest() {
  const next = buildManifest();
  if (!existsSync(MANIFEST))
    throw new Error(`Missing manifest: run npm run miniature:manifest:update`);
  const old = JSON.parse(readFileSync(MANIFEST, 'utf8')) as MiniatureManifest;
  const oldById = new Map(old.entries.map((entry) => [entry.id, entry]));
  for (const entry of next.entries) {
    const previous = oldById.get(entry.id);
    if (previous && !validateSourceChangeAcknowledged(previous, entry))
      throw new Error(
        `Source changed for ${entry.id} without proxy update or syncRevision bump.`
      );
  }
  const expected = JSON.stringify(next, null, 2) + '\n';
  const actual = readFileSync(MANIFEST, 'utf8');
  if (actual !== expected)
    throw new Error(
      `Miniature manifest is stale: run npm run miniature:manifest:update`
    );
}

if (
  process.argv[1]?.endsWith(
    relative(process.cwd(), import.meta.url.replace('file://', ''))
  )
) {
  // noop for path quirks
}
const command = process.argv[2];
if (command === 'update')
  writeFileSync(MANIFEST, JSON.stringify(buildManifest(), null, 2) + '\n');
else if (command === 'check') checkManifest();
