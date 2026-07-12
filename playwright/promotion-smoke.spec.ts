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
const HEALTH_PATHS = ['/healthz', '/livez'] as const;
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type StepHeaders = Partial<
  Record<
    | 'cache-control'
    | 'content-disposition'
    | 'content-length'
    | 'content-type'
    | 'etag'
    | 'last-modified'
    | 'location',
    string
  >
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

type StepResult = Omit<StepEvidence, 'name' | 'status'> & {
  status?: StepEvidence['status'];
};

const evidence: {
  schemaVersion: 1;
  baseUrl: string;
  generatedAt: string;
  skipResume: boolean;
  summary: Record<StepEvidence['status'], number>;
  steps: StepEvidence[];
} = {
  schemaVersion: 1,
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

function visibleHeaders(response: HeaderProvider): StepHeaders {
  const headers = response.headers();
  return {
    'cache-control': headers['cache-control'],
    'content-disposition': headers['content-disposition'],
    'content-length': headers['content-length'],
    'content-type': headers['content-type'],
    etag: headers.etag,
    'last-modified': headers['last-modified'],
    location: headers.location,
  };
}

function failStep(
  message: string,
  response?: APIResponse | Response | null
): StepResult {
  return {
    finalUrl: response?.url(),
    headers: response ? visibleHeaders(response) : undefined,
    message,
    status: 'fail',
    statusCode: response?.status(),
  };
}

function passStep(response: APIResponse | Response): StepResult {
  return {
    finalUrl: response.url(),
    headers: visibleHeaders(response),
    status: 'pass',
    statusCode: response.status(),
  };
}

async function recordStep(name: string, run: () => Promise<StepResult>) {
  try {
    const result = await run();
    const status = result.status ?? 'pass';
    evidence.steps.push({ name, status, ...result });
    evidence.summary[status] += 1;
  } catch (error) {
    evidence.steps.push({
      name,
      status: 'fail',
      message:
        error instanceof Error && error.message
          ? 'Promotion smoke assertion failed.'
          : 'Promotion smoke step failed.',
    });
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

async function assertJsonHealth(
  response: APIResponse,
  endpointPath: string
): Promise<StepResult> {
  const step = passStep(response);

  if (response.status() !== 200) {
    return failStep(`${endpointPath} did not return HTTP 200.`, response);
  }

  const contentType = response.headers()['content-type'];
  if (!contentType?.includes('application/json')) {
    return failStep(
      `${endpointPath} did not return an application/json content type.`,
      response
    );
  }

  const cacheControl = response.headers()['cache-control'];
  if (!cacheControl?.includes('no-store')) {
    return failStep(
      `${endpointPath} did not return Cache-Control: no-store.`,
      response
    );
  }

  const body = await response.text();
  return body === '{"status":"ok"}'
    ? step
    : failStep(
        `${endpointPath} did not return the expected JSON body.`,
        response
      );
}

async function assertRootHtml(response: APIResponse): Promise<StepResult> {
  if (response.status() !== 200) {
    return failStep('GET / did not return HTTP 200.', response);
  }

  const body = await response.text();
  if (!body.includes('<title>danielsmith.io</title>')) {
    return failStep('GET / did not return the expected app HTML.', response);
  }

  return /placeholder|coming soon/i.test(body)
    ? failStep('GET / returned placeholder content.', response)
    : passStep(response);
}

async function assertResumePdf(response: APIResponse): Promise<StepResult> {
  if (response.status() !== 200) {
    return failStep('GET /resume.pdf did not return HTTP 200.', response);
  }

  if (!response.headers()['content-type']?.includes('pdf')) {
    return failStep(
      'GET /resume.pdf did not return a PDF content type.',
      response
    );
  }

  const pdfSignature = (await response.body()).subarray(0, 5).toString();
  return pdfSignature === '%PDF-'
    ? passStep(response)
    : failStep('GET /resume.pdf did not return a PDF signature.', response);
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
        return assertRootHtml(response);
      });

      for (const healthPath of HEALTH_PATHS) {
        await recordStep(`GET ${healthPath} JSON health`, async () => {
          const response = await api.get(healthPath);
          return assertJsonHealth(response, healthPath);
        });
      }

      await recordStep('GET /resume.pdf stable resume', async () => {
        if (evidence.skipResume) {
          return {
            status: 'skip',
            message: 'Skipped by PROMOTION_SMOKE_SKIP_RESUME/--skip-resume.',
          };
        }

        const response = await api.get('/resume.pdf', { maxRedirects: 10 });
        return assertResumePdf(response);
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
