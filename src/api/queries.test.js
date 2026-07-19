import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anilistQuery } from './anilistClient.js';
import {
  searchAnime,
  getAnimeDetails,
  getAnimeRecommendations,
  getAnimeRelations,
  browseCatalogue,
  getGenreCollection,
  clearQueryCache,
} from './queries.js';

vi.mock('./anilistClient.js', () => ({
  anilistQuery: vi.fn(),
}));

const sampleMedia = {
  id: 21,
  title: { romaji: 'One Piece', english: 'One Piece' },
  coverImage: { large: 'https://img/one-piece.jpg' },
  genres: ['Action', 'Adventure'],
  averageScore: 88,
  seasonYear: 1999,
  format: 'TV',
  status: 'RELEASING',
  studios: { nodes: [{ name: 'Toei Animation' }] },
};

const unreleasedMedia = {
  ...sampleMedia,
  id: 22,
  title: { romaji: 'Unreleased Anime', english: null },
  status: 'NOT_YET_RELEASED',
};

beforeEach(() => {
  anilistQuery.mockReset();
  clearQueryCache();
});

describe('searchAnime', () => {
  it('maps AniList media into MediaSummary objects', async () => {
    anilistQuery.mockResolvedValue({ Page: { media: [sampleMedia] } });

    const results = await searchAnime('One Piece');

    expect(anilistQuery).toHaveBeenCalledWith(expect.any(String), { search: 'One Piece' });
    expect(results).toEqual([
      {
        id: 21,
        title: 'One Piece',
        coverImage: 'https://img/one-piece.jpg',
        genres: ['Action', 'Adventure'],
        averageScore: 88,
        seasonYear: 1999,
        format: 'TV',
        status: 'RELEASING',
        studios: ['Toei Animation'],
      },
    ]);
  });

  it('caches results for the same search term', async () => {
    anilistQuery.mockResolvedValue({ Page: { media: [sampleMedia] } });

    await searchAnime('One Piece');
    await searchAnime('One Piece');

    expect(anilistQuery).toHaveBeenCalledTimes(1);
  });
});

describe('getAnimeDetails', () => {
  it('maps AniList media into a MediaDetail object', async () => {
    anilistQuery.mockResolvedValue({
      Media: {
        ...sampleMedia,
        description: 'A pirate adventure.',
        tags: [{ name: 'Pirates' }],
        episodes: 1000,
        staff: { edges: [{ role: 'Director', node: { name: { full: 'Eiichiro Oda' } } }] },
      },
    });

    const result = await getAnimeDetails(21);

    expect(result.description).toBe('A pirate adventure.');
    expect(result.tags).toEqual(['Pirates']);
    expect(result.episodes).toBe(1000);
    expect(result.status).toBe('RELEASING');
    expect(result.staff).toEqual([{ role: 'Director', name: 'Eiichiro Oda' }]);
  });

  it('caches results for the same id', async () => {
    anilistQuery.mockResolvedValue({
      Media: { ...sampleMedia, description: '', tags: [], episodes: null, staff: { edges: [] } },
    });

    await getAnimeDetails(21);
    await getAnimeDetails(21);

    expect(anilistQuery).toHaveBeenCalledTimes(1);
  });
});

describe('getAnimeRecommendations', () => {
  it('maps recommendation nodes into rating/media pairs', async () => {
    anilistQuery.mockResolvedValue({
      Media: { recommendations: { nodes: [{ rating: 42, mediaRecommendation: sampleMedia }] } },
    });

    const result = await getAnimeRecommendations(21);

    expect(result).toEqual([{ rating: 42, media: expect.objectContaining({ id: 21 }) }]);
  });

  it('skips nodes with no mediaRecommendation', async () => {
    anilistQuery.mockResolvedValue({
      Media: { recommendations: { nodes: [{ rating: 10, mediaRecommendation: null }] } },
    });

    const result = await getAnimeRecommendations(21);

    expect(result).toEqual([]);
  });
});

describe('getAnimeRelations', () => {
  it('keeps only franchise-relevant relation types', async () => {
    anilistQuery.mockResolvedValue({
      Media: {
        relations: {
          edges: [
            { relationType: 'PREQUEL', node: { ...sampleMedia, id: 30, type: 'ANIME' } },
            { relationType: 'SEQUEL', node: { ...sampleMedia, id: 31, type: 'ANIME' } },
            { relationType: 'ADAPTATION', node: { ...sampleMedia, id: 32, type: 'MANGA' } },
            { relationType: 'CHARACTER', node: { ...sampleMedia, id: 33, type: 'ANIME' } },
          ],
        },
      },
    });

    const result = await getAnimeRelations(21);

    expect(result.map((media) => media.id)).toEqual([30, 31]);
  });

  it('excludes non-anime relation nodes (e.g. the source manga)', async () => {
    anilistQuery.mockResolvedValue({
      Media: {
        relations: {
          edges: [{ relationType: 'SEQUEL', node: { ...sampleMedia, id: 30, type: 'MANGA' } }],
        },
      },
    });

    const result = await getAnimeRelations(21);

    expect(result).toEqual([]);
  });
});

describe('browseCatalogue', () => {
  it('returns mapped media and pagination info', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: true }, media: [sampleMedia] },
    });

    const result = await browseCatalogue({ page: 2, genres: ['Action'] });

    expect(anilistQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ page: 2, genres: ['Action'] })
    );
    expect(result.hasNextPage).toBe(true);
    expect(result.media).toHaveLength(1);
  });

  it('sends multiple genres as a single genre_in filter', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    await browseCatalogue({ genres: ['Action', 'Comedy'] });

    expect(anilistQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ genres: ['Action', 'Comedy'] })
    );
  });

  it('sends no genre filter when the genres list is empty', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    await browseCatalogue({ genres: [] });

    expect(anilistQuery).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ genres: null }));
  });

  it('omits year and format from the variables when not provided', async () => {
    // AniList treats an explicit `seasonYear: null` / `format: null` as "field IS
    // NULL" rather than "no filter", collapsing results to almost nothing — so
    // these keys must be absent from the variables object entirely, not null.
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    await browseCatalogue({ genres: ['Action'] });

    const variables = anilistQuery.mock.calls[0][1];
    expect(variables).not.toHaveProperty('year');
    expect(variables).not.toHaveProperty('format');
  });

  it('sends year and format when provided', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    await browseCatalogue({ year: 2020, format: 'TV' });

    expect(anilistQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ year: 2020, format: 'TV' })
    );
  });

  it('filters by studio client-side when provided', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia] },
    });

    const result = await browseCatalogue({ studio: 'Madhouse' });

    expect(result.media).toEqual([]);
  });

  it('requests status_not NOT_YET_RELEASED and also filters unreleased anime client-side', async () => {
    anilistQuery.mockResolvedValue({
      Page: { pageInfo: { hasNextPage: false }, media: [sampleMedia, unreleasedMedia] },
    });

    const result = await browseCatalogue();

    expect(anilistQuery).toHaveBeenCalledWith(expect.stringContaining('status_not: NOT_YET_RELEASED'), expect.any(Object));
    expect(result.media.map((item) => item.id)).toEqual([21]);
  });
});

describe('getGenreCollection', () => {
  it('returns the AniList genre list with Hentai excluded', async () => {
    anilistQuery.mockResolvedValue({ GenreCollection: ['Action', 'Hentai', 'Comedy'] });

    const genres = await getGenreCollection();

    expect(genres).toEqual(['Action', 'Comedy']);
  });

  it('caches the result across calls', async () => {
    anilistQuery.mockResolvedValue({ GenreCollection: ['Action'] });

    await getGenreCollection();
    await getGenreCollection();

    expect(anilistQuery).toHaveBeenCalledTimes(1);
  });

  it('falls back to a static list when the request fails', async () => {
    anilistQuery.mockRejectedValue(new Error('network'));

    const genres = await getGenreCollection();

    expect(genres.length).toBeGreaterThan(0);
    expect(genres).not.toContain('Hentai');
  });
});
