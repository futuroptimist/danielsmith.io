import { expect, test } from '@playwright/test';

import {
  isPdfResponse,
  runVisitorJourney,
} from '../src/observability/visitorJourney';

test('essential visitor journey is usable independently of immersive rendering', async ({
  page,
  request,
}) => {
  let homepageDelivered = false;
  let javascriptInitialized = false;
  let essentialAssetsAvailable = false;
  let accessibleFallbackAvailable = false;
  let resumeIsPdf = false;

  const homepage = await request.get('/');
  homepageDelivered =
    homepage.ok() &&
    (await homepage.text()).includes('<title>danielsmith.io</title>');

  const fallbackResponse = await page.goto('/?mode=text', {
    waitUntil: 'domcontentloaded',
  });
  javascriptInitialized =
    fallbackResponse?.ok() === true &&
    (await page.locator('html').getAttribute('data-app-loading')) === null;
  accessibleFallbackAvailable =
    (await page.locator('#app[data-mode="text"] .text-fallback').isVisible()) &&
    (await page.locator('[data-action="resume"]').getAttribute('href')) ===
      '/resume.pdf';

  const favicon = await request.get('/favicon.ico');
  essentialAssetsAvailable =
    favicon.ok() && (await favicon.body()).byteLength > 0;

  const resume = await request.get('/resume.pdf');
  resumeIsPdf =
    resume.ok() &&
    isPdfResponse(resume.headers()['content-type'], await resume.body());

  const result = await runVisitorJourney({
    homepage: async () => ({ ok: homepageDelivered }),
    javascriptInitialization: async () => ({ ok: javascriptInitialized }),
    essentialAssets: async () => ({ ok: essentialAssetsAvailable }),
    accessibleFallback: async () => ({ ok: accessibleFallbackAvailable }),
    resumePdf: async () => ({ ok: resumeIsPdf }),
    optionalImmersive: async () => ({ ok: false }),
  });

  expect(result).toMatchObject({ status: 'success', failureStage: null });
});
