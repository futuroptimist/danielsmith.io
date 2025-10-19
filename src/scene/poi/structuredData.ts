import type {
  LocaleInput,
  SiteStructuredDataEntityStrings,
  StructuredDataEntityType,
} from '../../assets/i18n';
import {
  formatMessage,
  getSiteStrings,
  resolveLocale,
} from '../../assets/i18n';

import type { PoiDefinition } from './types';

const DEFAULT_CANONICAL_URL = 'https://danielsmith.io/';
const SCRIPT_ELEMENT_ID = 'danielsmith-portfolio-pois-structured-data';
const ITEM_LIST_FRAGMENT = '#immersive-poi-list';

const stripFragmentAndQuery = (value: string): string => {
  return value.replace(/[#?].*$/, '');
};

const stripIndexDocument = (value: string): string => {
  return value.replace(/index\.html?\/?$/i, '');
};

export interface StructuredDataEntityOverride
  extends Partial<SiteStructuredDataEntityStrings> {}

export interface PoiStructuredDataOptions {
  canonicalUrl?: string;
  siteName?: string;
  locale?: LocaleInput;
  publisher?: StructuredDataEntityOverride;
  author?: StructuredDataEntityOverride;
}

export interface InjectPoiStructuredDataOptions
  extends PoiStructuredDataOptions {
  documentTarget?: Document;
}

interface ListItem {
  '@type': 'ListItem';
  position: number;
  url: string;
  item: Record<string, unknown>;
}

interface PropertyValue {
  '@type': 'PropertyValue';
  name: string;
  value: string;
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
  const sanitize = (value: string): string => {
    return ensureTrailingSlash(stripIndexDocument(value));
  };
  if (!canonicalUrl) {
    return sanitize(stripFragmentAndQuery(base));
  }
  try {
    const parsed = new URL(canonicalUrl, base);
    parsed.hash = '';
    parsed.search = '';
    return sanitize(parsed.toString());
  } catch (error) {
    console.warn('Invalid canonical URL provided for structured data.', error);
    return sanitize(stripFragmentAndQuery(base));
  }
};

const createPoiUrl = (canonical: string, poiId: string): string => {
  return `${canonical}#poi-${poiId}`;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const normalizeEntityType = (
  type: StructuredDataEntityType | string | undefined
): StructuredDataEntityType => {
  return type === 'Organization' ? 'Organization' : 'Person';
};

const sanitizeOptionalString = (
  value: string | undefined
): string | undefined => {
  if (!isNonEmptyString(value)) {
    return undefined;
  }
  return value.trim();
};

const mergeEntityDefinition = (
  base: SiteStructuredDataEntityStrings | undefined,
  override?: StructuredDataEntityOverride
): SiteStructuredDataEntityStrings | null => {
  const name =
    sanitizeOptionalString(override?.name) ??
    sanitizeOptionalString(base?.name);
  if (!name) {
    return null;
  }

  const url =
    sanitizeOptionalString(override?.url) ?? sanitizeOptionalString(base?.url);
  const logoUrl =
    sanitizeOptionalString(override?.logoUrl) ??
    sanitizeOptionalString(base?.logoUrl);
  const type = normalizeEntityType(override?.type ?? base?.type);

  return { name, url, logoUrl, type };
};

type EntitySchema = {
  '@type': StructuredDataEntityType;
  name: string;
  url?: string;
  '@id'?: string;
  logo?: { '@type': 'ImageObject'; url: string };
};

const createEntitySchema = (
  definition: SiteStructuredDataEntityStrings
): EntitySchema => {
  const entity: EntitySchema = {
    '@type': normalizeEntityType(definition.type),
    name: definition.name,
  };
  if (definition.url) {
    entity.url = definition.url;
    entity['@id'] = definition.url;
  }
  if (definition.logoUrl) {
    entity.logo = {
      '@type': 'ImageObject',
      url: definition.logoUrl,
    };
  }
  return entity;
};

const createEntityReference = (
  entity: EntitySchema | null
): Record<string, string> | undefined => {
  if (!entity) {
    return undefined;
  }
  const id = entity['@id'];
  if (isNonEmptyString(id)) {
    return { '@id': id };
  }
  if (isNonEmptyString(entity.name)) {
    return {
      '@type': entity['@type'],
      name: entity.name,
    };
  }
  return undefined;
};

export const buildPoiStructuredData = (
  pois: readonly PoiDefinition[],
  options: PoiStructuredDataOptions = {}
): Record<string, unknown> => {
  const locale = resolveLocale(options.locale);
  const siteStrings = getSiteStrings(locale);
  const siteName = options.siteName ?? siteStrings.name;
  const canonical = normalizeCanonicalUrl(
    options.canonicalUrl,
    DEFAULT_CANONICAL_URL
  );
  const listName = formatMessage(siteStrings.structuredData.listNameTemplate, {
    siteName,
  });
  const description = siteStrings.structuredData.description;
  const listId = `${canonical}${ITEM_LIST_FRAGMENT}`;

  const publisherDefinition = mergeEntityDefinition(
    siteStrings.structuredData.publisher,
    options.publisher
  );
  const authorDefinition = mergeEntityDefinition(
    siteStrings.structuredData.author,
    options.author
  );
  const publisherEntity = publisherDefinition
    ? createEntitySchema(publisherDefinition)
    : null;
  const authorEntity = authorDefinition
    ? createEntitySchema(authorDefinition)
    : null;
  const publisherReference = createEntityReference(publisherEntity);
  const authorReference = createEntityReference(authorEntity);

  const siteEntry: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': canonical,
    name: siteName,
    url: canonical,
    inLanguage: locale,
  };

  const itemListElement: ListItem[] = pois.map((poi, index) => {
    const poiUrl = createPoiUrl(canonical, poi.id);
    const additionalProperty: PropertyValue[] = [
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
      inLanguage: locale,
      isAccessibleForFree: true,
      additionalProperty,
    };

    if (sameAs.length > 0) {
      item.sameAs = sameAs;
    }

    if (publisherReference) {
      item.publisher = publisherReference;
      item.provider = publisherReference;
    }
    if (authorReference) {
      item.author = authorReference;
      item.creator = authorReference;
    }
    item.isPartOf = { '@type': 'ItemList', '@id': listId };

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: poiUrl,
      item,
    } satisfies ListItem;
  });

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': listId,
    url: canonical,
    name: listName,
    description,
    inLanguage: locale,
    isAccessibleForFree: true,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    isPartOf: siteEntry,
    itemListElement,
  };
  if (publisherEntity) {
    structuredData.publisher = publisherEntity;
    structuredData.provider = publisherEntity;
  }
  if (authorEntity) {
    structuredData.author = authorEntity;
    structuredData.creator = authorEntity;
  }

  return structuredData;
};

export const injectPoiStructuredData = (
  pois: readonly PoiDefinition[],
  options: InjectPoiStructuredDataOptions = {}
): HTMLScriptElement => {
  const documentTarget = options.documentTarget ?? document;
  const head = documentTarget.head ?? documentTarget.querySelector('head');
  if (!head) {
    throw new Error(
      'Document must include a <head> element for structured data injection.'
    );
  }

  const canonicalFallback =
    options.canonicalUrl ??
    documentTarget.defaultView?.location?.href ??
    documentTarget.baseURI ??
    DEFAULT_CANONICAL_URL;
  const canonical = normalizeCanonicalUrl(
    options.canonicalUrl,
    canonicalFallback
  );
  const structuredData = buildPoiStructuredData(pois, {
    canonicalUrl: canonical,
    siteName: options.siteName,
    locale: options.locale,
    publisher: options.publisher,
    author: options.author,
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
  ITEM_LIST_FRAGMENT,
};
