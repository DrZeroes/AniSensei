import { browseCatalogue } from '../api/queries.js';
import { scoreCandidate } from './scoring.js';
import { pickWeighted } from './pickResults.js';

const POPULARITY_OFFSET_PAGES = 10; // ~top 500 most popular (perPage 50 * 10 pages)
const PAGE_RANGE = 10;
const PER_PAGE = 50;

function pickDominantGenre(baseList) {
  const counts = new Map();
  for (const media of baseList) {
    for (const genre of media.genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [genre, count] of counts) {
    if (count > bestCount) {
      best = genre;
      bestCount = count;
    }
  }
  return best;
}

export async function fetchDiscoveryPick(baseList, favoritesList = [], excludeIds = [], rng = Math.random) {
  const genre = pickDominantGenre(baseList);
  if (!genre) return null;

  const page = POPULARITY_OFFSET_PAGES + 1 + Math.floor(rng() * PAGE_RANGE);
  const { media } = await browseCatalogue({
    genres: [genre],
    page,
    perPage: PER_PAGE,
    sort: ['POPULARITY_DESC'],
  });

  const excluded = new Set([...excludeIds, ...baseList.map((item) => item.id)]);
  const candidates = media
    .filter((item) => !excluded.has(item.id))
    .map((item) => ({ media: item, score: scoreCandidate(item, baseList, favoritesList) }));

  const { picked } = pickWeighted(candidates, 1, [], rng);
  return picked[0] ?? null;
}
