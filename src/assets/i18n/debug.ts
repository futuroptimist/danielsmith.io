const I18N_DEBUG_PARAM = 'i18nDebug';
export const I18N_DEBUG_STORAGE_KEY = 'danielsmith:i18n-debug';

export interface I18nDebugOptions {
  search?: string | URLSearchParams;
  storage?: Pick<Storage, 'getItem'> | null;
  isDev?: boolean;
}

const isTruthyFlag = (value: string | null | undefined) =>
  value === '1' || value === 'true' || value === 'yes' || value === 'on';

export function isI18nDebugEnabled({
  search,
  storage,
  isDev = import.meta.env.DEV,
}: I18nDebugOptions = {}): boolean {
  if (isDev) {
    return true;
  }

  const params =
    typeof search === 'string'
      ? new URLSearchParams(search)
      : (search ??
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null));

  if (params && isTruthyFlag(params.get(I18N_DEBUG_PARAM))) {
    return true;
  }

  try {
    return isTruthyFlag(storage?.getItem(I18N_DEBUG_STORAGE_KEY));
  } catch {
    return false;
  }
}
