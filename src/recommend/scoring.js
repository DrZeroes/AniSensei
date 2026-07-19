export const WEIGHTS = {
  genre: 2,
  studio: 3,
  favoriteGenre: 1,
  favoriteStudio: 1.5,
};

// Gacha-style rarity frame, purely cosmetic — a rough read of how strongly a
// suggestion matches the current selection. Thresholds are calibrated against
// typical scores seen in practice (a single shared genre is ~2-5, a strong
// franchise-relation or multi-base match routinely lands well above 15).
export const RARITY_TIERS = [
  { id: 'legendary', label: 'Légendaire', min: 25 },
  { id: 'epic', label: 'Épique', min: 15 },
  { id: 'rare', label: 'Rare', min: 7 },
  { id: 'common', label: 'Commun', min: 0 },
];

export function rarityFor(score) {
  return RARITY_TIERS.find((tier) => score >= tier.min) ?? RARITY_TIERS[RARITY_TIERS.length - 1];
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
