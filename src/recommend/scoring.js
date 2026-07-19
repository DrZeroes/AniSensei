const WEIGHTS = {
  genre: 2,
  studio: 3,
  favoriteGenre: 1,
  favoriteStudio: 1.5,
};

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
