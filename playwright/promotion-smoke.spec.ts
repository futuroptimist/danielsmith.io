import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from '@playwright/test';

const DEFAULT_BASE_URL = 'https://staging.danielsmith.io';
const EVIDENCE_DIR = path.join('test-results', 'promotion-smoke');
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const RESUME_REQUIRED_HOSTS = new Set([
  'danielsmith.io',
  'staging.danielsmith.io',
]);

type CheckStatus = 'passed' | 'failed' | 'skipped';

interface EndpointEvidence {
  finalUrl: string;
  headers: Record<string, string | undefined>;
  name: string;
  status: number;
}

interface CheckEvidence {
  details?: Record<string, unknown>;
  error?: string;
  name: string;
  status: CheckStatus;
}

interface PromotionSmokeEvidence {
  baseUrl: string;
  checks: CheckEvidence[];
  endpoints: EndpointEvidence[];
  generatedAt: string;
  summary: {
    failed: number;
    passed: number;
    skipped: number;
  };
}

const baseUrl = normalizeBaseUrl(
  process.env.PROMOTION_SMOKE_BASE_URL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    getCliBaseUrl(process.argv)
);
const skipResume = process.env.PROMOTION_SMOKE_SKIP_RESUME === '1';
const evidence: PromotionSmokeEvidence = {
  baseUrl,
  checks: [],
  endpoints: [],
  generatedAt: new Date().toISOString(),
  summary: { failed: 0, passed: 0, skipped: 0 },
};

function getCliBaseUrl(argv: string[]): string | undefined {
  const inlineFlag = argv.find((arg) => arg.startsWith('--base-url='));
  if (inlineFlag) {
    return inlineFlag.slice('--base-url='.length);
  }

  const flagIndex = argv.indexOf('--base-url');
  if (flagIndex >= 0) {
    return argv.at(flagIndex + 1);
  }

  return undefined;
}

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? DEFAULT_BASE_URL).replace(/\/$/, '');
}

function buildUrl(pathname: string): string {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function collectHeaders(
  response: APIResponse
): Record<string, string | undefined> {
  const headers = response.headers();

  return {
    'cache-control': headers['cache-control'],
    'content-type': headers['content-type'],
    location: headers.location,
  };
}

async function recordCheck(
  name: string,
  fn: () => Promise<Record<string, unknown> | undefined>
) {
  try {
    const details = await fn();
    evidence.checks.push({ details, name, status: 'passed' });
  } catch (error) {
    evidence.checks.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      status: 'failed',
    });
  }
}

function recordSkip(name: string, details: Record<string, unknown>) {
  evidence.checks.push({ details, name, status: 'skipped' });
}

async function writeEvidence() {
  evidence.generatedAt = new Date().toISOString();
  evidence.summary = evidence.checks.reduce(
    (summary, check) => ({
      ...summary,
      [check.status]: summary[check.status] + 1,
    }),
    { failed: 0, passed: 0, skipped: 0 }
  );

  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, 'evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
}

async function fetchEndpoint(
  request: APIRequestContext,
  name: string,
  pathname: string
): Promise<APIResponse> {
  const response = await request.get(buildUrl(pathname), { maxRedirects: 5 });
  evidence.endpoints.push({
    finalUrl: response.url(),
    headers: collectHeaders(response),
    name,
    status: response.status(),
  });
  return response;
}

async function assertHealthEndpoint(
  request: APIRequestContext,
  pathname: '/healthz' | '/livez'
) {
  const response = await fetchEndpoint(request, pathname, pathname);
  expect(response.status(), `${pathname} status`).toBe(200);
  expect(await response.json(), `${pathname} JSON body`).toEqual({
    status: 'ok',
  });

  const cacheControl = response.headers()['cache-control'];
  if (RESUME_REQUIRED_HOSTS.has(new URL(baseUrl).hostname)) {
    expect(cacheControl, `${pathname} Cache-Control`).toContain('no-store');
  }

  return {
    finalUrl: response.url(),
    status: response.status(),
  };
}

async function browserSupportsWebGL(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl')
    );
  });
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  await writeEvidence();
});

test('captures promotion smoke evidence', async ({ page, request }) => {
  await recordCheck('root returns this app HTML', async () => {
    const response = await fetchEndpoint(request, 'root', '/');
    const body = await response.text();
    expect(response.status(), 'root status').toBe(200);
    expect(response.headers()['content-type'], 'root content-type').toContain(
      'text/html'
    );
    expect(body, 'root document contains app shell').toContain('<div id="app"');
    expect(body, 'root document contains Vite entry or built module').toMatch(
      /src\/main\.ts|type="module" crossorigin/
    );
    expect(body, 'root is not legacy placeholder HTML').not.toMatch(
      /legacy|placeholder/i
    );

    return { finalUrl: response.url(), status: response.status() };
  });

  await recordCheck('liveness endpoint returns ok JSON', () =>
    assertHealthEndpoint(request, '/livez')
  );

  await recordCheck('health endpoint returns ok JSON', () =>
    assertHealthEndpoint(request, '/healthz')
  );

  const host = new URL(baseUrl).hostname;
  if (skipResume) {
    recordSkip('resume PDF contract', {
      reason: 'PROMOTION_SMOKE_SKIP_RESUME=1',
    });
  } else if (!RESUME_REQUIRED_HOSTS.has(host)) {
    recordSkip('resume PDF contract', {
      reason: 'resume is only required for staging/prod hosts',
      host,
    });
  } else {
    await recordCheck('resume PDF contract', async () => {
      const response = await fetchEndpoint(request, 'resume', '/resume.pdf');
      const contentType = response.headers()['content-type'] ?? '';
      expect(response.status(), 'resume status').toBe(200);
      expect(contentType, 'resume content-type').toMatch(
        /application\/pdf|octet-stream/i
      );

      return { finalUrl: response.url(), status: response.status() };
    });
  }

  await recordCheck('text mode renders fallback links', async () => {
    await page.goto(buildUrl('/?mode=text'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html'), 'text mode app state').toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(
      page.locator('#app[data-mode="text"] .text-fallback')
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /try immersive/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /resume/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /github/i }).first()
    ).toBeVisible();

    return { finalUrl: page.url() };
  });

  await recordCheck('immersive mode reaches one WebGL canvas', async () => {
    await page.goto(buildUrl('/?mode=immersive&disablePerformanceFailover=1'), {
      waitUntil: 'domcontentloaded',
    });

    if (!(await browserSupportsWebGL(page))) {
      recordSkip('immersive WebGL canvas count', {
        reason: 'browser does not support WebGL',
      });
      return { finalUrl: page.url(), webglSupported: false };
    }

    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expect(
      page.locator('html'),
      'immersive mode app state'
    ).toHaveAttribute('data-app-mode', 'immersive');
    await expect(page.locator('canvas'), 'immersive canvas count').toHaveCount(
      1
    );

    return { finalUrl: page.url(), webglSupported: true };
  });

  await writeEvidence();
  expect(
    evidence.checks.filter((check) => check.status === 'failed'),
    'promotion smoke failures'
  ).toEqual([]);
});
