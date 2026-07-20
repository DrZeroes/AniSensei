import { describe, expect, it } from 'vitest';
import { explainMatch, buildScoreTooltip } from './explain.js';

const base = { id: 1, genres: ['Action', 'Fantasy'], studios: ['Ufotable'], tags: ['Time Skip'] };
const favorite = { id: 2, genres: ['Fantasy'], studios: [], tags: [] };

describe('explainMatch', () => {
  it('lists shared genres and studios', () => {
    const candidate = { genres: ['Action'], studios: ['Ufotable'], tags: [] };
    expect(explainMatch(candidate, [base])).toBe('Points communs — genres : Action · studio : Ufotable');
  });

  it('lists shared tags too, capped to 3 with a "+N" suffix for the rest', () => {
    const manyTagsBase = { ...base, tags: ['A', 'B', 'C', 'D', 'E'] };
    const candidate = { genres: [], studios: [], tags: ['A', 'B', 'C', 'D', 'E'] };
    expect(explainMatch(candidate, [manyTagsBase])).toBe('Points communs — tags : A, B, C (+2)');
  });

  it('falls back to a generic reason when nothing overlaps', () => {
    const candidate = { genres: ['Romance'], studios: [], tags: [] };
    expect(explainMatch(candidate, [base])).toBe('Recommandation basée sur la communauté AniList');
  });
});

describe('buildScoreTooltip', () => {
  it('lists each contributing genre/studio with its point value', () => {
    const candidate = { genres: ['Action'], studios: ['Ufotable'], tags: [] };
    const tooltip = buildScoreTooltip(candidate, [base]);

    expect(tooltip).toContain('genre "Action" x1 : +2');
    expect(tooltip).toContain('studio "Ufotable" x1 : +3');
    expect(tooltip).toContain('Sous-total genres/studios/tags : 5.0');
  });

  it('aggregates tag overlap into a single line', () => {
    const candidate = { genres: [], studios: [], tags: ['Time Skip'] };
    const tooltip = buildScoreTooltip(candidate, [base]);

    expect(tooltip).toContain('Animes de base — 1 tag(s) en commun : +0.5');
    expect(tooltip).toContain('Sous-total genres/studios/tags : 0.5');
  });

  it('includes a smaller-weighted line for favorites overlap', () => {
    const candidate = { genres: ['Fantasy'], studios: [], tags: [] };
    const tooltip = buildScoreTooltip(candidate, [], [favorite]);

    expect(tooltip).toContain('Coups de cœur — genre "Fantastique" x1 : +1');
    expect(tooltip).toContain('Sous-total genres/studios/tags : 1.0');
  });

  it('says so when nothing overlaps', () => {
    const candidate = { genres: ['Romance'], studios: [], tags: [] };
    expect(buildScoreTooltip(candidate, [base])).toContain('Aucun genre/studio/tag en commun trouvé.');
  });
});
