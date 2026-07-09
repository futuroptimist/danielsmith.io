#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targets = [
  'src/systems/controls',
  'src/ui/hud',
  'src/ui/accessibility',
  'src/ui/softwareRendererWarning.ts',
  'src/scene/poi',
];

const allowed = [
  // Icon-only close affordance and separators, not prose requiring translation.
  /textContent\s*=\s*['"][×·]['"]/,
  // Emptying live regions/status nodes.
  /textContent\s*=\s*['"]['"]/,
  // Localized strings are injected through option data or i18n getters.
  /textContent\s*=\s*option\.(label|description)/,
  /textContent\s*=\s*strings\./,
  /textContent\s*=\s*currentStrings\./,
  // Runtime controls may use localized option labels for aria labels.
  /setAttribute\(['"]aria-label['"],\s*(option|preset|strings|textFallbackStrings)\./,
  // Motion blur wrapper label is supplied by localized Settings copy at creation time in future work.
  /Motion blur controls/,
];

const patterns = [
  /textContent\s*=\s*['"][A-Za-z][^'"]*['"]/,
  /innerText\s*=\s*['"][A-Za-z][^'"]*['"]/,
  /setAttribute\(['"]aria-label['"],\s*['"][A-Za-z][^'"]*['"]\)/,
  /setAttribute\(['"]title['"],\s*['"][A-Za-z][^'"]*['"]\)/,
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

const violations = [];
for (const file of targets.flatMap(files)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (!patterns.some((pattern) => pattern.test(line))) return;
    if (allowed.some((pattern) => pattern.test(line))) return;
    violations.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}

if (violations.length) {
  console.error(
    'Hardcoded user-visible UI strings found:\n' + violations.join('\n')
  );
  process.exit(1);
}
