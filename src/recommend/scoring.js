export const WEIGHTS = {
  genre: 2,
  studio: 3,
  favoriteGenre: 1,
  favoriteStudio: 1.5,
};

// Gacha-style rarity frame, purely cosmetic — a rough read of how strongly a
// suggestion matches the current selection. Scores are unbounded (AniList's
// community "rating" on a recommendation can add dozens of points on its own
// for very popular titles), so a fixed absolute cutoff made almost everything
// "Légendaire" for popular base anime. Rarity is instead based on how a score
// ranks against the rest of the candidate pool for *this* search: the
// fraction of the pool that scores strictly higher decides the tier.
export const RARITY_TIERS = [
  { id: 'legendary', label: 'Légendaire', maxBeaten: 0.1 },
  { id: 'epic', label: 'Épique', maxBeaten: 0.3 },
  { id: 'rare', label: 'Rare', maxBeaten: 0.6 },
  { id: 'common', label: 'Commun', maxBeaten: 1 },
];

export function rarityFor(score, poolScores = []) {
  if (poolScores.length === 0) return RARITY_TIERS[RARITY_TIERS.length - 1];
  const beatenBy = poolScores.filter((other) => other > score).length;
  const fractionBeaten = beatenBy / poolScores.length;
  return RARITY_TIERS.find((tier) => fractionBeaten <= tier.maxBeaten) ?? RARITY_TIERS[RARITY_TIERS.length - 1];
}

function countOverlap(a = [], b = []) {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item)).length;
}

export function scoreCandidate(candidate, baseList = [], favoritesList = []) {
  let score = 0;

  for (const base of baseList) {
    score += countOverlap(candidate.genres, base.genres) * WEIGHTS.genre;
    score += countOverlap(candidate.studios, base.studios) * WEIGHTS.studio;
  }

  for (const favorite of favoritesList) {
    score += countOverlap(candidate.genres, favorite.genres) * WEIGHTS.favoriteGenre;
    score += countOverlap(candidate.studios, favorite.studios) * WEIGHTS.favoriteStudio;
  }

  return score;
}
