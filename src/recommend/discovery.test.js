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

  it('falls back to genre-less tier when the base list has no genres', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick([], [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(1);
    expect(browseCatalogue).toHaveBeenCalledWith(expect.objectContaining({ genres: [], page: 1 }));
    expect(result.media.id).toBe(10);
  });

  it('queries the catalogue filtered by the dominant genre on the first try', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(1);
    expect(browseCatalogue).toHaveBeenCalledWith(
      expect.objectContaining({ genres: ['Action'], page: 2, perPage: 50, sort: ['POPULARITY_DESC'] })
    );
  });

  it('picks a candidate that overlaps with the base genres', async () => {
    browseCatalogue.mockResolvedValue({ media: [notMatching, matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0.99);

    expect(result.media.id).toBe(10);
    expect(result.score).toBeGreaterThan(0);
  });

  it('falls back to the genre-less top-popularity tier when the genre tier is empty', async () => {
    browseCatalogue.mockResolvedValueOnce(empty).mockResolvedValueOnce({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
    expect(browseCatalogue.mock.calls[1][0]).toMatchObject({ genres: [], page: 1 });
    expect(result.media.id).toBe(10);
  });

  it('returns null once both tiers are exhausted', async () => {
    browseCatalogue.mockResolvedValue(empty);

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
    expect(result).toBeNull();
  });

  it('excludes ids already in the base list or excludeIds', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [10]);

    expect(result).toBeNull();
  });
});
