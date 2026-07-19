import { WEIGHTS } from './scoring.js';

// Tags are shown in short form, capped to a few — a candidate can share a
// dozen+ tags with a base anime, and listing them all would swamp the line.
const MAX_TAGS_SHOWN = 3;

export function explainMatch(candidate, baseList = []) {
  const genres = new Set();
  const studios = new Set();
  const tags = new Set();

  for (const base of baseList) {
    for (const genre of candidate.genres ?? []) {
      if ((base.genres ?? []).includes(genre)) genres.add(genre);
    }
    for (const studio of candidate.studios ?? []) {
      if ((base.studios ?? []).includes(studio)) studios.add(studio);
    }
    for (const tag of candidate.tags ?? []) {
      if ((base.tags ?? []).includes(tag)) tags.add(tag);
    }
  }

  const parts = [];
  if (genres.size > 0) parts.push(`genres : ${[...genres].join(', ')}`);
  if (studios.size > 0) parts.push(`studio : ${[...studios].join(', ')}`);
  if (tags.size > 0) {
    const shown = [...tags].slice(0, MAX_TAGS_SHOWN);
    const rest = tags.size - shown.length;
    parts.push(`tags : ${shown.join(', ')}${rest > 0 ? ` (+${rest})` : ''}`);
  }

  return parts.length > 0
    ? `Points communs — ${parts.join(' · ')}`
    : 'Recommandation basée sur la communauté AniList';
}

function tally(candidate, list, weights, label, lines) {
  const genreCounts = new Map();
  const studioCounts = new Map();
  let tagOverlapCount = 0;

  for (const item of list) {
    for (const genre of candidate.genres ?? []) {
      if ((item.genres ?? []).includes(genre)) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }
    for (const studio of candidate.studios ?? []) {
      if ((item.studios ?? []).includes(studio)) {
        studioCounts.set(studio, (studioCounts.get(studio) ?? 0) + 1);
      }
    }
    for (const tag of candidate.tags ?? []) {
      if ((item.tags ?? []).includes(tag)) tagOverlapCount += 1;
    }
  }

  let subtotal = 0;
  for (const [genre, count] of genreCounts) {
    const points = count * weights.genre;
    lines.push(`${label} — genre "${genre}" x${count} : +${points}`);
    subtotal += points;
  }
  for (const [studio, count] of studioCounts) {
    const points = count * weights.studio;
    lines.push(`${label} — studio "${studio}" x${count} : +${points}`);
    subtotal += points;
  }
  // Aggregated into one line (rather than per-tag) since there can be many.
  if (tagOverlapCount > 0) {
    const points = tagOverlapCount * weights.tag;
    lines.push(`${label} — ${tagOverlapCount} tag(s) en commun : +${points}`);
    subtotal += points;
  }
  return subtotal;
}

export function buildScoreTooltip(candidate, baseList = [], favoritesList = []) {
  const lines = [];
  let subtotal = 0;

  subtotal += tally(
    candidate,
    baseList,
    { genre: WEIGHTS.genre, studio: WEIGHTS.studio, tag: WEIGHTS.tag },
    'Animes de base',
    lines
  );
  subtotal += tally(
    candidate,
    favoritesList,
    { genre: WEIGHTS.favoriteGenre, studio: WEIGHTS.favoriteStudio, tag: WEIGHTS.favoriteTag },
    'Coups de cœur',
    lines
  );

  if (lines.length === 0) {
    lines.push('Aucun genre/studio/tag en commun trouvé.');
  }
  lines.push('+ un bonus selon la popularité de la suggestion parmi les fans AniList.');
  lines.push(`Sous-total genres/studios/tags : ${subtotal.toFixed(1)}`);

  return lines.join('\n');
}
