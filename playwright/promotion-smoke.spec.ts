import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  expect,
  request,
  test,
  type APIResponse,
  type Page,
  type Response,
} from '@playwright/test';

const DEFAULT_BASE_URL = 'https://staging.danielsmith.io';
const EVIDENCE_DIR = path.join('test-results', 'promotion-smoke');
const HEALTH_PATHS = ['/livez', '/healthz'] as const;
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type StepHeaders = Partial<
  Record<'cache-control' | 'content-type' | 'location', string>
>;

type HeaderProvider = Pick<APIResponse | Response, 'headers'>;

type StepEvidence = {
  finalUrl?: string;
  headers?: StepHeaders;
  message?: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  statusCode?: number;
};

const evidence: {
  baseUrl: string;
  generatedAt: string;
  skipResume: boolean;
  summary: Record<StepEvidence['status'], number>;
  steps: StepEvidence[];
} = {
  baseUrl: normalizeBaseUrl(process.env.PROMOTION_SMOKE_BASE_URL),
  generatedAt: new Date().toISOString(),
  skipResume: isTruthy(process.env.PROMOTION_SMOKE_SKIP_RESUME),
  summary: { fail: 0, pass: 0, skip: 0 },
  steps: [],
};

function normalizeBaseUrl(value: string | undefined) {
  return (value && value.trim().replace(/\/$/, '')) || DEFAULT_BASE_URL;
}

function isTruthy(value: string | undefined) {
  return value === '1' || value === 'true' || value === 'yes';
}

function endpointUrl(endpointPath: string) {
  return new URL(endpointPath, `${evidence.baseUrl}/`).toString();
}

function isLocalPreview() {
  const hostname = new URL(evidence.baseUrl).hostname;
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

function visibleHeaders(response: HeaderProvider): StepHeaders {
  const headers = response.headers();
  return {
    'cache-control': headers['cache-control'],
    'content-type': headers['content-type'],
    location: headers.location,
  };
}

async function recordStep(
  name: string,
  run: () => Promise<
    Omit<StepEvidence, 'name' | 'status'> & { status?: StepEvidence['status'] }
  >
) {
  try {
    const result = await run();
    const status = result.status ?? 'pass';
    evidence.steps.push({ name, status, ...result });
    evidence.summary[status] += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    evidence.steps.push({ name, status: 'fail', message });
    evidence.summary.fail += 1;
  }
}

function expectNoFailedSteps() {
  const failures = evidence.steps.filter((step) => step.status === 'fail');

  expect(
    failures.map((step) => `${step.name}: ${step.message ?? 'failed'}`),
    'promotion smoke failed steps'
  ).toEqual([]);
}

async function writeEvidence() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await writeFile(
    path.join(EVIDENCE_DIR, 'promotion-smoke-evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`
  );
}

async function expectJsonHealth(response: APIResponse, endpointPath: string) {
  expect(response.status(), `${endpointPath} status code`).toBe(200);
  const body = await response.json();
  expect(body, `${endpointPath} JSON body`).toMatchObject({ status: 'ok' });

  const cacheControl = response.headers()['cache-control'];
  if (cacheControl !== undefined && !isLocalPreview()) {
    expect(cacheControl, `${endpointPath} cache-control`).toContain('no-store');
  }
}

async function assertWebGlSupported(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  });
}

test.describe('promotion smoke', () => {
  const shouldRunPromotionSmoke = process.env.PROMOTION_SMOKE_RUN === '1';

  test.skip(
    !shouldRunPromotionSmoke,
    'Promotion smoke only runs through npm run smoke:promotion.'
  );

  test.afterAll(async () => {
    if (shouldRunPromotionSmoke) {
      await writeEvidence();
    }
  });

  test('captures staging/prod readiness evidence', async ({ page }) => {
    const api = await request.newContext({ baseURL: evidence.baseUrl });

    try {
      await recordStep('GET / app HTML', async () => {
        const response = await api.get('/');
        expect(response.status(), 'GET / status code').toBe(200);
        const body = await response.text();
        expect(body, 'GET / should be this app HTML').toContain(
          '<title>danielsmith.io</title>'
        );
        expect(body, 'GET / should not be a placeholder').not.toMatch(
          /placeholder|coming soon/i
        );
        return {
          finalUrl: response.url(),
          headers: visibleHeaders(response),
          statusCode: response.status(),
        };
      });

      for (const healthPath of HEALTH_PATHS) {
        await recordStep(`GET ${healthPath} JSON health`, async () => {
          const response = await api.get(healthPath);
          await expectJsonHealth(response, healthPath);
          return {
            finalUrl: response.url(),
            headers: visibleHeaders(response),
            statusCode: response.status(),
          };
        });
      }

      await recordStep('GET /resume.pdf stable resume', async () => {
        if (evidence.skipResume) {
          return {
            status: 'skip',
            message: 'Skipped by PROMOTION_SMOKE_SKIP_RESUME/--skip-resume.',
          };
        }

        const response = await api.get('/resume.pdf');
        expect(response.status(), 'GET /resume.pdf status code').toBeLessThan(
          400
        );
        expect(
          response.headers()['content-type'],
          'GET /resume.pdf content type'
        ).toContain('pdf');
        return {
          finalUrl: response.url(),
          headers: visibleHeaders(response),
          statusCode: response.status(),
        };
      });

      await recordStep('/?mode=text text fallback', async () => {
        const response = await page.goto(endpointUrl('/?mode=text'), {
          waitUntil: 'domcontentloaded',
        });
        expect(response?.status(), '/?mode=text status code').toBe(200);
        await expect(
          page.locator('html'),
          '/?mode=text app mode'
        ).toHaveAttribute('data-app-mode', 'fallback');
        await expect(
          page.locator('#app[data-mode="text"] .text-fallback')
        ).toBeVisible();
        await expect(page.locator('[data-action="immersive"]')).toBeVisible();
        await expect(page.locator('[data-action="resume"]')).toHaveAttribute(
          'href',
          /resume\.pdf$/
        );
        await expect(page.locator('[data-action="github"]')).toBeVisible();
        return {
          finalUrl: page.url(),
          headers: response ? visibleHeaders(response) : undefined,
          statusCode: response?.status(),
        };
      });

      await recordStep('/?mode=immersive immersive canvas', async () => {
        const response = await page.goto(
          endpointUrl('/?mode=immersive&disablePerformanceFailover=1'),
          { waitUntil: 'domcontentloaded' }
        );
        expect(response?.status(), '/?mode=immersive status code').toBe(200);

        if (!(await assertWebGlSupported(page))) {
          return {
            status: 'skip',
            finalUrl: page.url(),
            message: 'Browser does not support WebGL in this environment.',
            statusCode: response?.status(),
          };
        }

        await page.waitForFunction(
          () => document.documentElement.dataset.appMode === 'immersive',
          undefined,
          { timeout: IMMERSIVE_READY_TIMEOUT_MS }
        );
        await expect(
          page.locator('#app canvas'),
          'immersive canvas count'
        ).toHaveCount(1);
        return {
          finalUrl: page.url(),
          headers: response ? visibleHeaders(response) : undefined,
          statusCode: response?.status(),
        };
      });
    } finally {
      await api.dispose();
    }

    expectNoFailedSteps();
  });
});
