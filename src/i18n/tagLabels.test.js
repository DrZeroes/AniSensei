import { describe, expect, it } from 'vitest';
import { translateTag } from './tagLabels.js';

describe('translateTag', () => {
  it('translates a known AniList tag to its French label', () => {
    expect(translateTag('Time Skip')).toBe('Ellipse temporelle');
    expect(translateTag('Ensemble Cast')).toBe('Casting choral');
  });

  it('keeps established loanwords unchanged', () => {
    expect(translateTag('Isekai')).toBe('Isekai');
    expect(translateTag('Tsundere')).toBe('Tsundere');
  });

  it('falls back to the original value for an unknown tag', () => {
    expect(translateTag('Some Future Tag')).toBe('Some Future Tag');
  });
});
