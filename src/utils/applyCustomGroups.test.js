import { describe, expect, it } from 'vitest';
import { applyCustomGroups } from './applyCustomGroups.js';

describe('applyCustomGroups', () => {
  it('leaves entries with no custom group as their own single-entry block', () => {
    const entries = [
      { animeId: 1, title: 'One Piece' },
      { animeId: 2, title: 'Naruto' },
    ];

    const blocks = applyCustomGroups(entries, []);

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.entries.length === 1 && block.custom === null)).toBe(true);
  });

  it('does not group titles that merely share a common word absent a custom group', () => {
    const entries = [
      { animeId: 1, title: '5 Centimeters per Second' },
      { animeId: 2, title: 'Clannad' },
      { animeId: 3, title: 'Puella Magi Madoka Magica' },
    ];

    const blocks = applyCustomGroups(entries, []);

    expect(blocks).toHaveLength(3);
  });

  it('groups entries that belong to the same custom group, ordered by the group animeIds', () => {
    const entries = [
      { animeId: 1, title: 'Fate/Zero' },
      { animeId: 2, title: 'Fate/stay night' },
      { animeId: 3, title: 'Naruto' },
    ];
    const group = { id: 'g1', title: 'Fate', animeIds: [2, 1], coverAnimeId: 2 };

    const blocks = applyCustomGroups(entries, [group]);

    expect(blocks).toHaveLength(2);
    const fateBlock = blocks.find((block) => block.custom?.id === 'g1');
    expect(fateBlock.entries.map((entry) => entry.animeId)).toEqual([2, 1]);
    const narutoBlock = blocks.find((block) => block.custom === null);
    expect(narutoBlock.entries[0].animeId).toBe(3);
  });

  it('omits group members that are not present in the given entries', () => {
    const entries = [{ animeId: 1, title: 'Fate/Zero' }];
    const group = { id: 'g1', title: 'Fate', animeIds: [2, 1], coverAnimeId: 2 };

    const blocks = applyCustomGroups(entries, [group]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].entries.map((entry) => entry.animeId)).toEqual([1]);
  });
});
