export const I18N_DEBUG_STORAGE_KEY = 'danielsmith.io::i18nDebug::v1';

export interface I18nDebugOptions {
  dev?: boolean;
  search?: string;
  storage?: Pick<Storage, 'getItem'> | null;
}

export function isI18nDebugEnabled({
  dev = false,
  search = '',
  storage = null,
}: I18nDebugOptions = {}): boolean {
  if (dev) {
    return true;
  }

  const params = new URLSearchParams(
    search.startsWith('?') ? search : `?${search}`
  );
  if (params.get('i18nDebug') === '1') {
    return true;
  }

  try {
    const stored = storage?.getItem(I18N_DEBUG_STORAGE_KEY);
    return stored === '1';
  } catch {
    return false;
  }
}
