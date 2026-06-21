import { spawn, type ChildProcess } from 'node:child_process';

import { chromium, type Browser, type Page } from '@playwright/test';

import type { RuntimeColliderMetadata } from './colliderInspect';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';

type PortfolioWindow = Window & {
  portfolio?: {
    debugColliders?: {
      getColliders(): RuntimeColliderMetadata[];
    };
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(
  baseUrl: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerReady(baseUrl)) {
      return;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function collectFromImmersive(
  page: Page,
  baseUrl: string
): Promise<RuntimeColliderMetadata[]> {
  const url = new URL(baseUrl);
  url.searchParams.set('mode', 'immersive');
  url.searchParams.set('disablePerformanceFailover', '1');
  try {
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('net::ERR_ABORTED')) {
      throw error;
    }
  }
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (page.isClosed()) {
      throw new Error(
        'Immersive runtime page closed before debug colliders loaded'
      );
    }
    try {
      const colliders = await page.evaluate(
        () =>
          (
            window as PortfolioWindow
          ).portfolio?.debugColliders?.getColliders() ?? null
      );
      if (colliders) {
        return colliders;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('Target page') ||
        message.includes('has been closed')
      ) {
        throw new Error(
          'Immersive runtime page closed before debug colliders loaded'
        );
      }
      throw error;
    }
    await sleep(250);
  }
  throw new Error('Timed out waiting for debug colliders API');
}

export async function collectRuntimeColliders(
  options: {
    baseUrl?: string;
    timeoutMs?: number;
  } = {}
): Promise<RuntimeColliderMetadata[]> {
  const baseUrl =
    options.baseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
  const ownsServer = !options.baseUrl && !process.env.PLAYWRIGHT_BASE_URL;
  let server: ChildProcess | undefined;
  let browser: Browser | undefined;

  try {
    if (ownsServer && !(await isServerReady(baseUrl))) {
      server = spawn(
        'npm',
        ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
        {
          detached: process.platform !== 'win32',
          stdio: 'ignore',
          shell: process.platform === 'win32',
        }
      );
    }
    await waitForServer(baseUrl, options.timeoutMs ?? 120_000);

    browser = await chromium.launch({
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    return await collectFromImmersive(page, baseUrl);
  } finally {
    await browser?.close();
    if (server) {
      if (process.platform === 'win32') {
        server.kill();
      } else if (server.pid) {
        process.kill(-server.pid, 'SIGTERM');
      }
    }
  }
}
