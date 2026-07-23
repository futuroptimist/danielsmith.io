export type BuildInfoEnvironment = 'staging' | 'prod' | 'dev';

export interface BuildInfo {
  environment: BuildInfoEnvironment;
  tag: string;
}

const BUILD_INFO_URL = '/runtime/build-info.json';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isBuildInfoEnvironment = (
  value: unknown
): value is BuildInfoEnvironment =>
  value === 'staging' || value === 'prod' || value === 'dev';

const normalizeBuildInfo = (value: unknown): BuildInfo | null => {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return null;
  }
  if (!isBuildInfoEnvironment(value.environment)) {
    return null;
  }
  if (typeof value.tag !== 'string') {
    return null;
  }
  const tag = value.tag.trim();
  if (tag.length === 0) {
    return null;
  }
  return { environment: value.environment, tag };
};

export async function fetchBuildInfo(
  fetchImpl: typeof fetch | undefined = globalThis.fetch
): Promise<BuildInfo | null> {
  if (!fetchImpl) {
    return null;
  }
  try {
    const response = await fetchImpl(BUILD_INFO_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    return normalizeBuildInfo(payload);
  } catch {
    return null;
  }
}
