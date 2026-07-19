import { getAnimeDetails, getAnimeRecommendations } from '../api/queries.js';
import { buildCandidatePool } from './buildPool.js';
import { fetchDiscoveryPick } from './discovery.js';
import { getList } from '../storage/listStorage.js';

const MAX_FAVORITES_FOR_SCORING = 10;

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

  const pool = buildCandidatePool({ baseList, recommendationNodes, favoritesList, excludeIds });
  const discoveryPick = await fetchDiscoveryPick(baseList, favoritesList, excludeIds);

  return { pool, baseList, favoritesList, discoveryPick };
}
