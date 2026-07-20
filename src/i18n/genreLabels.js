// AniList's genre list is a fixed English vocabulary with no localization in
// the API itself — this is a static display-only translation. The English
// value stays the one used for filtering/scoring/API calls everywhere; only
// what's shown to the user goes through translateGenre.
const GENRE_LABELS_FR = {
  Action: 'Action',
  Adventure: 'Aventure',
  Comedy: 'Comédie',
  Drama: 'Drame',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantastique',
  Horror: 'Horreur',
  'Mahou Shoujo': 'Mahou Shoujo',
  Mecha: 'Mecha',
  Music: 'Musique',
  Mystery: 'Mystère',
  Psychological: 'Psychologique',
  Romance: 'Romance',
  'Sci-Fi': 'Science-fiction',
  'Slice of Life': 'Tranche de vie',
  Sports: 'Sport',
  Supernatural: 'Surnaturel',
  Thriller: 'Thriller',
};

export function translateGenre(genre) {
  return GENRE_LABELS_FR[genre] ?? genre;
}
