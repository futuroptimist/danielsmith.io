import { describe, expect, it, vi } from 'vitest';

import { fetchBuildInfo } from '../systems/buildInfo/buildInfoService';

describe('fetchBuildInfo', () => {
  it('returns the parsed build info on a valid response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        environment: 'staging',
        tag: 'main-af1cabad',
      }),
    });

    await expect(fetchBuildInfo(fetchImpl)).resolves.toEqual({
      environment: 'staging',
      tag: 'main-af1cabad',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/runtime/build-info.json',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
  });

  it('trims surrounding whitespace from a valid tag', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        environment: 'prod',
        tag: '  v0.1.2\n',
      }),
    });

    await expect(fetchBuildInfo(fetchImpl)).resolves.toEqual({
      environment: 'prod',
      tag: 'v0.1.2',
    });
  });

  it('returns null when the response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    await expect(fetchBuildInfo(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the schema version does not match', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        environment: 'prod',
        tag: 'v0.1.2',
      }),
    });
    await expect(fetchBuildInfo(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the environment is not a recognized value', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        environment: 'canary',
        tag: 'main-af1cabad',
      }),
    });
    await expect(fetchBuildInfo(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the tag is missing or blank', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        environment: 'prod',
        tag: '   ',
      }),
    });
    await expect(fetchBuildInfo(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(fetchBuildInfo(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when no fetch implementation is available', async () => {
    await expect(fetchBuildInfo(undefined)).resolves.toBeNull();
  });
});
