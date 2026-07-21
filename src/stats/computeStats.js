const MAX_TAG_BREAKDOWN = 20;

// Works for both array fields (genres/studios/tags) and scalar fields
// (seasonYear) — a scalar counts as a single value, unless null/undefined.
function countBy(entries, field) {
  const counts = new Map();
  for (const entry of entries) {
    const raw = entry[field];
    const values = Array.isArray(raw) ? raw : raw !== null && raw !== undefined ? [raw] : [];
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function computeStats(list) {
  const watched = list.filter((entry) => entry.status === 'vu');
  const toWatch = list.filter((entry) => entry.status === 'a_voir' && !entry.excluded);
  const favorites = list.filter((entry) => entry.note === 'coup_de_coeur');
  const liked = list.filter((entry) => entry.note === 'aime');
  const disliked = list.filter((entry) => entry.note === 'pas_aime');
  const excluded = list.filter((entry) => entry.excluded);

  const genreCounts = countBy(watched, 'genres');
  const studioCounts = countBy(watched, 'studios');
  // Tags run into the hundreds of distinct values (unlike genres/studios),
  // so the breakdown is capped to the top 20 rather than showing everything.
  const tagCounts = countBy(watched, 'tags').slice(0, MAX_TAG_BREAKDOWN);
  // Read as a timeline, so chronological (oldest first) rather than by count.
  const yearCounts = countBy(watched, 'seasonYear').sort((a, b) => a[0] - b[0]);

  return {
    total: list.length,
    watchedCount: watched.length,
    toWatchCount: toWatch.length,
    favoritesCount: favorites.length,
    likedCount: liked.length,
    dislikedCount: disliked.length,
    excludedCount: excluded.length,
    topGenre: genreCounts[0]?.[0] ?? null,
    topStudio: studioCounts[0]?.[0] ?? null,
    genreCounts,
    studioCounts,
    tagCounts,
    yearCounts,
  };
}
