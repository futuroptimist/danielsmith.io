import { spawn, type ChildProcess } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser, type Page } from '@playwright/test';

export type RuntimeColliderBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type RuntimeColliderMetadata = {
  id: string;
  floor: string;
  category: string;
  name: string;
  bounds: RuntimeColliderBounds;
  sourceId?: string;
  sourceType?: string;
  purpose?: string;
  intent?: string;
  role?: string;
  debugId?: string;
};

type PortfolioWindow = Window & {
  portfolio?: {
    debugColliders?: {
      getColliders(): RuntimeColliderMetadata[];
    };
  };
};

export type RuntimeColliderCollectorOptions = {
  baseUrl?: string;
  timeoutMs?: number;
};

export const DEFAULT_COLLIDER_RUNTIME_BASE_URL = 'http://127.0.0.1:5173';

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const withTimeoutSignal = async <T>(
  timeoutMs: number,
  action: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const buildImmersiveUrl = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('mode', 'immersive');
  url.searchParams.set('disablePerformanceFailover', '1');
  return url.toString();
};

const isReachable = async (
  baseUrl: string,
  timeoutMs = 2_000
): Promise<boolean> => {
  try {
    const response = await withTimeoutSignal(timeoutMs, (signal) =>
      fetch(baseUrl, { method: 'HEAD', signal })
    );
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
};

const waitForServer = async (baseUrl: string, timeoutMs: number) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const remainingMs = Math.max(1, timeoutMs - (Date.now() - startedAt));
    if (await isReachable(baseUrl, Math.min(2_000, remainingMs))) {
      return;
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for Vite dev server at ${baseUrl}.`);
};

const waitForServerOrExit = async (
  baseUrl: string,
  timeoutMs: number,
  child: ChildProcess
) => {
  let handleExit:
    | ((code: number | null, signal: NodeJS.Signals | null) => void)
    | undefined;

  let handleError: ((error: Error) => void) | undefined;

  const exited = new Promise<never>((_, reject) => {
    handleExit = (code, signal) => {
      const status = signal
        ? `signal ${signal}`
        : `exit code ${code ?? 'unknown'}`;
      reject(new Error(`Vite dev server failed to start (${status}).`));
    };
    handleError = (error) => {
      reject(new Error(`Vite dev server failed to start: ${error.message}`));
    };
    child.once('exit', handleExit);
    child.once('error', handleError);
  });

  try {
    await Promise.race([waitForServer(baseUrl, timeoutMs), exited]);
  } finally {
    if (handleExit) {
      child.off('exit', handleExit);
    }
    if (handleError) {
      child.off('error', handleError);
    }
  }
};

const startViteServer = async (
  baseUrl: string,
  timeoutMs: number
): Promise<ChildProcess> => {
  const url = new URL(baseUrl);
  const host = url.hostname || '127.0.0.1';
  const port = url.port || '5173';
  const viteBin = fileURLToPath(
    new URL('../node_modules/vite/bin/vite.js', import.meta.url)
  );
  const child = spawn(
    process.execPath,
    [viteBin, '--host', host, '--port', port],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'ignore',
    }
  );

  try {
    await waitForServerOrExit(baseUrl, timeoutMs, child);
  } catch (error) {
    child.kill();
    throw error;
  }

  return child;
};

const closeStartedServer = async (server: ChildProcess | undefined) => {
  if (!server) {
    return;
  }
  server.kill();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 1_000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
};

const readCollidersFromPage = async (page: Page, timeoutMs: number) => {
  await page.waitForFunction(
    () => {
      const api = (window as PortfolioWindow).portfolio?.debugColliders;
      return Boolean(api && api.getColliders().length > 0);
    },
    undefined,
    { timeout: timeoutMs }
  );

  return page.evaluate(() => {
    const api = (window as PortfolioWindow).portfolio?.debugColliders;
    if (!api) {
      throw new Error('window.portfolio.debugColliders is unavailable.');
    }
    return api.getColliders();
  });
};

export const collectRuntimePageData = async <T>(
  read: (page: Page) => Promise<T>,
  options: RuntimeColliderCollectorOptions = {}
): Promise<T> => {
  const suppliedBaseUrl = options.baseUrl ?? process.env.PLAYWRIGHT_BASE_URL;
  const baseUrl = suppliedBaseUrl ?? DEFAULT_COLLIDER_RUNTIME_BASE_URL;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const server = suppliedBaseUrl
    ? undefined
    : (await isReachable(baseUrl))
      ? undefined
      : await startViteServer(baseUrl, timeoutMs);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    await page.addInitScript(() => {
      (window as Window & { __name?: <T>(value: T) => T }).__name ??= (value) =>
        value;
    });
    await page.goto(buildImmersiveUrl(baseUrl), {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    return await read(page);
  } finally {
    await browser?.close().catch(() => undefined);
    await closeStartedServer(server).catch(() => undefined);
  }
};

export const collectRuntimeColliders = async (
  options: RuntimeColliderCollectorOptions = {}
): Promise<RuntimeColliderMetadata[]> =>
  collectRuntimePageData(
    (page) => readCollidersFromPage(page, options.timeoutMs ?? 120_000),
    options
  );
