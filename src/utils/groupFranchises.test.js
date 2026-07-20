import { describe, expect, it } from 'vitest';
import { franchiseKey, groupFranchises } from './groupFranchises.js';

describe('franchiseKey', () => {
  it('strips a colon-separated subtitle', () => {
    expect(franchiseKey('Kara no Kyoukai: Fukan Fuukei')).toBe('kara no kyoukai');
    expect(franchiseKey('Kara no Kyoukai: Mirai Fukuin')).toBe('kara no kyoukai');
  });

  it('strips "Season N" and "Nth Season" suffixes', () => {
    expect(franchiseKey('Attack on Titan Season 2')).toBe('attack on titan');
    expect(franchiseKey('Boku no Hero Academia 2nd Season')).toBe('boku no hero academia');
  });

  it('strips roman numeral suffixes', () => {
    expect(franchiseKey('Fate/kaleid liner Prisma Illya II')).toBe('fate/kaleid liner prisma illya');
  });

  it('leaves an unrelated title untouched', () => {
    expect(franchiseKey('One Piece')).toBe('one piece');
  });

  it('falls back to the full title when stripping would leave something too short', () => {
    expect(franchiseKey('K: Season 2')).toBe('k: season 2');
  });
});

describe('groupFranchises', () => {
  it('groups entries that share a franchise key, preserving first-seen order', () => {
    const entries = [
      { animeId: 1, title: 'Kara no Kyoukai: Fukan Fuukei' },
      { animeId: 2, title: 'One Piece' },
      { animeId: 3, title: 'Kara no Kyoukai: Mirai Fukuin' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map((e) => e.animeId)).toEqual([1, 3]);
    expect(groups[1].entries.map((e) => e.animeId)).toEqual([2]);
  });

  it('keeps unrelated titles in their own single-entry group', () => {
    const entries = [
      { animeId: 1, title: 'Fate/stay night' },
      { animeId: 2, title: 'Fate/Zero' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.entries.length === 1)).toBe(true);
  });

  it('does not chain unrelated titles through an unrelated group', () => {
    const entries = [
      { animeId: 1, title: '5 Centimeters per Second' },
      { animeId: 2, title: 'Clannad' },
      { animeId: 3, title: 'Puella Magi Madoka Magica' },
      { animeId: 4, title: 'Spy x Family' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(4);
    expect(groups.every((group) => group.entries.length === 1)).toBe(true);
  });
});
