#!/usr/bin/env tsx
import {
  findColliderMatches,
  formatColliderInspection,
  formatNoMatchError,
  inspectColliderMatches,
  parseColliderInspectArgs,
} from './colliderInspection';
import { collectRuntimeColliders } from './runtimeColliderCollector';

const main = async () => {
  const options = parseColliderInspectArgs(process.argv.slice(2));
  const colliders = await collectRuntimeColliders();
  const matches = findColliderMatches(colliders, options.query);

  if (matches.length === 0) {
    throw new Error(formatNoMatchError(options.query, colliders.length));
  }

  const inspected = inspectColliderMatches(matches, colliders);
  if (options.json) {
    console.log(JSON.stringify(inspected, null, 2));
  } else {
    console.log(formatColliderInspection(inspected));
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
