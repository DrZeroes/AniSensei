import { describe, expect, it } from 'vitest';
import { computeStats } from './computeStats.js';

const watchedFavorite = {
  animeId: 1,
  status: 'vu',
  note: 'coup_de_coeur',
  excluded: false,
  genres: ['Action', 'Fantasy'],
  studios: ['Ufotable'],
  tags: ['Time Skip', 'Tsundere'],
};
const watchedLiked = {
  animeId: 2,
  status: 'vu',
  note: 'aime',
  excluded: false,
  genres: ['Action'],
  studios: ['Ufotable'],
  tags: ['Time Skip'],
};
const watchedDisliked = {
  animeId: 3,
  status: 'vu',
  note: 'pas_aime',
  excluded: false,
  genres: ['Romance'],
  studios: ['Toei Animation'],
  tags: ['Ensemble Cast'],
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

  it('returns a tag breakdown from watched anime, sorted by count descending', () => {
    const stats = computeStats([watchedFavorite, watchedLiked, watchedDisliked]);

    expect(stats.tagCounts).toEqual([
      ['Time Skip', 2],
      ['Tsundere', 1],
      ['Ensemble Cast', 1],
    ]);
  });

  it('returns a year breakdown from watched anime, sorted chronologically (not by count)', () => {
    const stats = computeStats([
      { ...watchedFavorite, seasonYear: 2016 },
      { ...watchedLiked, seasonYear: 1999 },
      { ...watchedDisliked, seasonYear: 1999 },
    ]);

    expect(stats.yearCounts).toEqual([
      [1999, 2],
      [2016, 1],
    ]);
  });

  it('excludes watched entries with no known season year from the year breakdown', () => {
    const stats = computeStats([{ ...watchedFavorite, seasonYear: null }]);

    expect(stats.yearCounts).toEqual([]);
  });

  it('caps the tag breakdown to the top 20', () => {
    const manyTagEntries = Array.from({ length: 25 }, (_, i) => ({
      animeId: 100 + i,
      status: 'vu',
      note: null,
      excluded: false,
      genres: [],
      studios: [],
      tags: [`Tag ${i}`, 'Shared'],
    }));

    const stats = computeStats(manyTagEntries);

    expect(stats.tagCounts).toHaveLength(20);
    expect(stats.tagCounts[0]).toEqual(['Shared', 25]);
  });
});
