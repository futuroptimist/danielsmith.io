#!/usr/bin/env node
const { access } = require('fs/promises');
const path = require('path');

const requiredFiles = [
  path.join(__dirname, '..', 'docs', 'prompts', 'codex', 'baseline.md'),
  path.join(__dirname, '..', 'docs', 'prompts', 'codex', 'polish.md'),
  path.join(__dirname, '..', 'docs', 'metrics', 'lighting.md'),
  path.join(__dirname, '..', 'docs', 'metrics', 'accessibility.md'),
];

(async () => {
  try {
    await Promise.all(requiredFiles.map((filePath) => access(filePath)));
    console.log('Docs check passed.');
  } catch (error) {
    console.error(
      'Docs check failed:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  }
})();
