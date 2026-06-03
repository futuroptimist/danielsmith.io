import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSoftwareRendererWarningStrings } from '../assets/i18n';
import type { RendererInfoSnapshot } from '../scene/performance/rendererCapabilities';
import { createSoftwareRendererWarning } from '../ui/softwareRendererWarning';

const rendererInfo: RendererInfoSnapshot = {
  vendor: 'Google Inc.',
  renderer: 'ANGLE',
  unmaskedVendor: 'Google Inc.',
  unmaskedRenderer: 'SwiftShader Device',
  isSoftwareRenderer: true,
  isDangerousSoftwareRenderer: true,
  riskLevel: 'dangerous-software',
  reason: 'test renderer',
};

describe('createSoftwareRendererWarning', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders localized warning copy and actions on creation', () => {
    const onVisible = vi.fn();
    const strings = getSoftwareRendererWarningStrings('zh-Hans');

    const handle = createSoftwareRendererWarning({
      rendererInfo,
      safeUrl: '/safe',
      continuousUrl: '/continuous',
      textUrl: '/text',
      strings,
      onVisible,
    });

    expect(handle.element).toBeInstanceOf(HTMLElement);
    expect(handle.element.querySelector('h2')?.textContent).toBe(strings.title);
    expect(
      handle.element.querySelector('.software-renderer-warning__description')
        ?.textContent
    ).toContain('SwiftShader Device');
    expect(
      handle.element.querySelector('.software-renderer-warning__recommendation')
        ?.textContent
    ).toBe(strings.recommendation);
    expect(
      handle.element.querySelector<HTMLAnchorElement>(
        '[data-action="continuous-immersive"]'
      )?.href
    ).toContain('/continuous');
    expect(
      handle.element.querySelector<HTMLAnchorElement>(
        '[data-action="text-mode"]'
      )?.href
    ).toContain('/text');
    expect(onVisible).toHaveBeenCalledWith(
      expect.stringContaining('SwiftShader Device')
    );

    handle.dispose();
    expect(document.body.contains(handle.element)).toBe(false);
  });

  it('refreshes visible copy and records the localized message when strings change', () => {
    const onVisible = vi.fn();
    const handle = createSoftwareRendererWarning({
      rendererInfo,
      safeUrl: '/safe',
      continuousUrl: '/continuous',
      textUrl: '/text',
      onVisible,
    });
    const strings = getSoftwareRendererWarningStrings('zh-Hans');

    handle.setStrings(strings);

    expect(handle.element.querySelector('h2')?.textContent).toBe(strings.title);
    expect(
      handle.element.querySelector('.software-renderer-warning__recommendation')
        ?.textContent
    ).toBe(strings.recommendation);
    expect(
      handle.element.querySelector('[data-action="continue-safe-immersive"]')
        ?.textContent
    ).toBe(strings.continueSafeLabel);
    expect(
      handle.element.querySelector('[data-action="continuous-immersive"]')
        ?.textContent
    ).toBe(strings.continuousLabel);
    expect(
      handle.element.querySelector('[data-action="text-mode"]')?.textContent
    ).toBe(strings.textModeLabel);
    expect(onVisible).toHaveBeenLastCalledWith(
      expect.stringContaining('SwiftShader Device')
    );
    expect(onVisible).toHaveBeenLastCalledWith(
      expect.stringContaining('Chrome 正在使用')
    );

    handle.dispose();
  });
});
