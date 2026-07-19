import { scoreCandidate } from './scoring.js';

const POOL_SIZE = 20;
const RATING_WEIGHT = 0.1;

export function buildCandidatePool(
  { baseList, recommendationNodes, favoritesList = [], excludeIds = [] },
  limit = POOL_SIZE
) {
  const excluded = new Set([...excludeIds, ...baseList.map((media) => media.id)]);
  const byId = new Map();

  for (const node of recommendationNodes) {
    const { media, rating, isRelation = false } = node;
    if (excluded.has(media.id)) continue;
    if (media.status === 'NOT_YET_RELEASED') continue;

    const score = scoreCandidate(media, baseList, favoritesList) + rating * RATING_WEIGHT;
    const existing = byId.get(media.id);
    // guaranteed sticks once true, regardless of which node ends up winning on score.
    const guaranteed = isRelation || existing?.guaranteed || false;

    if (!existing || existing.score < score) {
      byId.set(media.id, { media, score, guaranteed });
    } else {
      existing.guaranteed = guaranteed;
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
