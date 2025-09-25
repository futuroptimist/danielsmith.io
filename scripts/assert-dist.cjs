#!/usr/bin/env node
const { access } = require('fs/promises');
const path = require('path');

const artifact = path.join(__dirname, '..', 'dist', 'index.html');

(async () => {
  try {
    await access(artifact);
    console.log(`Smoke check passed: ${artifact} exists.`);
  } catch (error) {
    console.error('Smoke check failed: dist/index.html missing.');
    process.exitCode = 1;
  }
})();
