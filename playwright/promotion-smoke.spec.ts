import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  expect,
  request,
  test,
  type APIResponse,
  type Page,
} from '@playwright/test';

const DEFAULT_BASE_URL = 'https://staging.danielsmith.io';
const EVIDENCE_DIR = path.join('test-results', 'promotion-smoke');
const baseUrl = normalizeBaseUrl(
  process.env.PROMOTION_SMOKE_BASE_URL ?? DEFAULT_BASE_URL
);
const skipResume = ['1', 'true', 'yes'].includes(
  (process.env.PROMOTION_SMOKE_SKIP_RESUME ?? '').toLowerCase()
);
const baseHostname = new URL(baseUrl).hostname;
const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(baseHostname);

type CheckStatus = 'passed' | 'failed' | 'skipped';

type EvidenceCheck = {
  name: string;
  status: CheckStatus;
  summary: string;
  finalUrl?: string;
  statusCode?: number;
  headers?: Record<string, string | undefined>;
};

const evidence: {
  timestamp: string;
  baseUrl: string;
  skipResume: boolean;
  checks: EvidenceCheck[];
} = {
  timestamp: new Date().toISOString(),
  baseUrl,
  skipResume,
  checks: [],
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function urlFor(route: string): string {
  return new URL(route, `${baseUrl}/`).toString();
}

function headerSnapshot(
  response: APIResponse
): Record<string, string | undefined> {
  const headers = response.headers();
  return {
    'cache-control': headers['cache-control'],
    'content-type': headers['content-type'],
    location: headers.location,
  };
}

async function record(
  name: string,
  run: () => Promise<Omit<EvidenceCheck, 'name' | 'status'>>
) {
  try {
    const result = await run();
    evidence.checks.push({ name, status: 'passed', ...result });
  } catch (error) {
    evidence.checks.push({
      name,
      status: 'failed',
      summary: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

test.afterAll(async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, 'evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
});

test.describe('promotion smoke', () => {
  test('public HTTP endpoints satisfy release contracts', async () => {
    const context = await request.newContext({ baseURL: baseUrl });

    await record('GET /', async () => {
      const response = await context.get('/');
      const body = await response.text();
      expect(response.status(), 'GET / status').toBe(200);
      expect(
        response.headers()['content-type'],
        'GET / content-type'
      ).toContain('text/html');
      expect(body, 'GET / serves the app root').toContain('<div id="app"');
      expect(body, 'GET / is not a legacy placeholder').not.toMatch(
        /legacy placeholder/i
      );
      return {
        finalUrl: response.url(),
        headers: headerSnapshot(response),
        statusCode: response.status(),
        summary: 'App HTML root returned without legacy placeholder copy.',
      };
    });

    for (const endpoint of ['/livez', '/healthz']) {
      await record(`GET ${endpoint}`, async () => {
        const response = await context.get(endpoint);
        const contentType = response.headers()['content-type'] ?? '';
        if (isLocalPreview && contentType.includes('text/html')) {
          return {
            finalUrl: response.url(),
            headers: headerSnapshot(response),
            statusCode: response.status(),
            summary:
              `${endpoint} skipped for local Vite preview because nginx health routes ` +
              'are only available in deployed containers.',
          };
        }
        expect(contentType, `${endpoint} content-type`).toContain(
          'application/json'
        );
        const json = (await response.json()) as { status?: string };
        const cacheControl = response.headers()['cache-control'];
        expect(response.status(), `${endpoint} status`).toBe(200);
        expect(json.status, `${endpoint} JSON status`).toBe('ok');
        if (cacheControl !== undefined) {
          expect(cacheControl, `${endpoint} cache-control`).toContain(
            'no-store'
          );
        }
        return {
          finalUrl: response.url(),
          headers: headerSnapshot(response),
          statusCode: response.status(),
          summary: `${endpoint} returned status ok with no-store when visible.`,
        };
      });
    }

    if (skipResume) {
      evidence.checks.push({
        name: 'GET /resume.pdf',
        status: 'skipped',
        summary: 'Skipped by --skip-resume or PROMOTION_SMOKE_SKIP_RESUME.',
      });
    } else {
      await record('GET /resume.pdf', async () => {
        const response = await context.get('/resume.pdf');
        expect(response.status(), 'GET /resume.pdf status').toBeLessThan(400);
        expect(
          response.headers()['content-type'],
          'GET /resume.pdf content-type'
        ).toMatch(/pdf/i);
        return {
          finalUrl: response.url(),
          headers: headerSnapshot(response),
          statusCode: response.status(),
          summary: 'Stable resume PDF endpoint returned a PDF response.',
        };
      });
    }

    await context.dispose();
  });

  test('text fallback and immersive modes satisfy launch contracts', async ({
    page,
  }) => {
    await record('GET /?mode=text', async () => {
      const response = await page.goto(urlFor('/?mode=text'), {
        waitUntil: 'domcontentloaded',
      });
      expect(response, 'text mode navigation response').not.toBeNull();
      await expect(
        page.locator('html'),
        'text mode app marker'
      ).toHaveAttribute('data-app-mode', 'fallback');
      await expect(
        page.locator('#app[data-mode="text"] .text-fallback')
      ).toBeVisible();
      await expect(page.locator('a[href="/resume.pdf"]').first()).toBeVisible();
      return {
        finalUrl: page.url(),
        headers: response ? headerSnapshot(response) : undefined,
        statusCode: response?.status(),
        summary: 'Text fallback rendered and exposed launch links.',
      };
    });

    await record(
      'GET /?mode=immersive&disablePerformanceFailover=1',
      async () => {
        const webglSupported = await browserSupportsWebGl(page);
        const response = await page.goto(
          urlFor('/?mode=immersive&disablePerformanceFailover=1'),
          {
            waitUntil: 'domcontentloaded',
          }
        );
        expect(response, 'immersive navigation response').not.toBeNull();
        if (!webglSupported) {
          return {
            finalUrl: page.url(),
            headers: response ? headerSnapshot(response) : undefined,
            statusCode: response?.status(),
            summary: 'Browser lacks WebGL support; canvas assertion skipped.',
          };
        }
        await page.waitForFunction(
          () => document.documentElement.dataset.appMode === 'immersive'
        );
        await expect(page.locator('#app canvas')).toHaveCount(1);
        return {
          finalUrl: page.url(),
          headers: response ? headerSnapshot(response) : undefined,
          statusCode: response?.status(),
          summary:
            'Immersive mode reached WebGL canvas with exactly one app canvas.',
        };
      }
    );
  });
});

async function browserSupportsWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  });
}
