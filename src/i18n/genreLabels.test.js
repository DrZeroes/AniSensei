import { describe, expect, it } from 'vitest';
import { translateGenre } from './genreLabels.js';

describe('translateGenre', () => {
  it('translates a known AniList genre to its French label', () => {
    expect(translateGenre('Slice of Life')).toBe('Tranche de vie');
    expect(translateGenre('Sci-Fi')).toBe('Science-fiction');
  });

  it('falls back to the original value for an unknown genre', () => {
    expect(translateGenre('Isekai')).toBe('Isekai');
  });
});
