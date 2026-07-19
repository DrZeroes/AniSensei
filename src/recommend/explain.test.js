import { describe, expect, it } from 'vitest';
import { explainMatch, buildScoreTooltip } from './explain.js';

const base = { id: 1, genres: ['Action', 'Fantasy'], studios: ['Ufotable'] };
const favorite = { id: 2, genres: ['Fantasy'], studios: [] };

describe('explainMatch', () => {
  it('lists shared genres and studios', () => {
    const candidate = { genres: ['Action'], studios: ['Ufotable'] };
    expect(explainMatch(candidate, [base])).toBe('Points communs — genres : Action · studio : Ufotable');
  });

  it('falls back to a generic reason when nothing overlaps', () => {
    const candidate = { genres: ['Romance'], studios: [] };
    expect(explainMatch(candidate, [base])).toBe('Recommandation basée sur la communauté AniList');
  });
});

describe('buildScoreTooltip', () => {
  it('lists each contributing genre/studio with its point value', () => {
    const candidate = { genres: ['Action'], studios: ['Ufotable'] };
    const tooltip = buildScoreTooltip(candidate, [base]);

    expect(tooltip).toContain('genre "Action" x1 : +2');
    expect(tooltip).toContain('studio "Ufotable" x1 : +3');
    expect(tooltip).toContain('Sous-total genres/studios : 5.0');
  });

  it('includes a smaller-weighted line for favorites overlap', () => {
    const candidate = { genres: ['Fantasy'], studios: [] };
    const tooltip = buildScoreTooltip(candidate, [], [favorite]);

    expect(tooltip).toContain('Coups de cœur — genre "Fantasy" x1 : +1');
    expect(tooltip).toContain('Sous-total genres/studios : 1.0');
  });

  it('says so when nothing overlaps', () => {
    const candidate = { genres: ['Romance'], studios: [] };
    expect(buildScoreTooltip(candidate, [base])).toContain('Aucun genre/studio en commun trouvé.');
  });
});
