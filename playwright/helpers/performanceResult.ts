import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Page } from '@playwright/test';

import {
  createPerformanceResult,
  serializePerformanceResult,
  type CreatePerformanceResultInput,
  type PerformanceResultV1,
} from '../../src/app/performanceResult';
import type { InputLatencySummary } from '../../src/systems/performance/inputLatencyMonitor';

const RESULT_PATH = path.join(
  'test-results',
  'controlled-performance',
  'controlled-performance-result-v1.json'
);

interface BrowserMeasurementProbe {
  applicationReadyMs?: number;
  inputSummary?: InputLatencySummary;
}

declare global {
  interface Window {
    __controlledPerformanceProbe?: BrowserMeasurementProbe;
  }
}

/** Shares terminal cancellation and page cleanup with the visitor journey. */
export function createPageLifecycle(page: Page) {
  let cleanup: Promise<void> | undefined;
  return {
    own(signal: AbortSignal) {
      const close = () => {
        cleanup ??= page.close().catch(() => undefined);
      };
      signal.addEventListener('abort', close, { once: true });
      return () => signal.removeEventListener('abort', close);
    },
    async settle() {
      await cleanup;
    },
  };
}

export async function readControlledBuildInfo(page: Page) {
  const response = await page.request.get('/runtime/build-info.json');
  if (!response.ok())
    throw new TypeError('Controlled build identity is unavailable.');
  const value = (await response.json()) as Record<string, unknown>;
  const environment = value.environment;
  const tag = typeof value.tag === 'string' ? value.tag.trim() : '';
  if (
    value.schemaVersion !== 1 ||
    !['dev', 'staging', 'prod'].includes(environment as string) ||
    !/^[A-Za-z0-9._:-]{1,80}$/.test(tag)
  ) {
    throw new TypeError('Controlled build identity is invalid.');
  }
  return { environment: environment as 'dev' | 'staging' | 'prod', tag };
}

export async function writePerformanceResult(result: PerformanceResultV1) {
  await mkdir(path.dirname(RESULT_PATH), { recursive: true });
  await writeFile(RESULT_PATH, `${serializePerformanceResult(result)}\n`);
}

/** Installs before navigation so readiness is measured from the navigation time origin. */
export async function installPerformanceResultProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: BrowserMeasurementProbe = {};
    window.__controlledPerformanceProbe = probe;
    const observer = new MutationObserver(() => {
      const root = document.documentElement;
      if (
        root &&
        !root.hasAttribute('data-app-loading') &&
        ['immersive', 'fallback'].includes(root.dataset.appMode ?? '')
      ) {
        probe.applicationReadyMs = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document, {
      attributes: true,
      attributeFilter: ['data-app-loading', 'data-app-mode'],
      subtree: true,
    });
    window.addEventListener('portfolio:input-latency-summary', (event) => {
      probe.inputSummary = (
        event as CustomEvent<{ summary: InputLatencySummary }>
      ).detail.summary;
    });
  });
}

export async function resetInputLatencyWindow(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.evaluate(() => {
    if (window.__controlledPerformanceProbe) {
      delete window.__controlledPerformanceProbe.inputSummary;
    }
  });
}

export async function readPerformanceResult(
  page: Page,
  input: Omit<
    CreatePerformanceResultInput,
    'applicationReadyMs' | 'interactionSummary'
  >
): Promise<PerformanceResultV1> {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const probe = await page.evaluate(() => window.__controlledPerformanceProbe);
  return createPerformanceResult({
    ...input,
    applicationReadyMs: probe?.applicationReadyMs,
    interactionSummary: probe?.inputSummary,
  });
}
