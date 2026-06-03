export const I18N_DEBUG_STORAGE_KEY = 'danielsmith.io::i18nDebug::v1';
const LEGACY_I18N_DEBUG_STORAGE_KEY = 'danielsmith.io:i18nDebug';

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
    if (stored === '1') {
      return true;
    }

    // Keep the pre-v1 flag as a dev convenience, but only the v1 flag is
    // documented for production/staging diagnostics.
    return storage?.getItem(LEGACY_I18N_DEBUG_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
