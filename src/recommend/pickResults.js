function weightOf(entry) {
  return entry.score + 1; // avoid zero-weight entries never being picked
}

function pickOne(available, rng) {
  const totalWeight = available.reduce((sum, entry) => sum + weightOf(entry), 0);
  let threshold = rng() * totalWeight;

  for (let i = 0; i < available.length; i += 1) {
    threshold -= weightOf(available[i]);
    if (threshold <= 0) return i;
  }

  return available.length - 1;
}

export function pickWeighted(pool, count, excludeIds = [], rng = Math.random) {
  const excluded = new Set(excludeIds);
  const available = pool.filter((entry) => !excluded.has(entry.media.id));

  // Franchise entries (prequels/sequels/side stories) are flagged "guaranteed" by
  // buildCandidatePool — a weighted draw alone can leave one buried behind more
  // generally-recommended anime, so they're seated first (highest score wins if
  // there are more of them than room), then the rest of the count is drawn as usual.
  const guaranteed = available.filter((entry) => entry.guaranteed).sort((a, b) => b.score - a.score);
  const rest = available.filter((entry) => !entry.guaranteed);

  const picked = guaranteed.slice(0, count);
  const remaining = [...rest];

  while (picked.length < count && remaining.length > 0) {
    const index = pickOne(remaining, rng);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }

  return { picked, exhausted: picked.length < count };
}
