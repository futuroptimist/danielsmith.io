import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

describe('main module imports', () => {
  it('keeps camera-relative yaw helpers wired in', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const mainPath = resolve(currentDir, '../main.ts');
    const source = readFileSync(mainPath, 'utf-8');
    expect(source).toMatch(
      /import\s*\{[^}]*\bcomputeCameraRelativeYaw\b[^}]*\}\s*from '\.\/movement\/facing';/
    );
  });
});
