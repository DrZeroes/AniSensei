import { describe, expect, it } from 'vitest';
import { groupFranchises } from './groupFranchises.js';

function ids(group) {
  return group.entries.map((entry) => entry.animeId).sort((a, b) => a - b);
}

describe('groupFranchises', () => {
  it('groups Berserk entries despite year/number/subtitle differences', () => {
    const entries = [
      { animeId: 1, title: 'Berserk (2016)' },
      { animeId: 2, title: 'BERSERK 2' },
      { animeId: 3, title: 'Berserk: The Golden Age Arc I - Egg of the King' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(1);
    expect(ids(groups[0])).toEqual([1, 2, 3]);
  });

  it('groups the whole "When They Cry" family transitively, including Umineko', () => {
    const entries = [
      { animeId: 1, title: 'Higurashi When They Cry GOU' },
      { animeId: 2, title: 'When They Cry' },
      { animeId: 3, title: 'When They Cry Kai' },
      { animeId: 4, title: 'When They Cry Rei' },
      { animeId: 5, title: 'Umineko When They Cry' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(1);
    expect(ids(groups[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it('groups Fate entries on the shared "Fate" token alone', () => {
    const entries = [
      { animeId: 1, title: 'Fate/stay night' },
      { animeId: 2, title: 'Fate/Zero' },
      { animeId: 3, title: 'Fate/kaleid liner Prisma Illya' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(1);
    expect(ids(groups[0])).toEqual([1, 2, 3]);
  });

  it('does not group unrelated titles that merely share one short, common word', () => {
    const entries = [
      { animeId: 1, title: 'One Piece' },
      { animeId: 2, title: 'One Punch Man' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.entries.length === 1)).toBe(true);
  });

  it('keeps a fully unrelated title on its own', () => {
    const entries = [
      { animeId: 1, title: 'Kara no Kyoukai: Fukan Fuukei' },
      { animeId: 2, title: 'Kara no Kyoukai: Mirai Fukuin' },
      { animeId: 3, title: 'Naruto' },
    ];

    const groups = groupFranchises(entries);

    expect(groups).toHaveLength(2);
    const naruto = groups.find((group) => group.entries.length === 1);
    expect(naruto.entries[0].animeId).toBe(3);
  });
});
