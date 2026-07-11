import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('static nginx runtime observability contracts', () => {
  const nginxConfig = readRepoFile('docker/nginx/default.conf');

  it('serves health endpoints as explicit JSON responses instead of SPA fallbacks', () => {
    expect(nginxConfig).toContain('location = /healthz');
    expect(nginxConfig).toContain('location = /livez');
    expect(nginxConfig).toContain('default_type application/json;');
    expect(nginxConfig).toContain(
      'add_header Cache-Control "no-store" always;'
    );
    expect(nginxConfig).toContain(
      'return 200 \'{"status":"ok","service":"danielsmith.io","check":"healthz"}\';'
    );
    expect(nginxConfig).toContain(
      'return 200 \'{"status":"ok","service":"danielsmith.io","check":"livez"}\';'
    );
  });

  it('keeps local preview health files aligned with the nginx JSON contract', () => {
    expect(JSON.parse(readRepoFile('public/healthz'))).toEqual({
      check: 'healthz',
      service: 'danielsmith.io',
      status: 'ok',
    });
    expect(JSON.parse(readRepoFile('public/livez'))).toEqual({
      check: 'livez',
      service: 'danielsmith.io',
      status: 'ok',
    });
  });

  it('serves the stable resume PDF path as a file contract, not the HTML fallback', () => {
    expect(nginxConfig).toContain('location = /resume.pdf');
    expect(nginxConfig).toContain('default_type application/pdf;');
    expect(nginxConfig).toContain('try_files /resume.pdf =404;');
    expect(nginxConfig).toContain('location @spa_fallback');
  });
});
