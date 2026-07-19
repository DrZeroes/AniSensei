import { describe, expect, it } from 'vitest';
import { buildCandidatePool } from './buildPool.js';

const base = { id: 1, genres: ['Action'], studios: ['Ufotable'] };
const candidateA = { id: 2, genres: ['Action'], studios: ['Ufotable'] };
const candidateB = { id: 3, genres: ['Romance'], studios: [] };
const alreadySeen = { id: 4, genres: ['Action'], studios: ['Ufotable'] };

describe('buildCandidatePool', () => {
  it('scores and sorts candidates by relevance', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 10, media: candidateA },
        { rating: 5, media: candidateB },
      ],
    });

    expect(pool.map((entry) => entry.media.id)).toEqual([2, 3]);
  });

  it('excludes ids already in the base list or explicitly excluded', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 10, media: base },
        { rating: 10, media: alreadySeen },
      ],
      excludeIds: [4],
    });

    expect(pool).toEqual([]);
  });

  it('deduplicates candidates recommended by multiple base anime, keeping the higher score', () => {
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 0, media: candidateA },
        { rating: 50, media: candidateA },
      ],
    });

    expect(pool).toHaveLength(1);
    expect(pool[0].score).toBeCloseTo(10); // genre(2)+studio(3) + rating(50)*0.1
  });

  it('excludes candidates that have not aired yet', () => {
    const unreleased = { id: 5, genres: ['Action'], studios: ['Ufotable'], status: 'NOT_YET_RELEASED' };
    const pool = buildCandidatePool({
      baseList: [base],
      recommendationNodes: [
        { rating: 10, media: candidateA },
        { rating: 10, media: unreleased },
      ],
    });

    expect(pool.map((entry) => entry.media.id)).toEqual([2]);
  });

  it('caps the pool at 20 entries', () => {
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      rating: i,
      media: { id: 100 + i, genres: [], studios: [] },
    }));

    const pool = buildCandidatePool({ baseList: [], recommendationNodes: nodes });

    expect(pool).toHaveLength(20);
  });
});
