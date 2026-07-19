import { anilistQuery } from './anilistClient.js';

function mapMediaSummary(media) {
  return {
    id: media.id,
    title: media.title.english || media.title.romaji,
    coverImage: media.coverImage?.large ?? null,
    genres: media.genres ?? [],
    averageScore: media.averageScore ?? null,
    seasonYear: media.seasonYear ?? null,
    format: media.format ?? null,
    status: media.status ?? null,
    studios: (media.studios?.nodes ?? []).map((studio) => studio.name),
  };
}

const searchCache = new Map();
const detailsCache = new Map();
let genreCollectionCache = null;

export function clearQueryCache() {
  searchCache.clear();
  detailsCache.clear();
  genreCollectionCache = null;
}

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        coverImage { large }
        genres
        averageScore
        seasonYear
        format
        status
        studios { nodes { name } }
      }
    }
  }
`;

export async function searchAnime(term) {
  if (searchCache.has(term)) return searchCache.get(term);
  const data = await anilistQuery(SEARCH_QUERY, { search: term });
  const results = data.Page.media.map(mapMediaSummary);
  searchCache.set(term, results);
  return results;
}

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      description(asHtml: false)
      coverImage { large }
      genres
      tags { name }
      studios { nodes { name } }
      averageScore
      seasonYear
      format
      status
      episodes
      staff(perPage: 5) {
        edges { role node { name { full } } }
      }
    }
  }
`;

export async function getAnimeDetails(id) {
  if (detailsCache.has(id)) return detailsCache.get(id);
  const data = await anilistQuery(DETAILS_QUERY, { id });
  const media = data.Media;
  const result = {
    ...mapMediaSummary(media),
    description: media.description ?? '',
    tags: (media.tags ?? []).map((tag) => tag.name),
    episodes: media.episodes ?? null,
    staff: (media.staff?.edges ?? []).map((edge) => ({
      role: edge.role,
      name: edge.node.name.full,
    })),
  };
  detailsCache.set(id, result);
  return result;
}

const RECOMMENDATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
          rating
          mediaRecommendation {
            id
            title { romaji english }
            coverImage { large }
            genres
            averageScore
            seasonYear
            format
            status
            studios { nodes { name } }
          }
        }
      }
    }
  }
`;

export async function getAnimeRecommendations(id) {
  const data = await anilistQuery(RECOMMENDATIONS_QUERY, { id });
  return (data.Media.recommendations.nodes ?? [])
    .filter((node) => node.mediaRecommendation)
    .map((node) => ({
      rating: node.rating ?? 0,
      media: mapMediaSummary(node.mediaRecommendation),
    }));
}

const RELATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            type
            title { romaji english }
            coverImage { large }
            genres
            averageScore
            seasonYear
            format
            status
            studios { nodes { name } }
          }
        }
      }
    }
  }
`;

// Franchise-relevant relation types — the ones a viewer would realistically want
// recommended next. Excludes ADAPTATION/SOURCE/CHARACTER/COMPILATION/OTHER/SUMMARY.
const FRANCHISE_RELATION_TYPES = new Set(['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'ALTERNATIVE']);

export async function getAnimeRelations(id) {
  const data = await anilistQuery(RELATIONS_QUERY, { id });
  return (data.Media.relations?.edges ?? [])
    .filter((edge) => edge.node.type === 'ANIME' && FRANCHISE_RELATION_TYPES.has(edge.relationType))
    .map((edge) => mapMediaSummary(edge.node));
}

const CATALOGUE_QUERY = `
  query ($page: Int, $perPage: Int, $genres: [String], $year: Int, $format: MediaFormat, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        isAdult: false
        status_not: NOT_YET_RELEASED
        genre_in: $genres
        seasonYear: $year
        format: $format
        sort: $sort
      ) {
        id
        title { romaji english }
        coverImage { large }
        genres
        averageScore
        seasonYear
        format
        status
        studios { nodes { name } }
      }
    }
  }
`;

export async function browseCatalogue({
  page = 1,
  perPage = 20,
  genres = [],
  year = null,
  format = null,
  studio = null,
  sort = ['POPULARITY_DESC'],
} = {}) {
  const data = await anilistQuery(CATALOGUE_QUERY, {
    page,
    perPage,
    genres: genres.length > 0 ? genres : null,
    year,
    format,
    sort,
  });
  let media = data.Page.media
    .map(mapMediaSummary)
    // Defensive client-side filter in case status_not ever misbehaves server-side.
    .filter((item) => item.status !== 'NOT_YET_RELEASED');
  if (studio) {
    media = media.filter((item) => item.studios.includes(studio));
  }
  return {
    media,
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

const GENRE_COLLECTION_QUERY = `
  query {
    GenreCollection
  }
`;

const FALLBACK_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

export async function getGenreCollection() {
  if (genreCollectionCache) return genreCollectionCache;
  try {
    const data = await anilistQuery(GENRE_COLLECTION_QUERY);
    const genres = (data.GenreCollection ?? []).filter((genre) => genre !== 'Hentai');
    genreCollectionCache = genres.length > 0 ? genres : FALLBACK_GENRES;
  } catch {
    genreCollectionCache = FALLBACK_GENRES;
  }
  return genreCollectionCache;
}
