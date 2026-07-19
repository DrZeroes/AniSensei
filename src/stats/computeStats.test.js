import { describe, expect, it } from 'vitest';
import { computeStats } from './computeStats.js';

const watchedFavorite = {
  animeId: 1,
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  genres: ['Action', 'Fantasy'],
  studios: ['Ufotable'],
};
const watchedLiked = {
  animeId: 2,
  status: 'vu',
  note: 'aime',
  excluded: false,
  genres: ['Action'],
  studios: ['Ufotable'],
};
const watchedDisliked = {
  animeId: 3,
  status: 'vu',
  note: 'pas_aime',
  excluded: false,
  genres: ['Romance'],
  studios: ['Toei Animation'],
};
const toWatch = { animeId: 4, status: 'a_voir', note: null, excluded: false, genres: [], studios: [] };
const excludedEntry = { animeId: 5, status: 'a_voir', note: null, excluded: true, genres: [], studios: [] };

describe('computeStats', () => {
  it('counts entries by status/note/exclusion', () => {
    const stats = computeStats([watchedFavorite, watchedLiked, watchedDisliked, toWatch, excludedEntry]);

    expect(stats.total).toBe(5);
    expect(stats.watchedCount).toBe(3);
    expect(stats.toWatchCount).toBe(1);
    expect(stats.favoritesCount).toBe(1);
    expect(stats.likedCount).toBe(1);
    expect(stats.dislikedCount).toBe(1);
    expect(stats.excludedCount).toBe(1);
  });

  it('finds the most-watched genre and studio', () => {
    const stats = computeStats([watchedFavorite, watchedLiked, watchedDisliked]);

    expect(stats.topGenre).toBe('Action'); // appears in 2 of 3 watched entries
    expect(stats.topStudio).toBe('Ufotable'); // appears in 2 of 3 watched entries
  });

  it('returns full genre/studio breakdowns sorted by count descending', () => {
    const stats = computeStats([watchedFavorite, watchedLiked, watchedDisliked]);

    expect(stats.genreCounts).toEqual([
      ['Action', 2],
      ['Fantasy', 1],
      ['Romance', 1],
    ]);
    expect(stats.studioCounts).toEqual([
      ['Ufotable', 2],
      ['Toei Animation', 1],
    ]);
  });

  it('only counts genres/studios from watched anime, not the whole list', () => {
    const stats = computeStats([toWatch, excludedEntry]);

    expect(stats.genreCounts).toEqual([]);
    expect(stats.studioCounts).toEqual([]);
    expect(stats.topGenre).toBeNull();
    expect(stats.topStudio).toBeNull();
  });

  it('handles an empty list', () => {
    const stats = computeStats([]);

    expect(stats.total).toBe(0);
    expect(stats.topGenre).toBeNull();
    expect(stats.topStudio).toBeNull();
  });
});
