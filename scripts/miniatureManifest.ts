import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import {
  createScanner,
  LanguageVariant,
  ScriptTarget,
  SyntaxKind,
} from 'typescript';

import {
  MINIATURE_POI_PROXY_DEFINITIONS,
  MINIATURE_POI_PROXY_REGISTRY,
} from '../src/scene/miniature/poiProxyRegistry';
import {
  MINIATURE_SCENE_COMPONENT_COVERAGE,
  type MiniatureSceneComponentCoverage,
} from '../src/scene/miniature/sceneComponentRegistry';

const MANIFEST_PATH = 'src/scene/miniature/miniatureManifest.generated.json';
const AUDITED_DIRS = [
  'src/scene/structures',
  'src/scene/environments',
  'src/scene/level',
  'src/scene/avatar',
  'src/scene/lighting',
  'src/scene/poi',
];
const EXCLUDED_FILE_PATTERNS = [/\.test\.ts$/, /__tests__\//, /types\.ts$/];

interface Entry {
  id: string;
  sourceFiles: readonly string[];
  proxyFiles: readonly string[];
  syncRevision: number;
  syncNote?: string;
}

export function normalizedTypeScriptTokens(source: string) {
  const scanner = createScanner(
    ScriptTarget.Latest,
    true,
    LanguageVariant.Standard,
    source
  );
  const tokens: string[] = [];
  let token = scanner.scan();
  while (token !== SyntaxKind.EndOfFileToken) {
    tokens.push(`${token}:${scanner.getTokenText()}`);
    token = scanner.scan();
  }
  return tokens.join('\n');
}

function hash(parts: readonly string[]) {
  const h = createHash('sha256');
  parts.forEach((part) => h.update(part).update('\0'));
  return h.digest('hex');
}

function fileFingerprint(files: readonly string[]) {
  return hash(
    files.map((file) => {
      if (!existsSync(file))
        throw new Error(`Miniature manifest file is missing: ${file}`);
      return `${file}\n${normalizedTypeScriptTokens(readFileSync(file, 'utf8'))}`;
    })
  );
}

function allEntries(): Entry[] {
  return [
    ...MINIATURE_POI_PROXY_DEFINITIONS,
    ...MINIATURE_SCENE_COMPONENT_COVERAGE.map((entry): Entry => {
      const coverage = entry as MiniatureSceneComponentCoverage;
      return {
        id: coverage.id,
        sourceFiles: coverage.sourceFiles,
        proxyFiles: coverage.proxyFiles ?? [],
        syncRevision: coverage.syncRevision,
        syncNote: coverage.syncNote ?? coverage.reason,
      };
    }),
  ];
}

function validateRegistry(entries: Entry[]) {
  const seen = new Set<string>();
  entries.forEach((entry) => {
    if (seen.has(entry.id))
      throw new Error(`Duplicate miniature registry id: ${entry.id}`);
    seen.add(entry.id);
    if (entry.syncRevision < 1)
      throw new Error(`${entry.id} must have a positive syncRevision`);
    [...entry.sourceFiles, ...entry.proxyFiles].forEach((file) => {
      if (!existsSync(file))
        throw new Error(`${entry.id} references missing file ${file}`);
    });
  });
  if (
    !MINIATURE_POI_PROXY_REGISTRY['danielsmith-portfolio-table']
      .recursionBoundary
  ) {
    throw new Error(
      'danielsmith.io miniature self-proxy must be marked as a recursion boundary'
    );
  }
  const owners = new Map<string, string>();
  entries.forEach((entry) =>
    entry.sourceFiles.forEach((file) => {
      const owner = owners.get(file);
      if (
        owner &&
        owner !== entry.id &&
        file !== 'src/scene/poi/registry.ts' &&
        file !== 'src/scene/poi/placements.ts' &&
        file !== 'src/scene/poi/constants.ts'
      ) {
        throw new Error(
          `Source file ${file} is owned by both ${owner} and ${entry.id}`
        );
      }
      owners.set(file, entry.id);
    })
  );
}

function buildManifest() {
  const entries = allEntries().sort((a, b) => a.id.localeCompare(b.id));
  validateRegistry(entries);
  return {
    generatedBy: 'scripts/miniatureManifest.ts',
    auditedDirs: AUDITED_DIRS,
    entries: entries.map((entry) => ({
      id: entry.id,
      sourceFiles: [...entry.sourceFiles].sort(),
      proxyFiles: [...entry.proxyFiles].sort(),
      syncRevision: entry.syncRevision,
      syncNote: entry.syncNote ?? '',
      sourceFingerprint: fileFingerprint([...entry.sourceFiles].sort()),
      proxyFingerprint: fileFingerprint([...entry.proxyFiles].sort()),
      metadataFingerprint: hash([
        entry.id,
        String(entry.syncRevision),
        entry.syncNote ?? '',
      ]),
    })),
  };
}

function assertAuditedFilesClassified(
  manifest: ReturnType<typeof buildManifest>
) {
  const tracked = new Set(
    manifest.entries.flatMap((entry) => [
      ...entry.sourceFiles,
      ...entry.proxyFiles,
    ])
  );
  const files = execFileSync('git', ['ls-files', ...AUDITED_DIRS], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((file) => file.endsWith('.ts'))
    .filter(
      (file) => !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(file))
    );
  const unknown = files.filter((file) => !tracked.has(file));
  if (unknown.length)
    throw new Error(
      `Unaudited miniature production geometry sources:\n${unknown.join('\n')}`
    );
}

function assertNoInlineMainGeometry() {
  const main = readFileSync('src/main.ts', 'utf8');
  const scanner = createScanner(
    ScriptTarget.Latest,
    true,
    LanguageVariant.Standard,
    main
  );
  let token = scanner.scan();
  while (token !== SyntaxKind.EndOfFileToken) {
    if (token === SyntaxKind.NewKeyword) {
      let sawGeometryConstructor = false;
      token = scanner.scan();
      while (
        token !== SyntaxKind.EndOfFileToken &&
        token !== SyntaxKind.OpenParenToken &&
        token !== SyntaxKind.SemicolonToken
      ) {
        if (
          token === SyntaxKind.Identifier &&
          scanner.getTokenText().endsWith('Geometry')
        ) {
          sawGeometryConstructor = true;
        }
        token = scanner.scan();
      }
      if (sawGeometryConstructor && token === SyntaxKind.OpenParenToken) {
        throw new Error(
          'src/main.ts must not construct visible geometry inline; use audited builder modules.'
        );
      }
    }
    token = scanner.scan();
  }
}

export function checkManifest() {
  const next = buildManifest();
  assertAuditedFilesClassified(next);
  assertNoInlineMainGeometry();
  if (!existsSync(MANIFEST_PATH))
    throw new Error(
      `${MANIFEST_PATH} is missing. Run npm run miniature:manifest:update.`
    );
  const current = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const nextText = `${JSON.stringify(next, null, 2)}\n`;
  const currentText = `${JSON.stringify(current, null, 2)}\n`;
  if (currentText !== nextText)
    throw new Error(
      'Miniature manifest is stale. Review proxies, bump syncRevision with a note if needed, then run npm run miniature:manifest:update.'
    );
}

if (process.argv.includes('--update')) {
  const manifest = buildManifest();
  assertAuditedFilesClassified(manifest);
  assertNoInlineMainGeometry();
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  execFileSync('npx', ['prettier', '--write', MANIFEST_PATH], {
    stdio: 'ignore',
  });
  console.log(`Updated ${relative(process.cwd(), MANIFEST_PATH)}`);
} else {
  checkManifest();
  console.log('Miniature manifest is current.');
}
