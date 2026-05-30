import { describe, expect, it } from 'vitest';

import { resolveSoftwareRendererMode } from '../scene/performance/softwareRendererMode';

describe('software renderer mode URL policy', () => {
  it('defaults dangerous renderers to safe capped cadence', () => {
    expect(resolveSoftwareRendererMode('', true)).toMatchObject({
      mode: 'safe',
      safeMode: true,
      renderCadenceFps: 15,
    });
  });

  it('allows continuous rendering only with an explicit override', () => {
    expect(
      resolveSoftwareRendererMode('?softwareRendererMode=continuous', true)
    ).toMatchObject({
      mode: 'continuous',
      safeMode: false,
      renderCadenceFps: null,
    });
    expect(
      resolveSoftwareRendererMode('?forceContinuousRendering=1', true)
    ).toMatchObject({ safeMode: false, renderCadenceFps: null });
  });

  it('does not cap normal hardware renderers', () => {
    expect(resolveSoftwareRendererMode('', false)).toMatchObject({
      mode: 'continuous',
      safeMode: false,
      renderCadenceFps: null,
    });
  });
});
