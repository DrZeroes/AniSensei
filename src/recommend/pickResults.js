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

  const picked = [];
  const remaining = [...available];

  while (picked.length < count && remaining.length > 0) {
    const index = pickOne(remaining, rng);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }

  return { picked, exhausted: picked.length < count };
}
