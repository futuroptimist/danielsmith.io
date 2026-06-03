import { describe, expect, it, vi } from 'vitest';

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
  reason: 'test fixture',
};

describe('createSoftwareRendererWarning', () => {
  it('renders localized copy and refreshes visible warning breadcrumbs', () => {
    const onVisible = vi.fn();
    const handle = createSoftwareRendererWarning({
      rendererInfo,
      safeUrl: '/?safe=1',
      continuousUrl: '/?continuous=1',
      textUrl: '/?mode=text',
      strings: getSoftwareRendererWarningStrings('en'),
      onVisible,
    });

    const title = handle.element.querySelector(
      '.software-renderer-warning__title'
    );
    const description = handle.element.querySelector(
      '.software-renderer-warning__description'
    );
    const recommendation = handle.element.querySelector(
      '.software-renderer-warning__recommendation'
    );
    const safeButton = handle.element.querySelector(
      '[data-action="continue-safe-immersive"]'
    );
    const continuousLink = handle.element.querySelector<HTMLAnchorElement>(
      '[data-action="continuous-immersive"]'
    );
    const textLink = handle.element.querySelector<HTMLAnchorElement>(
      '[data-action="text-mode"]'
    );
    const safeLink = handle.element.querySelector<HTMLAnchorElement>(
      '.software-renderer-warning__safe-link'
    );

    expect(title?.textContent).toBe('Software rendering detected');
    expect(description?.textContent).toContain('SwiftShader Device');
    expect(recommendation?.textContent).toContain('Safe immersive mode');
    expect(safeButton?.textContent).toBe('Continue in safe immersive');
    expect(continuousLink?.textContent).toBe(
      'Enable continuous immersive anyway'
    );
    expect(continuousLink?.getAttribute('href')).toBe('/?continuous=1');
    expect(textLink?.textContent).toBe('Use text mode');
    expect(textLink?.getAttribute('href')).toBe('/?mode=text');
    expect(safeLink?.textContent).toBe('Reload this safe immersive URL');
    expect(safeLink?.getAttribute('href')).toBe('/?safe=1');
    expect(onVisible).toHaveBeenCalledWith(description?.textContent);

    handle.setStrings(getSoftwareRendererWarningStrings('zh-Hans'));

    expect(title?.textContent).toBe('检测到软件渲染');
    expect(description?.textContent).toContain('SwiftShader Device');
    expect(recommendation?.textContent).toContain('安全沉浸模式');
    expect(safeButton?.textContent).toBe('继续安全沉浸模式');
    expect(continuousLink?.textContent).toBe('仍然启用连续沉浸模式');
    expect(textLink?.textContent).toBe('使用文本模式');
    expect(safeLink?.textContent).toBe('重新加载此安全沉浸 URL');
    expect(onVisible).toHaveBeenLastCalledWith(description?.textContent);
    expect(onVisible).toHaveBeenCalledTimes(2);

    handle.dispose();
  });
});
