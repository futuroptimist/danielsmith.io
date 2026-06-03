// eslint-disable-next-line import/no-named-as-default-member
import axe from 'axe-core';
import type { AxeResults, RunOptions } from 'axe-core';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { type FallbackReason, renderTextFallback } from '../systems/failover';

const FALLBACK_REASONS: FallbackReason[] = [
  'manual',
  'webgl-unsupported',
  'low-memory',
  'low-performance',
  'immersive-init-error',
  'automated-client',
  'low-end-device',
  'console-error',
  'data-saver',
];

const RUN_ONLY_TAGS = ['wcag2a', 'wcag2aa'] as const;

async function runAxe(
  target: HTMLElement,
  options: Partial<RunOptions> = {}
): Promise<AxeResults> {
  const runOptions: RunOptions = {
    runOnly: {
      type: 'tag',
      values: [...RUN_ONLY_TAGS],
    },
    reporter: 'v2',
    ...options,
  };
  // eslint-disable-next-line import/no-named-as-default-member
  return axe.run(target, runOptions);
}

describe('text fallback accessibility', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeAll(() => {
    const mockContext = {
      measureText: vi.fn(() => ({ width: 0 })),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
    } as unknown as CanvasRenderingContext2D;

    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(mockContext);
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.lang = 'en';
  });

  afterAll(() => {
    getContextSpy?.mockRestore();
  });

  for (const reason of FALLBACK_REASONS) {
    it(`renders without WCAG violations for reason="${reason}"`, async () => {
      const container = document.createElement('div');

      renderTextFallback(container, {
        reason,
        immersiveUrl:
          'https://danielsmith.io/?mode=immersive&disablePerformanceFailover=1',
        resumeUrl: 'https://danielsmith.io/resume.pdf',
        githubUrl: 'https://github.com/futuroptimist',
      });

      document.body.appendChild(container);

      const results = await runAxe(container);
      if (results.violations.length > 0) {
        const formatted = results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            failureSummary: node.failureSummary,
          })),
        }));
        expect.fail(
          `Accessibility violations for reason="${reason}":\n${JSON.stringify(
            formatted,
            null,
            2
          )}`
        );
      }

      expect(results.passes.length).toBeGreaterThan(0);
    });
  }

  it('normalizes provided immersive URLs without disabling failover for normal recovery', () => {
    const container = document.createElement('div');

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: 'https://danielsmith.io/portfolio',
    });

    const immersiveLink = container.querySelector(
      '[data-action="immersive"]'
    ) as HTMLAnchorElement | null;

    expect(immersiveLink?.href).toBe(
      'https://danielsmith.io/portfolio?mode=immersive'
    );
  });

  it('exposes a force-immersive debug URL for low-performance fallback', () => {
    const container = document.createElement('div');

    renderTextFallback(container, {
      reason: 'low-performance',
      immersiveUrl: 'https://danielsmith.io/portfolio',
    });

    const debugLink = container.querySelector(
      '[data-action="debug-immersive"]'
    ) as HTMLAnchorElement | null;

    expect(debugLink?.href).toBe(
      'https://danielsmith.io/portfolio?mode=immersive&disablePerformanceFailover=1'
    );
  });

  it.each([
    ['es-MX', 'es', '¿Listo para la sala completa?', 'Explora los destacados'],
    ['pt-BR', 'pt', 'Pronto para a sala completa?', 'Explore os destaques'],
    ['de-AT', 'de', 'Bereit für den ganzen Raum?', 'Highlights erkunden'],
    [
      'hu-HU',
      'hu',
      'Készen állsz a teljes szobára?',
      'Fedezd fel a kiemeléseket',
    ],
  ])(
    'renders %s text fallback copy and updates document language',
    (requestedLang, resolvedLang, recoveryTitle, heading) => {
      const container = document.createElement('div');
      document.documentElement.lang = requestedLang;

      renderTextFallback(container, {
        reason: 'manual',
        immersiveUrl: 'https://danielsmith.io/immersive',
      });

      expect(document.documentElement.lang).toBe(resolvedLang);
      expect(
        container.querySelector('.text-fallback__recovery-title')?.textContent
      ).toBe(recoveryTitle);
      expect(container.textContent).toContain(heading);
    }
  );

  it('renders Mandarin text fallback copy and updates document language', () => {
    const container = document.createElement('div');
    document.documentElement.lang = 'zh-CN';

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: 'https://danielsmith.io/immersive',
    });

    expect(document.documentElement.lang).toBe('zh-Hans');
    expect(
      container.querySelector('.text-fallback__recovery-title')?.textContent
    ).toBe('准备进入完整房间了吗？');
    expect(container.textContent).toContain('以文本浏览亮点');
  });

  it('marks the document with the active fallback mode and reason', () => {
    const container = document.createElement('div');

    renderTextFallback(container, {
      reason: 'low-performance',
      immersiveUrl: 'https://danielsmith.io/immersive',
    });

    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'low-performance'
    );
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('focuses the fallback content and marks it as the main landmark', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    renderTextFallback(container, {
      reason: 'manual',
      immersiveUrl: 'https://danielsmith.io/immersive',
    });

    const section = container.querySelector(
      '.text-fallback'
    ) as HTMLElement | null;
    expect(section?.getAttribute('role')).toBe('main');
    expect(section?.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(section);
  });
});
