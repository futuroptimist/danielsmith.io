import { expect, type Page } from '@playwright/test';

import { AVATAR_RUN_SPEED } from '../../src/systems/movement/avatarGait';

/** Select the real maximum gait without changing focus or bypassing controls. */
export async function selectNativeRunGait(page: Page) {
  if (
    await page.evaluate(() => window.portfolio?.avatar?.getGait?.() === 'walk')
  )
    await page.keyboard.press('CapsLock');
  await expect
    .poll(() => page.evaluate(() => window.portfolio?.avatar?.getGait?.()))
    .toBe('run');
}

/** Preserve the intended world distance when the authored locomotion speed changes. */
export const runHoldForDistance = (distance: number) =>
  Math.ceil((distance / AVATAR_RUN_SPEED) * 1000);

type MovementCode = 'KeyW' | 'KeyA' | 'KeyS' | 'KeyD';

/** Native Chromium input, queued without a tracing snapshot between chord members. */
export async function pressNativeMovementChord(
  page: Page,
  codes: readonly MovementCode[],
  holdMs: number
) {
  const session = await page.context().newCDPSession(page);
  const keys = codes.map((code) => ({
    code,
    key: code.slice(3).toLowerCase(),
    windowsVirtualKeyCode: code.charCodeAt(3),
    modifiers: 0,
    location: 0,
  }));
  try {
    // Playwright's press serializes protocol replies; separate keyboard.down
    // calls also capture per-key trace snapshots. Both can introduce steering.
    await Promise.all(
      keys.map((key) =>
        session.send('Input.dispatchKeyEvent', {
          ...key,
          type: 'keyDown',
          text: key.key,
          unmodifiedText: key.key,
          autoRepeat: false,
          isKeypad: false,
        })
      )
    );
    await new Promise((resolve) => setTimeout(resolve, holdMs));
  } finally {
    try {
      await Promise.all(
        keys.map((key) =>
          session.send('Input.dispatchKeyEvent', { ...key, type: 'keyUp' })
        )
      );
    } finally {
      await session.detach();
    }
  }
}
