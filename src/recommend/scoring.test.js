import { describe, expect, it } from 'vitest';
import { scoreCandidate } from './scoring.js';

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
