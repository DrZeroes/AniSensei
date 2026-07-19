import { browseCatalogue } from '../api/queries.js';
import { scoreCandidate } from './scoring.js';
import { pickWeighted } from './pickResults.js';

// Tier 1: a wide, randomized window within the dominant genre (roughly ranks
// 51-1000), landing on a hidden gem in the common case with a single request.
const GENRE_TIER_OFFSET_PAGES = 1;
const GENRE_TIER_PAGE_RANGE = 19;
// Tier 2 (fallback only): top ~500 most popular overall, virtually guaranteed
// to have something — keeps the "never missing" guarantee to at most 2 requests.
const FALLBACK_TIER_OFFSET_PAGES = 0;
const FALLBACK_TIER_PAGE_RANGE = 10;
const PER_PAGE = 50;

export function pickDominantGenre(baseList) {
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

async function fetchUsableMedia(genre, offsetPages, pageRange, excluded, rng) {
  const page = offsetPages + 1 + Math.floor(rng() * pageRange);
  try {
    const { media } = await browseCatalogue({
      genres: genre ? [genre] : [],
      page,
      perPage: PER_PAGE,
      sort: ['POPULARITY_DESC'],
    });
    return media.filter((item) => !excluded.has(item.id));
  } catch {
    return [];
  }
}

export async function fetchDiscoveryPick(baseList, favoritesList = [], excludeIds = [], rng = Math.random) {
  const excluded = new Set([...excludeIds, ...baseList.map((item) => item.id)]);
  const genre = pickDominantGenre(baseList);

  let usable = genre
    ? await fetchUsableMedia(genre, GENRE_TIER_OFFSET_PAGES, GENRE_TIER_PAGE_RANGE, excluded, rng)
    : [];

  if (usable.length === 0) {
    usable = await fetchUsableMedia(null, FALLBACK_TIER_OFFSET_PAGES, FALLBACK_TIER_PAGE_RANGE, excluded, rng);
  }

  if (usable.length === 0) return null;

  const candidates = usable.map((item) => ({ media: item, score: scoreCandidate(item, baseList, favoritesList) }));
  const { picked } = pickWeighted(candidates, 1, [], rng);
  return picked[0] ?? null;
}
