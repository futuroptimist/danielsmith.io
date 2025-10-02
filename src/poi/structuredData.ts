import type { PoiDefinition } from './types';

const DEFAULT_SITE_NAME = 'Daniel Smith Immersive Portfolio';
const DEFAULT_CANONICAL_URL = 'https://danielsmith.io/';
const SCRIPT_ELEMENT_ID = 'danielsmith-portfolio-pois-structured-data';

export interface PoiStructuredDataOptions {
  canonicalUrl?: string;
  siteName?: string;
}

export interface InjectPoiStructuredDataOptions extends PoiStructuredDataOptions {
  documentTarget?: Document;
}

interface ListItem {
  '@type': 'ListItem';
  position: number;
  url: string;
  item: Record<string, unknown>;
}

const ensureTrailingSlash = (value: string): string => {
  if (value.endsWith('/')) {
    return value;
  }
  return `${value}/`;
};

const normalizeCanonicalUrl = (
  canonicalUrl: string | undefined,
  fallback: string
): string => {
  const base = fallback || DEFAULT_CANONICAL_URL;
  if (!canonicalUrl) {
    return ensureTrailingSlash(base.replace(/[#?].*$/, ''));
  }
  try {
    const parsed = new URL(canonicalUrl, base);
    parsed.hash = '';
    parsed.search = '';
    return ensureTrailingSlash(parsed.toString());
  } catch (error) {
    console.warn('Invalid canonical URL provided for structured data.', error);
    return ensureTrailingSlash(base.replace(/[#?].*$/, ''));
  }
};

const createPoiUrl = (canonical: string, poiId: string): string => {
  return `${canonical}#poi-${poiId}`;
};

export const buildPoiStructuredData = (
  pois: readonly PoiDefinition[],
  options: PoiStructuredDataOptions = {}
): Record<string, unknown> => {
  const canonical = normalizeCanonicalUrl(
    options.canonicalUrl,
    DEFAULT_CANONICAL_URL
  );
  const siteName = options.siteName ?? DEFAULT_SITE_NAME;

  const itemListElement: ListItem[] = pois.map((poi, index) => {
    const poiUrl = createPoiUrl(canonical, poi.id);
    const additionalProperty = [
      {
        '@type': 'PropertyValue',
        name: 'Category',
        value: poi.category,
      },
    ];

    if (poi.metrics && poi.metrics.length > 0) {
      poi.metrics.forEach((metric) => {
        additionalProperty.push({
          '@type': 'PropertyValue',
          name: metric.label,
          value: metric.value,
        });
      });
    }

    if (poi.status) {
      additionalProperty.push({
        '@type': 'PropertyValue',
        name: 'Status',
        value: poi.status,
      });
    }

    const sameAs = poi.links?.map((link) => link.href).filter(Boolean) ?? [];

    const item: Record<string, unknown> = {
      '@type': 'CreativeWork',
      '@id': poiUrl,
      url: poiUrl,
      name: poi.title,
      description: poi.summary,
      identifier: poi.id,
      keywords: [poi.category, poi.roomId],
      additionalProperty,
    };

    if (sameAs.length > 0) {
      item.sameAs = sameAs;
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: poiUrl,
      item,
    } satisfies ListItem;
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${siteName} Exhibits`,
    description:
      'Interactive exhibits within the Daniel Smith immersive portfolio experience.',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement,
  };
};

export const injectPoiStructuredData = (
  pois: readonly PoiDefinition[],
  options: InjectPoiStructuredDataOptions = {}
): HTMLScriptElement => {
  const documentTarget = options.documentTarget ?? document;
  const head = documentTarget.head ?? documentTarget.querySelector('head');
  if (!head) {
    throw new Error('Document must include a <head> element for structured data injection.');
  }

  const canonicalFallback =
    options.canonicalUrl ??
    documentTarget.defaultView?.location?.href ??
    documentTarget.baseURI ??
    DEFAULT_CANONICAL_URL;
  const canonical = normalizeCanonicalUrl(options.canonicalUrl, canonicalFallback);
  const structuredData = buildPoiStructuredData(pois, {
    canonicalUrl: canonical,
    siteName: options.siteName,
  });

  const existing = documentTarget.getElementById(SCRIPT_ELEMENT_ID);
  if (existing?.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const script = documentTarget.createElement('script');
  script.type = 'application/ld+json';
  script.id = SCRIPT_ELEMENT_ID;
  script.textContent = JSON.stringify(structuredData, null, 2);

  head.appendChild(script);
  return script;
};

export const _testables = {
  ensureTrailingSlash,
  normalizeCanonicalUrl,
  createPoiUrl,
  SCRIPT_ELEMENT_ID,
};
