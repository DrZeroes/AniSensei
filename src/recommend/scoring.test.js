import { describe, expect, it } from 'vitest';
import { scoreCandidate, rarityFor } from './scoring.js';

const base = { id: 1, genres: ['Action', 'Fantasy'], studios: ['Ufotable'] };
const favorite = { id: 2, genres: ['Fantasy'], studios: ['Ufotable'] };

describe('scoreCandidate', () => {
  it('scores zero when there is no overlap', () => {
    const candidate = { id: 3, genres: ['Romance'], studios: ['Kyoto Animation'] };
    expect(scoreCandidate(candidate, [base])).toBe(0);
  });

  it('adds weighted points for genre and studio overlap with the base list', () => {
    const candidate = { id: 3, genres: ['Action'], studios: ['Ufotable'] };
    expect(scoreCandidate(candidate, [base])).toBe(5); // 1*2 + 1*3
  });

  it('adds a smaller bonus for overlap with the favorites list', () => {
    const candidate = { id: 3, genres: ['Fantasy'], studios: [] };
    expect(scoreCandidate(candidate, [base], [favorite])).toBe(3); // base: 1*2, favorite: 1*1
  });
});

describe('rarityFor', () => {
  const poolScores = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5];

  it('gives the top-ranked score the legendary tier', () => {
    expect(rarityFor(50, poolScores).id).toBe('legendary');
  });

  it('gives a mid-pack score the rare tier', () => {
    expect(rarityFor(25, poolScores).id).toBe('rare');
  });

  it('gives the lowest-ranked score the common tier', () => {
    expect(rarityFor(5, poolScores).id).toBe('common');
  });

  it('defaults to common when there is no pool to compare against', () => {
    expect(rarityFor(999, []).id).toBe('common');
  });

  it('is not skewed by unbounded scores, unlike a fixed absolute threshold would be', () => {
    // Regression: scores are unbounded (AniList's community "rating" on a
    // recommendation can add dozens of points by itself for very popular
    // titles), so a fixed cutoff like "score >= 25" made nearly every result
    // "Légendaire" for a popular base anime. Ranking within the pool keeps a
    // spread across tiers even when every raw score is huge.
    const hugePool = [320, 310, 300, 290, 280, 270, 260, 250, 240, 230];
    expect(rarityFor(320, hugePool).id).toBe('legendary');
    expect(rarityFor(270, hugePool).id).not.toBe('legendary');
    expect(rarityFor(230, hugePool).id).toBe('common');
  });
});
