import { expect, test } from '@playwright/test';

const AVATAR = '/assets/avatar/daniel-animated-avatar.glb';

test('staged preview serves its identity and renders the avatar from a deep link', async ({
  baseURL,
  context,
  page,
  request,
}) => {
  const sourceSha = process.env.MAIN_PREVIEW_SHA;
  expect(sourceSha).toMatch(/^[a-f0-9]{40}$/);
  const identity = await request.get('/runtime/main-preview.json', {
    maxRedirects: 0,
  });
  expect(identity.ok()).toBeTruthy();
  expect(await identity.json()).toEqual({ schemaVersion: 1, sourceSha });

  // The test only exercises this artifact. Never contact live metrics or any upstream.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL
      ? route.continue()
      : route.abort()
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const avatar = page.waitForResponse(
    (response) => response.url() === new URL(AVATAR, baseURL).href
  );
  const deepLink = await page.goto(
    '/studio?mode=immersive&disablePerformanceFailover=1'
  );
  expect(deepLink?.ok()).toBeTruthy();
  expect(new URL(page.url()).pathname).toBe('/studio');
  const model = await avatar;
  expect(model.ok()).toBeTruthy();
  expect((await model.body()).subarray(0, 4).toString('ascii')).toBe('glTF');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.waitForFunction(
    () => {
      // Loading the model starts its reveal; the real avatar is still transparent then.
      const state = window.portfolio?.avatar?.getAnimationState?.() as
        | { loaded?: boolean; presentation?: string }
        | undefined;
      return state?.loaded === true && state.presentation === 'ready';
    },
    undefined,
    { timeout: 45_000 }
  );
});
