import { browseCatalogue } from '../api/queries.js';
import { scoreCandidate } from './scoring.js';
import { pickWeighted } from './pickResults.js';

const PRIMARY_OFFSET_PAGES = 10; // ~top 500 most popular (perPage 50 * 10 pages)
const FALLBACK_OFFSET_PAGES = 2; // ~top 100-150 most popular, used when the deeper page is empty
const PAGE_RANGE = 10;
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

async function fetchUsableMedia(genre, offsetPages, excluded, rng) {
  const page = offsetPages + 1 + Math.floor(rng() * PAGE_RANGE);
  const { media } = await browseCatalogue({
    genres: [genre],
    page,
    perPage: PER_PAGE,
    sort: ['POPULARITY_DESC'],
  });
  return media.filter((item) => !excluded.has(item.id));
}

export async function fetchDiscoveryPick(baseList, favoritesList = [], excludeIds = [], rng = Math.random) {
  const genre = pickDominantGenre(baseList);
  if (!genre) return null;

  const excluded = new Set([...excludeIds, ...baseList.map((item) => item.id)]);

  let usable = await fetchUsableMedia(genre, PRIMARY_OFFSET_PAGES, excluded, rng);
  if (usable.length === 0) {
    // Some genres don't have 500+ entries; fall back to a shallower (but still non-mainstream) page.
    usable = await fetchUsableMedia(genre, FALLBACK_OFFSET_PAGES, excluded, rng);
  }
  if (usable.length === 0) return null;

  const candidates = usable.map((item) => ({ media: item, score: scoreCandidate(item, baseList, favoritesList) }));
  const { picked } = pickWeighted(candidates, 1, [], rng);
  return picked[0] ?? null;
}
