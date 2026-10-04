import { afterEach, describe, expect, it, vi } from 'vitest';

import { CAREER_HISTORY } from '../../../assets/careers';
import {
  AVAILABLE_LOCALES,
  getCareerCopy,
  getPoiOverlayChromeStrings,
  getSiteStrings,
} from '../../../assets/i18n';
import { renderTextFallback } from '../../../systems/failover';
import type { GitHubRepoStatsService } from '../../../systems/github/repoStats';
import { wireGitHubRepoMetrics } from '../githubMetrics';
import { getPoiDefinitions } from '../registry';
import * as poiRegistry from '../registry';
import {
  buildPoiStructuredData,
  buildTextPortfolioStructuredData,
} from '../structuredData';
import { PoiTooltipOverlay } from '../tooltipOverlay';
import { isProjectPoi, type PoiDefinition } from '../types';

import { getTestCareerPois } from './helpers/careerFixtures';

const DISCLAIMER =
  'This is my personal portfolio. The views and content here are my own and do not represent Muon Space.';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = 'en';
  vi.restoreAllMocks();
});

describe('reviewed career content', () => {
  it('retains exactly the reviewed dates and titles without inventing a completed Muon outcome', () => {
    expect(
      CAREER_HISTORY.map(({ id, startDate, endDate }) => ({
        id,
        startDate,
        endDate,
      }))
    ).toEqual([
      { id: 'muon-space', startDate: '2026-09', endDate: null },
      { id: 'youtube', startDate: '2018-09', endDate: '2025-05' },
      { id: 'naval-research', startDate: '2017-01', endDate: '2018-09' },
      { id: 'southern-mississippi', startDate: '2014-03', endDate: '2016-12' },
    ]);
    const byId = new Map(
      getTestCareerPois().map((poi) => [poi.career.id, poi])
    );
    expect(byId.get('muon-space')?.career).toMatchObject({
      role: 'Senior Software Engineer',
      team: 'Mission Planning Platform team',
      responsibility:
        'Contributing to cloud-based mission planning and control software on the Mission Planning Platform team.',
      disclaimer: DISCLAIMER,
    });
    expect(byId.get('naval-research')?.career.role).toBe('Computer Scientist');
    expect(byId.get('youtube')?.career.role).toBe('Site Reliability Engineer');
    expect(byId.get('southern-mississippi')?.career.organization).toBe(
      'The University of Southern Mississippi'
    );
    expect(byId.get('muon-space')?.career.provenance).toEqual([
      { kind: 'owner-confirmed' },
      {
        kind: 'public-role-posting',
        href: 'https://job-boards.greenhouse.io/muonspace/jobs/5083758007',
      },
    ]);
  });

  for (const locale of AVAILABLE_LOCALES) {
    it(`uses one complete ${locale} source for timeline and career details`, () => {
      const pois = getTestCareerPois(locale);
      const timeline = getSiteStrings(locale).textFallback.timeline.entries;
      expect(pois).toHaveLength(4);
      expect(timeline).toHaveLength(4);
      for (const poi of pois) {
        expect(poi.category).toBe('career');
        expect(poi.metrics).toBeUndefined();
        expect(poi.outcome).toBeUndefined();
        expect(poi.status).toBeUndefined();
        expect(poi.environments).toBeUndefined();
        expect(poi.career.provenance.length).toBeGreaterThan(0);
        expect(poi.links).toEqual([]);
        if (poi.career.id === 'southern-mississippi') {
          const name = 'The University of Southern Mississippi';
          expect(poi.title).toBe(locale === 'en-x-pseudo' ? `⟦${name}⟧` : name);
          expect(poi.career.organization).toBe(poi.title);
        }
        expect(
          timeline.find((entry) => entry.id === poi.career.id)
        ).toMatchObject({
          role: poi.career.role,
          org: poi.career.organization,
          period: poi.career.period,
          summary: poi.career.responsibility,
          team: poi.career.team,
          illustrationNote: poi.career.illustrationNote,
          disclaimer: poi.career.disclaimer,
          links: poi.links,
        });
        if (locale !== 'en') {
          expect(poi.summary).not.toBe(
            getCareerCopy('en')[poi.career.id].summary
          );
          expect(poi.career.illustrationNote).not.toBe(
            getCareerCopy('en')[poi.career.id].illustrationNote
          );
        }
      }
      expect(
        pois.find((poi) => poi.career.id === 'muon-space')?.career.disclaimer
      ).toBeTruthy();
    });

    it(`renders the ${locale} Muon disclaimer as readable DOM on both surfaces`, () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const poi = getTestCareerPois(locale).find(
        (entry) => entry.career.id === 'muon-space'
      )!;
      const overlay = new PoiTooltipOverlay({ container, locale });
      overlay.setStrings(getPoiOverlayChromeStrings(locale), locale);
      overlay.setSelected(poi, { inputMethod: 'keyboard' });
      const disclaimer = container.querySelector('[data-career-disclaimer]')!;
      expect(disclaimer.textContent).toBe(poi.career.disclaimer);
      expect(disclaimer.closest('[hidden]')).toBeNull();
      const root = container.querySelector<HTMLElement>(
        '.poi-tooltip-overlay'
      )!;
      expect(root.getAttribute('aria-describedby')).toContain(
        container.querySelector('.poi-tooltip-overlay__career')!.id
      );
      expect(
        root.querySelector<HTMLElement>('.poi-tooltip-overlay__metrics')!.hidden
      ).toBe(true);
      expect(
        root.querySelector<HTMLElement>('.poi-tooltip-overlay__status')!.hidden
      ).toBe(true);
      expect(
        root.querySelector<HTMLElement>('.poi-tooltip-overlay__environments')!
          .hidden
      ).toBe(true);
      const fallback = document.createElement('div');
      document.body.appendChild(fallback);
      document.documentElement.lang = locale;
      renderTextFallback(fallback, { reason: 'manual' });
      const timelineDisclaimer = fallback.querySelector(
        '[data-career-id="muon-space"] [data-career-disclaimer]'
      )!;
      expect(timelineDisclaimer.textContent).toBe(poi.career.disclaimer);
      expect(timelineDisclaimer.closest('[hidden]')).toBeNull();
      for (const career of getTestCareerPois(locale)) {
        overlay.setSelected(career, { inputMethod: 'keyboard' });
        expect(
          container.querySelectorAll('.poi-tooltip-overlay__links a')
        ).toHaveLength(0);
        expect(
          container.querySelector('.poi-tooltip-overlay__title')?.textContent
        ).toBe(career.title);
        const links = [
          ...fallback.querySelectorAll<HTMLAnchorElement>(
            `[data-career-id="${career.career.id}"] a`
          ),
        ];
        expect(links).toHaveLength(0);
        expect(
          links.map((link) => ({
            href: link.getAttribute('href'),
            label: link.textContent,
          }))
        ).toEqual(career.links);
        for (const link of links) {
          expect(link.closest('[hidden]')).toBeNull();
          expect(link.rel).toContain('noopener');
          expect(link.tabIndex).toBe(0);
          link.focus();
          expect(document.activeElement).toBe(link);
        }
      }
      if (locale === 'en') expect(disclaimer.textContent).toBe(DISCLAIMER);
      overlay.dispose();
    });
  }

  it('retains environment entries in text portfolio while excluding careers', () => {
    const environment = {
      ...getPoiDefinitions().find(isProjectPoi)!,
      category: 'environment' as const,
    };
    vi.spyOn(poiRegistry, 'getPoiDefinitions').mockReturnValue([
      environment,
      ...getTestCareerPois(),
    ]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    renderTextFallback(container, { reason: 'manual' });
    expect(
      container.querySelector(`[data-poi-id="${environment.id}"]`)
    ).not.toBeNull();
    expect(container.querySelector('[data-poi-id^="career-"]')).toBeNull();
  });

  it('keeps both project structured-data collections free of employer entries', () => {
    const definitions = [...getPoiDefinitions(), ...getTestCareerPois()];
    for (const result of [
      buildPoiStructuredData(definitions),
      buildTextPortfolioStructuredData(definitions),
    ]) {
      const json = JSON.stringify(result);
      expect(json).not.toContain('career-muon-space');
      expect(json).not.toContain('career-youtube');
      expect(json).toContain('tokenplace-studio-cluster');
    }
  });

  it('does not request or subscribe to career repository metrics even with malformed input', async () => {
    const malformed = {
      ...getTestCareerPois()[0],
      metrics: [
        {
          label: 'Stars',
          value: 'No data',
          source: {
            type: 'githubStars',
            owner: 'invalid-employer',
            repo: 'invalid-repo',
          },
        },
      ],
    } as unknown as PoiDefinition;
    const service = {
      getCachedStats: vi.fn(),
      subscribe: vi.fn(),
      requestStats: vi.fn(),
      loadRuntimeCache: vi.fn(),
      getDiagnostics: vi.fn(() => ({ backoffExpiresAt: null })),
    } as unknown as GitHubRepoStatsService;
    const controller = wireGitHubRepoMetrics({
      definitions: [malformed],
      service,
    });
    await controller.refreshAll();
    expect(service.subscribe).not.toHaveBeenCalled();
    expect(service.requestStats).not.toHaveBeenCalled();
    expect(service.getCachedStats).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('clears career content and disclaimer when a project replaces the selected career', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const overlay = new PoiTooltipOverlay({ container });
    overlay.setSelected(getTestCareerPois()[0]);
    expect(container.querySelector('[data-career-disclaimer]')).not.toBeNull();
    overlay.setSelected(getPoiDefinitions()[0]);
    expect(
      container.querySelector<HTMLElement>('.poi-tooltip-overlay__career')!
        .hidden
    ).toBe(true);
    expect(container.querySelector('[data-career-disclaimer]')).toBeNull();
    overlay.dispose();
  });
});
