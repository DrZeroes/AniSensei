import { WEIGHTS } from './scoring.js';

export function explainMatch(candidate, baseList = []) {
  const genres = new Set();
  const studios = new Set();

  for (const base of baseList) {
    for (const genre of candidate.genres ?? []) {
      if ((base.genres ?? []).includes(genre)) genres.add(genre);
    }
    for (const studio of candidate.studios ?? []) {
      if ((base.studios ?? []).includes(studio)) studios.add(studio);
    }
  }

  const parts = [];
  if (genres.size > 0) parts.push(`genres : ${[...genres].join(', ')}`);
  if (studios.size > 0) parts.push(`studio : ${[...studios].join(', ')}`);

  return parts.length > 0
    ? `Points communs — ${parts.join(' · ')}`
    : 'Recommandation basée sur la communauté AniList';
}

function tally(candidate, list, genreWeight, studioWeight, label, lines) {
  const genreCounts = new Map();
  const studioCounts = new Map();

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
  }

  let subtotal = 0;
  for (const [genre, count] of genreCounts) {
    const points = count * genreWeight;
    lines.push(`${label} — genre "${genre}" x${count} : +${points}`);
    subtotal += points;
  }
  for (const [studio, count] of studioCounts) {
    const points = count * studioWeight;
    lines.push(`${label} — studio "${studio}" x${count} : +${points}`);
    subtotal += points;
  }
  return subtotal;
}

export function buildScoreTooltip(candidate, baseList = [], favoritesList = []) {
  const lines = [];
  let subtotal = 0;

  subtotal += tally(candidate, baseList, WEIGHTS.genre, WEIGHTS.studio, 'Animes de base', lines);
  subtotal += tally(
    candidate,
    favoritesList,
    WEIGHTS.favoriteGenre,
    WEIGHTS.favoriteStudio,
    'Coups de cœur',
    lines
  );

  if (lines.length === 0) {
    lines.push('Aucun genre/studio en commun trouvé.');
  }
  lines.push('+ un bonus selon la popularité de la suggestion parmi les fans AniList.');
  lines.push(`Sous-total genres/studios : ${subtotal.toFixed(1)}`);

  return lines.join('\n');
}
