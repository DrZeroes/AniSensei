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
  it('classifies scores into the right tier', () => {
    expect(rarityFor(0).id).toBe('common');
    expect(rarityFor(6.9).id).toBe('common');
    expect(rarityFor(7).id).toBe('rare');
    expect(rarityFor(14.9).id).toBe('rare');
    expect(rarityFor(15).id).toBe('epic');
    expect(rarityFor(24.9).id).toBe('epic');
    expect(rarityFor(25).id).toBe('legendary');
    expect(rarityFor(100).id).toBe('legendary');
  });
});
