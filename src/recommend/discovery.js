import { browseCatalogue } from '../api/queries.js';
import { scoreCandidate } from './scoring.js';
import { pickWeighted } from './pickResults.js';

const DEEP_OFFSET_PAGES = 10; // ~top 500-1000 most popular (perPage 50 * 10 pages)
const MID_OFFSET_PAGES = 2; // ~top 100-600 most popular
const TOP_OFFSET_PAGES = 0; // ~top 1-500 most popular — last-resort tier, used only so a pick is never missing
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

  // Ordered fallback tiers: prefer a hidden gem in the dominant genre, then widen the
  // popularity window, then drop the genre filter entirely — so a Découverte pick is
  // (practically) never missing, even if the exact genre has few catalogued entries.
  const tiers = [DEEP_OFFSET_PAGES, MID_OFFSET_PAGES, TOP_OFFSET_PAGES];
  const attempts = genre
    ? [...tiers.map((offset) => [genre, offset]), ...tiers.map((offset) => [null, offset])]
    : tiers.map((offset) => [null, offset]);

  let usable = [];
  for (const [genreFilter, offsetPages] of attempts) {
    usable = await fetchUsableMedia(genreFilter, offsetPages, excluded, rng);
    if (usable.length > 0) break;
  }

  if (usable.length === 0) return null;

  const candidates = usable.map((item) => ({ media: item, score: scoreCandidate(item, baseList, favoritesList) }));
  const { picked } = pickWeighted(candidates, 1, [], rng);
  return picked[0] ?? null;
}
