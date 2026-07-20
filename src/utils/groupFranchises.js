// Groups anime whose titles look like the same franchise into one block, e.g.
// "Higurashi When They Cry", "...Kai", "...Rei", "...GOU" and even the related
// "Umineko When They Cry" all share enough of their meaningful words to count
// as one group; "Berserk (2016)" / "Berserk 2" / "Berserk: Golden Age Arc..."
// all reduce to sharing "berserk". This is a title-pattern heuristic only —
// no real franchise data (AniList relations) is stored per entry — so it
// won't catch everything and can occasionally over/under-group.
//
// Titles are tokenized into meaningful words (punctuation/parentheticals
// stripped, grammatical particles and pure numbers/roman numerals dropped),
// then any two entries whose tokens overlap "enough" are merged, transitively
// (so A~B and B~C end up in one group even if A and C don't directly overlap).
const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'no', 'wa', 'ni', 'de', 'wo', 'ga',
  'movie', 'ova', 'oad', 'special', 'specials', 'season', 'part', 'tv', 'vs',
]);
const ROMAN_NUMERAL = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;
const PURE_NUMBER = /^\d+(st|nd|rd|th)?$/;
// A single shared word is only trusted as a franchise signal if it's this
// long or longer (e.g. "fate", "berserk") — shorter common words ("one" in
// "One Piece" vs "One Punch Man") are too likely to collide by coincidence.
const MIN_SINGLE_TOKEN_LENGTH = 4;

function tokenize(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[:\-–—!?.,'"/]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .filter((word) => !STOPWORDS.has(word))
    .filter((word) => !PURE_NUMBER.test(word))
    .filter((word) => !ROMAN_NUMERAL.test(word));
}

function sameFranchise(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  const setB = new Set(tokensB);
  const shared = tokensA.filter((word) => setB.has(word));
  if (shared.length >= 2) return true;
  return shared.length === 1 && shared[0].length >= MIN_SINGLE_TOKEN_LENGTH;
}

function findRoot(parents, index) {
  let i = index;
  while (parents[i] !== i) {
    parents[i] = parents[parents[i]];
    i = parents[i];
  }
  return i;
}

export function groupFranchises(entries) {
  const tokensByIndex = entries.map((entry) => tokenize(entry.title));
  const parents = entries.map((_, index) => index);

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (sameFranchise(tokensByIndex[i], tokensByIndex[j])) {
        const rootI = findRoot(parents, i);
        const rootJ = findRoot(parents, j);
        if (rootI !== rootJ) parents[rootI] = rootJ;
      }
    }
  }

  const groupsByRoot = new Map();
  const order = [];
  entries.forEach((entry, index) => {
    const root = findRoot(parents, index);
    if (!groupsByRoot.has(root)) {
      groupsByRoot.set(root, []);
      order.push(root);
    }
    groupsByRoot.get(root).push(entry);
  });

  return order.map((root) => {
    const groupEntries = groupsByRoot.get(root);
    return {
      key: groupEntries.map((entry) => entry.animeId).sort((a, b) => a - b).join('-'),
      entries: groupEntries,
    };
  });
}
