import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PoiTooltipOverlay } from '../poi/tooltipOverlay';
import type { PoiDefinition } from '../poi/types';

describe('PoiTooltipOverlay', () => {
  let container: HTMLElement;
  let overlay: PoiTooltipOverlay;

  const basePoi: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist TV Wall',
    summary: 'Living room media wall with immersive tooling.',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2.4,
    footprint: { width: 3, depth: 2 },
    metrics: [{ label: 'Stack', value: 'Three.js · Vite · TypeScript' }],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist' },
      { label: 'Docs', href: 'https://futuroptimist.dev' },
    ],
    status: 'prototype',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    overlay = new PoiTooltipOverlay({ container });
  });

  afterEach(() => {
    overlay.dispose();
    container.remove();
  });

  it('renders hovered POI metadata and exposes links', () => {
    overlay.setHovered(basePoi);

    const root = container.querySelector(
      '.poi-tooltip-overlay'
    ) as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(root.dataset.state).toBe('hovered');

    const title = root.querySelector('.poi-tooltip-overlay__title');
    expect(title?.textContent).toBe(basePoi.title);

    const summary = root.querySelector('.poi-tooltip-overlay__summary');
    expect(summary?.textContent).toContain('immersive');

    const metrics = Array.from(
      root.querySelectorAll('.poi-tooltip-overlay__metric')
    );
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.textContent).toContain('Stack');

    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('.poi-tooltip-overlay__link')
    );
    expect(links).toHaveLength(2);
    expect(links[0]?.href).toBe(basePoi.links?.[0]?.href ?? '');
  });

  it('prefers hovered metadata over selected and hides when cleared', () => {
    const selectedPoi: PoiDefinition = {
      ...basePoi,
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Kinetic Hub',
      position: { x: 2, y: 0, z: 4 },
      metrics: [{ label: 'Automation', value: 'CI-ready prompts' }],
      links: [{ label: 'Flywheel', href: 'https://flywheel.futuroptimist.dev' }],
      status: undefined,
    };

    overlay.setSelected(selectedPoi);
    overlay.setHovered({ ...basePoi, title: 'Temporary Hover' });

    const root = container.querySelector(
      '.poi-tooltip-overlay'
    ) as HTMLElement;
    expect(root.dataset.state).toBe('hovered');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      'Temporary Hover'
    );

    overlay.setHovered(null);
    expect(root.dataset.state).toBe('selected');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      selectedPoi.title
    );

    overlay.setSelected(null);
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });
});
