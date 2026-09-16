import type { Page } from '@playwright/test';

import {
  createPerformanceResult,
  type CreatePerformanceResultInput,
  type PerformanceResultV1,
} from '../../src/app/performanceResult';
import type { InputLatencySummary } from '../../src/systems/performance/inputLatencyMonitor';

interface BrowserMeasurementProbe {
  applicationReadyMs?: number;
  inputSummary?: InputLatencySummary;
}

declare global {
  interface Window {
    __controlledPerformanceProbe?: BrowserMeasurementProbe;
  }
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
