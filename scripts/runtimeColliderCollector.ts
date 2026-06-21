import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

import { chromium } from '@playwright/test';

import type { RuntimeColliderMetadata } from './colliderInspection';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';
const READY_TIMEOUT_MS = 120_000;

const createImmersiveUrl = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('mode', 'immersive');
  url.searchParams.set('disablePerformanceFailover', '1');
  return url.toString();
};

const waitForServer = async (baseUrl: string): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status === 404) return;
    } catch {
      // Retry until Vite has finished booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Vite server at ${baseUrl}.`);
};

const startServer = (): ChildProcess =>
  spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });

const stopServer = async (server: ChildProcess): Promise<void> => {
  if (server.exitCode !== null || server.signalCode !== null) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    server.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      process.kill(-server.pid!, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  });
};

export const collectRuntimeColliders = async (
  options: {
    baseUrl?: string;
  } = {}
): Promise<RuntimeColliderMetadata[]> => {
  const baseUrl =
    options.baseUrl ?? process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL;
  const ownsServer = !options.baseUrl && !process.env.PLAYWRIGHT_BASE_URL;
  const server = ownsServer ? startServer() : undefined;
  const browser = await chromium.launch();

  try {
    await waitForServer(baseUrl);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    await page.goto(createImmersiveUrl(baseUrl), { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Boolean(window.portfolio?.debugColliders),
      null,
      {
        timeout: READY_TIMEOUT_MS,
      }
    );
    return await page.evaluate(() =>
      window.portfolio!.debugColliders!.getColliders()
    );
  } finally {
    await browser.close();
    if (server) {
      await stopServer(server);
    }
  }
};
