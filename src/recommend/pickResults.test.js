import { describe, expect, it } from 'vitest';
import { pickWeighted } from './pickResults.js';

const pool = [
  { media: { id: 1 }, score: 10 },
  { media: { id: 2 }, score: 5 },
  { media: { id: 3 }, score: 1 },
];

describe('pickWeighted', () => {
  it('picks the requested count when enough candidates are available', () => {
    const { picked, exhausted } = pickWeighted(pool, 2, [], () => 0);
    expect(picked).toHaveLength(2);
    expect(exhausted).toBe(false);
  });

  it('excludes ids already shown', () => {
    const { picked } = pickWeighted(pool, 3, [1], () => 0);
    expect(picked.map((entry) => entry.media.id)).not.toContain(1);
  });

  it('reports exhausted when fewer candidates remain than requested', () => {
    const { picked, exhausted } = pickWeighted(pool, 5, [], () => 0);
    expect(picked).toHaveLength(3);
    expect(exhausted).toBe(true);
  });

  it('never returns duplicate entries', () => {
    const { picked } = pickWeighted(pool, 3, [], () => 0.999);
    const ids = picked.map((entry) => entry.media.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
