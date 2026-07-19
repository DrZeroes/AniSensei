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

  it('retries a 429 rate-limit response honoring Retry-After, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => '0.01' },
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { Media: { id: 1 } } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const data = await anilistQuery('query {}');

    expect(data).toEqual({ Media: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up and throws after exceeding the retry limit on repeated 429s', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '0.01' },
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(anilistQuery('query {}')).rejects.toThrow('statut 429');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
