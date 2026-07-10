#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cliTargets = process.argv.slice(2);
const targets = cliTargets.length
  ? cliTargets
  : [
      'src/systems/controls',
      'src/ui/hud',
      'src/ui/accessibility',
      'src/ui/softwareRendererWarning.ts',
      'src/scene/poi',
    ];

const allowlist = [
  {
    file: /src\/ui\/hud\/helpModal\.ts$/,
    literal: '×',
    reason: 'Icon-only close affordance, not translatable prose.',
  },
  {
    file: /src\/ui\/hud\/movementLegend\.ts$/,
    literal: '·',
    reason: 'Punctuation separator, not translatable prose.',
  },
  {
    file: /src\/systems\/controls\/avatarVariantControl\.ts$/,
    literal: '',
    reason: 'Clears the live region before the next localized announcement.',
  },
];

const propertyNames = [
  'title',
  'label',
  'description',
  'heading',
  'placeholder',
  'ariaLabel',
  'titleTemplate',
  'announcement',
  'selectedAnnouncementTemplate',
  'enabledAnnouncementTemplate',
  'disabledAnnouncementTemplate',
];

const patterns = [
  {
    name: 'textContent assignment',
    regex: /\b(?:textContent|innerText)\s*=\s*(['"])([A-Za-z][^'"]*)\1/g,
  },
  {
    name: 'localized property literal',
    regex: new RegExp(
      `\\b(?:${propertyNames.join('|')})\\s*:\\s*(['\"])([A-Za-z][^'\"]*)\\1`,
      'g'
    ),
  },
  {
    name: 'localized default initializer',
    regex: new RegExp(
      `\\b(?:${propertyNames.join('|')})\\s*=\\s*(['\"])([A-Za-z][^'\"]*)\\1`,
      'g'
    ),
  },
  {
    name: 'setAttribute literal',
    regex:
      /setAttribute\(\s*(['"])(?:aria-label|title|placeholder)\1\s*,\s*(['"])([A-Za-z][^'"]*)\2\s*\)/g,
    literalIndex: 3,
  },
  {
    name: 'dataset.hudAnnounce literal',
    regex: /dataset\.hudAnnounce\s*=\s*(['"])([A-Za-z][^'"]*)\1/g,
  },
];

function files(entry) {
  const stat = fs.statSync(entry);
  if (stat.isFile()) return entry.endsWith('.ts') ? [entry] : [];
  return fs.readdirSync(entry, { withFileTypes: true }).flatMap((dirent) => {
    const child = path.join(entry, dirent.name);
    if (dirent.isDirectory()) return files(child);
    return child.endsWith('.ts') && !child.endsWith('.test.ts') ? [child] : [];
  });
}

function isAllowed(file, literal) {
  return allowlist.some(
    (entry) => entry.file.test(file) && entry.literal === literal
  );
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

const violations = [];
for (const file of targets.flatMap(files)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.regex)) {
      const literal = match[pattern.literalIndex ?? 2];
      if (isAllowed(file, literal)) continue;
      const lineNumber = lineForOffset(source, match.index ?? 0);
      const line = source.split('\n')[lineNumber - 1].trim();
      violations.push(`${file}:${lineNumber}: ${pattern.name}: ${line}`);
    }
  }
}

if (violations.length) {
  console.error(
    'Hardcoded user-visible UI strings found:\n' + violations.join('\n')
  );
  process.exit(1);
}
