import { getAnimeDetails, getAnimeRecommendations, browseCatalogue } from '../api/queries.js';
import { buildCandidatePool } from './buildPool.js';
import { fetchDiscoveryPick, pickDominantGenre } from './discovery.js';
import { getList } from '../storage/listStorage.js';

const MAX_FAVORITES_FOR_SCORING = 10;
const MIN_POOL_SIZE = 10;
const SUPPLEMENT_PER_PAGE = 30;

export async function fetchRecommendationData(baseAnimeIds) {
  if (!baseAnimeIds || baseAnimeIds.length === 0) {
    throw new Error('base_vide');
  }

  const baseList = await Promise.all(baseAnimeIds.map((id) => getAnimeDetails(id)));
  const recommendationLists = await Promise.all(
    baseAnimeIds.map((id) => getAnimeRecommendations(id))
  );
  const recommendationNodes = recommendationLists.flat();

  const localList = getList();
  const excludeIds = localList
    .filter((entry) => entry.status === 'vu' || entry.excluded)
    .map((entry) => entry.animeId);

  const favoriteIds = localList
    .filter((entry) => entry.note === 'coup_de_coeur' && !baseAnimeIds.includes(entry.animeId))
    .map((entry) => entry.animeId)
    .slice(0, MAX_FAVORITES_FOR_SCORING);
  const favoritesList = await Promise.all(favoriteIds.map((id) => getAnimeDetails(id)));

  let pool = buildCandidatePool({ baseList, recommendationNodes, favoritesList, excludeIds });

  // A single (or few) base anime may only have a handful of AniList-submitted recommendations.
  // Top up the pool with popular genre-matched anime so there's enough to pick 5 distinct results.
  if (pool.length < MIN_POOL_SIZE) {
    const genre = pickDominantGenre(baseList);
    if (genre) {
      const { media: extraMedia } = await browseCatalogue({
        genres: [genre],
        sort: ['POPULARITY_DESC'],
        perPage: SUPPLEMENT_PER_PAGE,
        page: 1,
      });
      const extraNodes = extraMedia.map((media) => ({ rating: 0, media }));
      pool = buildCandidatePool({
        baseList,
        recommendationNodes: [...recommendationNodes, ...extraNodes],
        favoritesList,
        excludeIds,
      });
    }
  }

  const discoveryPick = await fetchDiscoveryPick(baseList, favoritesList, excludeIds);

  return { pool, baseList, favoritesList, discoveryPick };
}
