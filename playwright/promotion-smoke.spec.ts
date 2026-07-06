import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  expect,
  test,
  type APIResponse,
  type Page,
  type TestInfo,
} from '@playwright/test';

type EndpointEvidence = {
  finalUrl: string;
  headers: Record<string, string>;
  ok: boolean;
  status: number;
};

type CheckEvidence = {
  details?: Record<string, unknown>;
  error?: string;
  name: string;
  passed: boolean;
};

type PromotionEvidence = {
  baseUrl: string;
  checks: CheckEvidence[];
  endpoints: Record<string, EndpointEvidence>;
  generatedAt: string;
  skipResume: boolean;
};

const HEALTH_PATHS = ['/livez', '/healthz'] as const;
const SKIP_RESUME = ['1', 'true', 'yes'].includes(
  (process.env.PROMOTION_SMOKE_SKIP_RESUME ?? '').toLowerCase()
);

function getBaseUrl(testInfo: TestInfo) {
  const configuredBaseUrl = testInfo.project.use.baseURL;

  if (!configuredBaseUrl) {
    throw new Error('Promotion smoke requires a base URL.');
  }

  return configuredBaseUrl.replace(/\/$/, '');
}

function isLocalBaseUrl(baseUrl: string) {
  const { hostname } = new URL(baseUrl);

  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  );
}

function summarizeResponse(response: APIResponse): EndpointEvidence {
  return {
    finalUrl: response.url(),
    headers: response.headers(),
    ok: response.ok(),
    status: response.status(),
  };
}

function expectNoStore(
  pathname: string,
  evidence: EndpointEvidence,
  baseUrl: string
) {
  const cacheControl = evidence.headers['cache-control'];

  if (
    isLocalBaseUrl(baseUrl) &&
    (!cacheControl || cacheControl.includes('no-cache'))
  ) {
    return;
  }

  expect(
    cacheControl,
    `${pathname} must expose Cache-Control: no-store`
  ).toContain('no-store');
}

async function recordCheck(
  evidence: PromotionEvidence,
  name: string,
  run: () => Promise<Record<string, unknown> | void>
) {
  try {
    const details = await run();
    evidence.checks.push({ details, name, passed: true });
  } catch (error) {
    evidence.checks.push({
      error: error instanceof Error ? error.message : String(error),
      name,
      passed: false,
    });
  }
}

async function writeEvidence(evidence: PromotionEvidence) {
  const evidenceDir = path.join(
    process.cwd(),
    'test-results',
    'promotion-smoke'
  );
  const safeBase = new URL(evidence.baseUrl).host.replace(
    /[^a-z0-9.-]+/gi,
    '_'
  );
  const timestamp = evidence.generatedAt.replace(/[:.]/g, '-');
  const evidencePath = path.join(evidenceDir, `${timestamp}-${safeBase}.json`);

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

  return evidencePath;
}

async function gotoMode(page: Page, pathWithQuery: string) {
  const response = await page.goto(pathWithQuery, {
    waitUntil: 'domcontentloaded',
  });

  expect(
    response,
    `${pathWithQuery} must return a browser response`
  ).not.toBeNull();
  expect(response?.ok(), `${pathWithQuery} must load successfully`).toBe(true);

  return response!;
}

test.describe('promotion smoke', () => {
  test('captures release-gate evidence for public endpoints and app modes', async ({
    page,
    request,
  }, testInfo) => {
    const baseUrl = getBaseUrl(testInfo);
    const evidence: PromotionEvidence = {
      baseUrl,
      checks: [],
      endpoints: {},
      generatedAt: new Date().toISOString(),
      skipResume: SKIP_RESUME,
    };

    await recordCheck(evidence, 'GET / returns current app HTML', async () => {
      const response = await request.get('/');
      evidence.endpoints['/'] = summarizeResponse(response);
      const body = await response.text();

      expect(response.ok(), 'GET / must succeed').toBe(true);
      expect(evidence.endpoints['/'].headers['content-type']).toContain(
        'text/html'
      );
      expect(body, 'GET / must include this app title').toContain(
        '<title>danielsmith.io</title>'
      );
      expect(body, 'GET / must include the app mount').toContain('id="app"');
      expect(
        body.toLowerCase(),
        'GET / must not be a legacy placeholder'
      ).not.toContain('legacy placeholder');

      return { finalUrl: response.url(), status: response.status() };
    });

    for (const healthPath of HEALTH_PATHS) {
      await recordCheck(
        evidence,
        `GET ${healthPath} returns ok JSON`,
        async () => {
          const response = await request.get(healthPath);
          evidence.endpoints[healthPath] = summarizeResponse(response);
          const payload = await response.json();

          expect(response.ok(), `GET ${healthPath} must succeed`).toBe(true);
          expect(payload.status, `${healthPath} status`).toBe('ok');
          expectNoStore(healthPath, evidence.endpoints[healthPath], baseUrl);

          return { finalUrl: response.url(), status: response.status() };
        }
      );
    }

    await recordCheck(
      evidence,
      '/?mode=text renders fallback links',
      async () => {
        const response = await gotoMode(page, '/?mode=text');

        await expect(
          page.locator('#app[data-mode="text"] .text-fallback')
        ).toBeVisible();
        await expect(
          page.locator('.text-fallback__link[data-action="resume"]')
        ).toBeVisible();
        await expect(
          page.locator('.text-fallback__link[data-action="github"]')
        ).toBeVisible();

        return { finalUrl: page.url(), status: response.status() };
      }
    );

    await recordCheck(
      evidence,
      '/?mode=immersive reaches one-canvas WebGL mode',
      async () => {
        const webglSupported = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          return Boolean(
            canvas.getContext('webgl2') ?? canvas.getContext('webgl')
          );
        });

        if (!webglSupported) {
          return { finalUrl: page.url(), status: null, webglSupported };
        }

        const response = await gotoMode(
          page,
          '/?mode=immersive&disablePerformanceFailover=1'
        );

        await page.waitForFunction(
          () => document.documentElement.dataset.appMode === 'immersive',
          undefined,
          { timeout: 45_000 }
        );
        await expect(page.locator('#app')).not.toHaveAttribute(
          'data-mode',
          'text'
        );
        await expect(page.locator('#app canvas')).toHaveCount(1, {
          timeout: 30_000,
        });

        return {
          finalUrl: page.url(),
          status: response.status(),
          webglSupported,
        };
      }
    );

    if (!SKIP_RESUME) {
      await recordCheck(
        evidence,
        'GET /resume.pdf returns stable PDF',
        async () => {
          const response = await request.get('/resume.pdf');
          evidence.endpoints['/resume.pdf'] = summarizeResponse(response);
          const contentType =
            evidence.endpoints['/resume.pdf'].headers['content-type'] ?? '';

          expect(response.ok(), 'GET /resume.pdf must succeed').toBe(true);
          expect(
            contentType,
            'GET /resume.pdf must return a PDF content type'
          ).toContain('pdf');

          return { finalUrl: response.url(), status: response.status() };
        }
      );
    } else {
      evidence.checks.push({
        name: 'GET /resume.pdf skipped by PROMOTION_SMOKE_SKIP_RESUME',
        passed: true,
      });
    }

    const evidencePath = await writeEvidence(evidence);
    const failures = evidence.checks.filter((check) => !check.passed);

    expect(
      failures,
      `Promotion smoke evidence written to ${evidencePath}`
    ).toEqual([]);
  });
});
