import { scoreCandidate } from './scoring.js';

const POOL_SIZE = 20;
const RATING_WEIGHT = 0.1;

export function buildCandidatePool({ baseList, recommendationNodes, favoritesList = [], excludeIds = [] }) {
  const excluded = new Set([...excludeIds, ...baseList.map((media) => media.id)]);
  const byId = new Map();

  for (const node of recommendationNodes) {
    const { media, rating } = node;
    if (excluded.has(media.id)) continue;

    const score = scoreCandidate(media, baseList, favoritesList) + rating * RATING_WEIGHT;

    if (!byId.has(media.id) || byId.get(media.id).score < score) {
      byId.set(media.id, { media, score });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, POOL_SIZE);
}
