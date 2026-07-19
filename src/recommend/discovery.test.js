import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDiscoveryPick } from './discovery.js';
import { browseCatalogue } from '../api/queries.js';

vi.mock('../api/queries.js', () => ({
  browseCatalogue: vi.fn(),
}));

const baseList = [
  { id: 1, genres: ['Action', 'Drama'], studios: [] },
  { id: 2, genres: ['Action'], studios: [] },
];
const matching = { id: 10, genres: ['Action'], studios: [] };
const notMatching = { id: 11, genres: ['Romance'], studios: [] };
const empty = { media: [], hasNextPage: false };

describe('fetchDiscoveryPick', () => {
  beforeEach(() => {
    browseCatalogue.mockReset();
  });

  it('falls back to genre-less catalogue tiers when the base list has no genres', async () => {
    browseCatalogue.mockResolvedValue(empty);

    const result = await fetchDiscoveryPick([], [], []);

    expect(result).toBeNull();
    expect(browseCatalogue).toHaveBeenCalledTimes(3);
    for (const call of browseCatalogue.mock.calls) {
      expect(call[0]).toMatchObject({ genres: [] });
    }
  });

  it('queries the catalogue filtered by the dominant genre, beyond the top-500 popularity pages, on the first try', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(1);
    expect(browseCatalogue).toHaveBeenCalledWith(
      expect.objectContaining({ genres: ['Action'], page: 11, perPage: 50, sort: ['POPULARITY_DESC'] })
    );
  });

  it('picks a candidate that overlaps with the base genres', async () => {
    browseCatalogue.mockResolvedValue({ media: [notMatching, matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0.99);

    expect(result.media.id).toBe(10);
    expect(result.score).toBeGreaterThan(0);
  });

  it('falls back to a shallower same-genre page when the deep page has no usable results', async () => {
    browseCatalogue.mockResolvedValueOnce(empty).mockResolvedValueOnce({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
    expect(browseCatalogue.mock.calls[1][0]).toMatchObject({ genres: ['Action'], page: 3 });
    expect(result.media.id).toBe(10);
  });

  it('drops the genre filter once every same-genre tier is exhausted, and never returns null when the catalogue has anything at all', async () => {
    browseCatalogue
      .mockResolvedValueOnce(empty) // genre, deep
      .mockResolvedValueOnce(empty) // genre, mid
      .mockResolvedValueOnce(empty) // genre, top
      .mockResolvedValueOnce(empty) // no genre, deep
      .mockResolvedValueOnce(empty) // no genre, mid
      .mockResolvedValueOnce({ media: [matching], hasNextPage: true }); // no genre, top — last resort

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(6);
    expect(browseCatalogue.mock.calls[5][0]).toMatchObject({ genres: [], page: 1 });
    expect(result.media.id).toBe(10);
  });

  it('returns null only once every fallback tier (genre and genre-less) is exhausted', async () => {
    browseCatalogue.mockResolvedValue(empty);

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(6);
    expect(result).toBeNull();
  });

  it('excludes ids already in the base list or excludeIds across every tier', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [10]);

    expect(result).toBeNull();
  });
});
