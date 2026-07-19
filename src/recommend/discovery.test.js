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

describe('fetchDiscoveryPick', () => {
  beforeEach(() => {
    browseCatalogue.mockReset();
  });

  it('returns null when the base list has no genres', async () => {
    const result = await fetchDiscoveryPick([], [], []);
    expect(result).toBeNull();
    expect(browseCatalogue).not.toHaveBeenCalled();
  });

  it('queries the catalogue filtered by the dominant genre, beyond the top-500 popularity pages', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    await fetchDiscoveryPick(baseList, [], [], () => 0);

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

  it('excludes ids already in the base list or excludeIds', async () => {
    browseCatalogue.mockResolvedValue({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [10]);

    expect(result).toBeNull();
  });

  it('falls back to a shallower popularity page when the deep page has no usable results', async () => {
    browseCatalogue
      .mockResolvedValueOnce({ media: [], hasNextPage: false })
      .mockResolvedValueOnce({ media: [matching], hasNextPage: true });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
    expect(browseCatalogue.mock.calls[1][0]).toMatchObject({ page: 3 });
    expect(result.media.id).toBe(10);
  });

  it('returns null when both the deep and fallback pages have no usable results', async () => {
    browseCatalogue.mockResolvedValue({ media: [], hasNextPage: false });

    const result = await fetchDiscoveryPick(baseList, [], [], () => 0);

    expect(browseCatalogue).toHaveBeenCalledTimes(2);
    expect(result).toBeNull();
  });
});
