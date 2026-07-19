import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRecommendationData } from './fetchRecommendationData.js';
import { getAnimeDetails, getAnimeRecommendations, getAnimeRelations, browseCatalogue } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';
import { fetchDiscoveryPick } from './discovery.js';

vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
  getAnimeRecommendations: vi.fn(),
  getAnimeRelations: vi.fn(),
  browseCatalogue: vi.fn(),
}));

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
}));

vi.mock('./discovery.js', () => ({
  fetchDiscoveryPick: vi.fn(),
  pickDominantGenre: vi.fn((baseList) => baseList[0]?.genres?.[0] ?? null),
}));

const baseMedia = { id: 1, genres: ['Action'], studios: ['Ufotable'] };
const recommended = { id: 2, genres: ['Action'], studios: ['Ufotable'] };
const seenMedia = { id: 3, genres: [], studios: [] };

describe('fetchRecommendationData', () => {
  beforeEach(() => {
    getAnimeDetails.mockReset();
    getAnimeRecommendations.mockReset();
    getAnimeRelations.mockReset().mockResolvedValue([]);
    getList.mockReset();
    browseCatalogue.mockReset().mockResolvedValue({ media: [], hasNextPage: false });
    fetchDiscoveryPick.mockReset().mockResolvedValue(null);
  });

  it('throws base_vide when no base anime ids are given', async () => {
    await expect(fetchRecommendationData([])).rejects.toThrow('base_vide');
  });

  it('builds a pool excluding already-seen and excluded local entries', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([
      { rating: 10, media: recommended },
      { rating: 10, media: seenMedia },
    ]);
    getList.mockReturnValue([{ animeId: 3, status: 'vu', note: null, excluded: false }]);

    const { pool, baseList } = await fetchRecommendationData([1]);

    expect(baseList).toEqual([baseMedia]);
    expect(pool.map((entry) => entry.media.id)).toEqual([2]);
  });

  it('fetches details for up to 10 favorites to use as a scoring bonus', async () => {
    getAnimeDetails.mockImplementation((id) =>
      Promise.resolve(id === 1 ? baseMedia : { id, genres: ['Action'], studios: [] })
    );
    getAnimeRecommendations.mockResolvedValue([{ rating: 0, media: recommended }]);
    getList.mockReturnValue([
      { animeId: 5, status: 'vu', note: 'coup_de_coeur', excluded: false },
    ]);

    await fetchRecommendationData([1]);

    expect(getAnimeDetails).toHaveBeenCalledWith(5);
  });

  it('includes the discovery pick returned by fetchDiscoveryPick', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([]);
    getList.mockReturnValue([]);
    fetchDiscoveryPick.mockResolvedValue({ media: { id: 99, title: 'Obscure Anime' }, score: 3 });

    const { discoveryPick } = await fetchRecommendationData([1]);

    expect(discoveryPick).toEqual({ media: { id: 99, title: 'Obscure Anime' }, score: 3 });
  });

  it('tops up a thin pool with popular genre-matched anime from the catalogue', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([{ rating: 10, media: recommended }]);
    getList.mockReturnValue([]);
    const extra = { id: 20, genres: ['Action'], studios: [] };
    browseCatalogue.mockResolvedValue({ media: [extra], hasNextPage: true });

    const { pool } = await fetchRecommendationData([1]);

    expect(browseCatalogue).toHaveBeenCalledWith(
      expect.objectContaining({ genres: ['Action'], sort: ['POPULARITY_DESC'] })
    );
    expect(pool.map((entry) => entry.media.id)).toContain(20);
  });

  it('does not query the catalogue when the pool is already large enough', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    const manyNodes = Array.from({ length: 12 }, (_, index) => ({
      rating: index,
      media: { id: 100 + index, genres: ['Action'], studios: [] },
    }));
    getAnimeRecommendations.mockResolvedValue(manyNodes);
    getList.mockReturnValue([]);

    await fetchRecommendationData([1]);

    expect(browseCatalogue).not.toHaveBeenCalled();
  });

  it('includes franchise relations (prequels/sequels) and ranks them above generic recommendations', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([{ rating: 5, media: recommended }]);
    const sequel = { id: 40, genres: ['Action'], studios: ['Ufotable'] };
    getAnimeRelations.mockResolvedValue([sequel]);
    getList.mockReturnValue([]);

    const { pool } = await fetchRecommendationData([1]);

    expect(getAnimeRelations).toHaveBeenCalledWith(1);
    expect(pool[0].media.id).toBe(40);
  });

  it('walks multiple hops of relations to surface a whole linear franchise', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([]);
    const chapter2 = { id: 40, genres: ['Action'], studios: ['Ufotable'] };
    const chapter3 = { id: 41, genres: ['Action'], studios: ['Ufotable'] };
    // AniList only links adjacent entries: base(1) -> chapter2(40) -> chapter3(41).
    getAnimeRelations.mockImplementation((id) => {
      if (id === 1) return Promise.resolve([chapter2]);
      if (id === 40) return Promise.resolve([chapter3]);
      return Promise.resolve([]);
    });
    getList.mockReturnValue([]);

    const { pool } = await fetchRecommendationData([1]);

    expect(pool.map((entry) => entry.media.id)).toEqual(expect.arrayContaining([40, 41]));
    expect(getAnimeRelations).toHaveBeenCalledWith(40);
    expect(getAnimeRelations).toHaveBeenCalledWith(41);
  });

  it('stops walking relations once a chain loops back on itself', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([]);
    const chapter2 = { id: 40, genres: ['Action'], studios: [] };
    // chapter2's relations point right back at the base anime.
    getAnimeRelations.mockImplementation((id) => {
      if (id === 1) return Promise.resolve([chapter2]);
      if (id === 40) return Promise.resolve([baseMedia]);
      return Promise.resolve([]);
    });
    getList.mockReturnValue([]);

    const { pool } = await fetchRecommendationData([1]);

    expect(pool.map((entry) => entry.media.id)).toEqual([40]);
    expect(getAnimeRelations).toHaveBeenCalledTimes(2); // id 1, then id 40 — not id 1 again
  });

  it('does not recommend a franchise relation the user has already watched', async () => {
    getAnimeDetails.mockResolvedValue(baseMedia);
    getAnimeRecommendations.mockResolvedValue([]);
    const sequel = { id: 40, genres: ['Action'], studios: ['Ufotable'] };
    getAnimeRelations.mockResolvedValue([sequel]);
    getList.mockReturnValue([{ animeId: 40, status: 'vu', note: null, excluded: false }]);

    const { pool } = await fetchRecommendationData([1]);

    expect(pool.map((entry) => entry.media.id)).not.toContain(40);
  });
});
