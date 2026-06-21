import {
  inspectColliders,
  formatColliderReport,
  parseColliderInspectArgs,
} from './colliderInspect';
import { collectRuntimeColliders } from './runtimeColliderCollector';

async function main(): Promise<void> {
  try {
    const options = parseColliderInspectArgs(process.argv.slice(2));
    const colliders = await collectRuntimeColliders();
    const matches = inspectColliders(colliders, options);
    process.stdout.write(
      options.json
        ? `${JSON.stringify(matches, null, 2)}\n`
        : `${formatColliderReport(matches)}\n`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`collider:inspect failed: ${message}\n`);
    process.exitCode = 1;
  }
}

void main();
