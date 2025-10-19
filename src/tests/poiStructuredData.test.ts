import { describe, expect, it, vi } from 'vitest';

import {
  _testables,
  buildPoiStructuredData,
  injectPoiStructuredData,
} from '../scene/poi/structuredData';
import type { PoiDefinition } from '../scene/poi/types';

const createPoi = (overrides: Partial<PoiDefinition> = {}): PoiDefinition => ({
  id: 'futuroptimist-living-room-tv',
  title: 'Test Exhibit',
  summary: 'An exhibit used for structured data validation.',
  category: 'project',
  interaction: 'inspect',
  roomId: 'studio',
  position: { x: 0, y: 0, z: 0 },
  headingRadians: 0,
  interactionRadius: 1,
  footprint: { width: 1, depth: 1 },
  metrics: [],
  links: [],
  status: undefined,
  ...overrides,
});

const { SCRIPT_ELEMENT_ID, ITEM_LIST_FRAGMENT } = _testables;

describe('buildPoiStructuredData', () => {
  it('serializes POIs into schema.org ItemList entries', () => {
    const expectedListId =
      'https://portfolio.example/immersive/' + ITEM_LIST_FRAGMENT;
    const poiA = createPoi({
      id: 'tokenplace-studio-cluster',
      title: 'First Exhibit',
      summary: 'Highlights automation systems.',
      metrics: [
        { label: 'Impact', value: 'Reduced toil 42%' },
        { label: 'Stack', value: 'TypeScript · Three.js' },
      ],
      links: [{ label: 'GitHub', href: 'https://example.com/repo' }],
      status: 'prototype',
    });
    const poiB = createPoi({
      id: 'gabriel-studio-sentry',
      title: 'Second Exhibit',
      summary: 'Focuses on storytelling pipelines.',
      roomId: 'livingRoom',
    });

    const data = buildPoiStructuredData([poiA, poiB], {
      canonicalUrl: 'https://portfolio.example/immersive?ref=home#section',
      siteName: 'Immersive Portfolio',
      publisher: {
        name: 'Immersive Portfolio Publishing',
        url: 'https://portfolio.example/about/',
        type: 'Organization',
        logoUrl: 'https://portfolio.example/logo.png',
      },
      author: {
        name: 'Daniel Smith',
        url: 'https://danielsmith.io/',
        type: 'Person',
      },
    });

    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('ItemList');
    expect(data).toMatchObject({
      '@id': expectedListId,
      url: 'https://portfolio.example/immersive/',
      name: 'Immersive Portfolio Exhibits',
      description:
        'Interactive exhibits within the Daniel Smith immersive portfolio experience.',
      inLanguage: 'en',
      isAccessibleForFree: true,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
    });

    expect(data.isPartOf).toEqual({
      '@type': 'WebSite',
      '@id': 'https://portfolio.example/immersive/',
      name: 'Immersive Portfolio',
      url: 'https://portfolio.example/immersive/',
      inLanguage: 'en',
    });

    const publisher = data.publisher as Record<string, unknown>;
    expect(publisher).toMatchObject({
      '@type': 'Organization',
      name: 'Immersive Portfolio Publishing',
      url: 'https://portfolio.example/about/',
      '@id': 'https://portfolio.example/about/',
    });
    expect(publisher.logo).toEqual({
      '@type': 'ImageObject',
      url: 'https://portfolio.example/logo.png',
    });
    expect(data.provider).toBe(publisher);

    const author = data.author as Record<string, unknown>;
    expect(author).toMatchObject({
      '@type': 'Person',
      name: 'Daniel Smith',
      url: 'https://danielsmith.io/',
      '@id': 'https://danielsmith.io/',
    });
    expect(data.creator).toBe(author);

    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);

    const first = items[0];
    expect(first).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      url: 'https://portfolio.example/immersive/#poi-tokenplace-studio-cluster',
    });

    const firstItem = first.item as Record<string, unknown>;
    expect(firstItem).toMatchObject({
      '@type': 'CreativeWork',
      '@id':
        'https://portfolio.example/immersive/#poi-tokenplace-studio-cluster',
      url: 'https://portfolio.example/immersive/#poi-tokenplace-studio-cluster',
      name: 'First Exhibit',
      description: 'Highlights automation systems.',
      identifier: 'tokenplace-studio-cluster',
      keywords: ['project', 'studio'],
      sameAs: ['https://example.com/repo'],
      inLanguage: 'en',
      isAccessibleForFree: true,
    });

    const additionalProperty = firstItem.additionalProperty as Array<
      Record<string, unknown>
    >;
    expect(additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Category', value: 'project' },
      { '@type': 'PropertyValue', name: 'Impact', value: 'Reduced toil 42%' },
      {
        '@type': 'PropertyValue',
        name: 'Stack',
        value: 'TypeScript · Three.js',
      },
      { '@type': 'PropertyValue', name: 'Status', value: 'prototype' },
    ]);

    expect(firstItem.isPartOf).toEqual({
      '@type': 'ItemList',
      '@id': expectedListId,
    });
    expect(firstItem.publisher).toEqual({
      '@id': 'https://portfolio.example/about/',
    });
    expect(firstItem.provider).toEqual(firstItem.publisher);
    expect(firstItem.author).toEqual({
      '@id': 'https://danielsmith.io/',
    });
    expect(firstItem.creator).toEqual(firstItem.author);

    const second = items[1];
    expect(second).toMatchObject({
      '@type': 'ListItem',
      position: 2,
      url: 'https://portfolio.example/immersive/#poi-gabriel-studio-sentry',
    });
    const secondItem = second.item as Record<string, unknown>;
    expect(secondItem).not.toHaveProperty('sameAs');
    expect(secondItem).toMatchObject({
      inLanguage: 'en',
      isAccessibleForFree: true,
    });
    expect(secondItem.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Category', value: 'project' },
    ]);
    expect(secondItem.isPartOf).toEqual({
      '@type': 'ItemList',
      '@id': expectedListId,
    });
    expect(secondItem.publisher).toEqual({
      '@id': 'https://portfolio.example/about/',
    });
    expect(secondItem.provider).toEqual(secondItem.publisher);
    expect(secondItem.author).toEqual({
      '@id': 'https://danielsmith.io/',
    });
    expect(secondItem.creator).toEqual(secondItem.author);
  });

  it('honors locale overrides when emitting language metadata', () => {
    const data = buildPoiStructuredData([createPoi()], {
      locale: 'en-x-pseudo',
    });

    expect(data.inLanguage).toBe('en-x-pseudo');
    const items = data.itemListElement as Array<Record<string, unknown>>;
    expect(items[0]?.item).toMatchObject({ inLanguage: 'en-x-pseudo' });
  });
});

describe('injectPoiStructuredData', () => {
  it('injects a single ld+json script and replaces prior instances', () => {
    const documentTarget = document.implementation.createHTMLDocument('Test');
    const pois = [
      createPoi({ id: 'tokenplace-studio-cluster', roomId: 'studio' }),
      createPoi({ id: 'gabriel-studio-sentry', roomId: 'backyard' }),
    ];

    const firstScript = injectPoiStructuredData(pois, {
      documentTarget,
      canonicalUrl: 'https://example.com/portfolio/index.html?utm=1#view',
      siteName: 'Immersive Portfolio',
    });

    expect(firstScript.type).toBe('application/ld+json');
    expect(firstScript.id).toBe(SCRIPT_ELEMENT_ID);
    expect(firstScript.isConnected).toBe(true);

    const parsed = JSON.parse(firstScript.textContent ?? '{}');
    const expectedListId =
      'https://example.com/portfolio/' + ITEM_LIST_FRAGMENT;
    expect(parsed.name).toBe('Immersive Portfolio Exhibits');
    expect(parsed.inLanguage).toBe('en');
    expect(parsed.isAccessibleForFree).toBe(true);
    expect(parsed['@id']).toBe(expectedListId);
    expect(parsed.url).toBe('https://example.com/portfolio/');
    expect(parsed.isPartOf).toEqual({
      '@type': 'WebSite',
      '@id': 'https://example.com/portfolio/',
      name: 'Immersive Portfolio',
      url: 'https://example.com/portfolio/',
      inLanguage: 'en',
    });
    expect(parsed.publisher).toMatchObject({
      '@type': 'Person',
      name: 'Daniel Smith',
      url: 'https://danielsmith.io/',
      '@id': 'https://danielsmith.io/',
    });
    expect(parsed.publisher.logo).toEqual({
      '@type': 'ImageObject',
      url: 'https://danielsmith.io/favicon.ico',
    });
    expect(parsed.provider).toEqual(parsed.publisher);
    expect(parsed.author).toMatchObject({
      '@type': 'Person',
      name: 'Daniel Smith',
      '@id': 'https://danielsmith.io/',
    });
    expect(parsed.creator).toEqual(parsed.author);

    const secondScript = injectPoiStructuredData(pois, {
      documentTarget,
      canonicalUrl: 'https://example.com/portfolio/index.html?utm=2#view',
    });

    expect(secondScript).not.toBe(firstScript);
    expect(firstScript.isConnected).toBe(false);
    expect(
      documentTarget.head.querySelectorAll(`script#${SCRIPT_ELEMENT_ID}`).length
    ).toBe(1);
  });

  it('throws when the document lacks a head element', () => {
    const documentTarget =
      document.implementation.createHTMLDocument('MissingHead');
    documentTarget.documentElement.removeChild(documentTarget.head);

    expect(() =>
      injectPoiStructuredData([createPoi()], { documentTarget })
    ).toThrowError(
      'Document must include a <head> element for structured data injection.'
    );
  });

  it('falls back gracefully when canonical URL parsing fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const documentTarget =
      document.implementation.createHTMLDocument('Fallback');
    const script = injectPoiStructuredData([createPoi()], {
      documentTarget,
      canonicalUrl: 'https://example.com/immersive',
    });

    expect(() =>
      injectPoiStructuredData([createPoi()], {
        documentTarget,
        canonicalUrl: '::not-a-valid-url::',
      })
    ).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      'Invalid canonical URL provided for structured data.',
      expect.any(Error)
    );

    const parsed = JSON.parse(script.textContent ?? '{}');
    expect(parsed.itemListElement[0].url).toBe(
      'https://example.com/immersive/#poi-futuroptimist-living-room-tv'
    );

    warnSpy.mockRestore();
  });
});

describe('structured data utilities', () => {
  it('normalizes canonical URLs and appends missing trailing slashes', () => {
    expect(_testables.ensureTrailingSlash('https://example.com/app')).toBe(
      'https://example.com/app/'
    );
    expect(_testables.ensureTrailingSlash('https://example.com/app/')).toBe(
      'https://example.com/app/'
    );

    expect(
      _testables.normalizeCanonicalUrl(
        undefined,
        'https://example.com/base?q=1#hash'
      )
    ).toBe('https://example.com/base/');

    expect(
      _testables.normalizeCanonicalUrl(
        'https://example.com/folio?x=1#section',
        ''
      )
    ).toBe('https://example.com/folio/');

    expect(
      _testables.normalizeCanonicalUrl(
        'https://example.com/folio/index.html?x=1#section',
        ''
      )
    ).toBe('https://example.com/folio/');

    expect(
      _testables.normalizeCanonicalUrl(
        undefined,
        'https://example.com/portfolio/index.html?utm=1#view'
      )
    ).toBe('https://example.com/portfolio/');
  });

  it('builds POI detail anchors from canonical URLs', () => {
    expect(_testables.createPoiUrl('https://example.com/app/', 'demo')).toBe(
      'https://example.com/app/#poi-demo'
    );
  });
});
