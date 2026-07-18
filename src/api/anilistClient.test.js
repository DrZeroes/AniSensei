import { afterEach, describe, expect, it, vi } from 'vitest';
import { anilistQuery } from './anilistClient.js';

describe('anilistQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the data field on a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { Media: { id: 1 } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await anilistQuery('query { Media { id } }');

    expect(data).toEqual({ Media: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graphql.anilist.co',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the HTTP response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    await expect(anilistQuery('query {}')).rejects.toThrow('statut 500');
  });

  it('throws when the response contains GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errors: [{ message: 'Invalid token' }] }),
      })
    );

    await expect(anilistQuery('query {}')).rejects.toThrow('Invalid token');
  });
});
