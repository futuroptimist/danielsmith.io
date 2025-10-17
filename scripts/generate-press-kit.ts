#!/usr/bin/env node
import { writePressKitSummary } from '../src/tools/pressKit';

async function main() {
  try {
    const { outputPath } = await writePressKitSummary();
    console.log(`Press kit summary written to ${outputPath}`);
  } catch (error) {
    console.error('Failed to generate press kit summary.');
    if (error instanceof Error) {
      console.error(error.stack ?? error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

void main();
