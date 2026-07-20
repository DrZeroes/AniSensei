// Anime titles are grouped into a single collapsible block when they share the
// same "base" title once common season/movie/subtitle markers are stripped.
// This is a title-pattern heuristic only — AniList relation data isn't stored
// on list entries — so it won't catch every real franchise and can
// occasionally over- or under-group titles that don't follow these patterns.
const TRAILING_MARKER = new RegExp(
  '\\s*(?::.*' +
    '|season\\s*\\d+' +
    "|\\d+(?:st|nd|rd|th)\\s*season" +
    '|part\\s*\\d*' +
    '|the\\s*movie\\b.*' +
    '|movie\\s*\\d*' +
    '|ova\\s*\\d*' +
    '|special\\s*\\d*' +
    '|\\bfinal\\b.*' +
    '|\\biv\\b.*' +
    '|\\bii+\\b.*)\\s*$',
  'i'
);

const MIN_KEY_LENGTH = 3;

export function franchiseKey(title) {
  const original = (title ?? '').trim();
  let key = original;
  let previous;
  do {
    previous = key;
    key = key.replace(TRAILING_MARKER, '').trim();
  } while (key !== previous && key.length > 0);

  // Too-short a key risks grouping unrelated anime under a generic leftover
  // fragment — fall back to the untouched title (never groups) instead.
  return (key.length >= MIN_KEY_LENGTH ? key : original).toLowerCase();
}

export function groupFranchises(entries) {
  const groups = new Map();
  const order = [];

  for (const entry of entries) {
    const key = franchiseKey(entry.title);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(entry);
  }

  return order.map((key) => ({ key, entries: groups.get(key) }));
}
