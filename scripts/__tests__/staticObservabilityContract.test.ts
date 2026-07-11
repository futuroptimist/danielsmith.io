import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');

async function readRepoFile(relativePath: string) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

describe('static nginx observability contract', () => {
  it('serves root through the app index instead of a placeholder', async () => {
    const indexHtml = await readRepoFile('index.html');

    expect(indexHtml).toContain('<title>danielsmith.io</title>');
    expect(indexHtml).not.toMatch(/placeholder|coming soon/i);
  });

  it('keeps health and liveness endpoints exact JSON files for preview smoke', async () => {
    await expect(readRepoFile('public/healthz')).resolves.toBe(
      '{"status":"ok"}\n'
    );
    await expect(readRepoFile('public/livez')).resolves.toBe(
      '{"status":"ok"}\n'
    );
  });

  it('keeps nginx health and liveness responses from falling back to index.html', async () => {
    const nginxConfig = await readRepoFile('docker/nginx/default.conf');

    for (const endpoint of ['/healthz', '/livez']) {
      expect(nginxConfig).toContain(`location = ${endpoint}`);
      expect(nginxConfig).toMatch(
        new RegExp(
          `location = ${endpoint.replace('/', '\\/')} \\{[\\s\\S]*?default_type application/json;[\\s\\S]*?add_header Cache-Control "no-store" always;[\\s\\S]*?return 200 '\\{"status":"ok"\\}';[\\s\\S]*?\\}`
        )
      );
    }
  });

  it('keeps resume.pdf available as the stable static PDF artifact', async () => {
    const resumeBytes = await readFile(
      path.join(repoRoot, 'public/resume.pdf')
    );

    expect(resumeBytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
