import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRecommendationData } from './fetchRecommendationData.js';
import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';
import { fetchDiscoveryPick } from './discovery.js';

vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
  getAnimeRecommendations: vi.fn(),
}));

vi.mock('../storage/listStorage.js', () => ({
  getList: vi.fn(),
}));

vi.mock('./discovery.js', () => ({
  fetchDiscoveryPick: vi.fn(),
}));

const baseMedia = { id: 1, genres: ['Action'], studios: ['Ufotable'] };
const recommended = { id: 2, genres: ['Action'], studios: ['Ufotable'] };
const seenMedia = { id: 3, genres: [], studios: [] };

describe('fetchRecommendationData', () => {
  beforeEach(() => {
    getAnimeDetails.mockReset();
    getAnimeRecommendations.mockReset();
    getList.mockReset();
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
});
