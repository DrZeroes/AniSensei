import { beforeEach, describe, expect, it } from 'vitest';
import { getList, upsertAnime, removeAnime, STORAGE_KEY } from './listStorage.js';

describe('listStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getList()).toEqual([]);
  });

  it('returns an empty array when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(getList()).toEqual([]);
  });

  it('creates a new entry with defaults on first upsert', () => {
    const list = upsertAnime({ animeId: 21, title: 'One Piece', genres: ['Action'] });

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      animeId: 21,
      title: 'One Piece',
      genres: ['Action'],
      studios: [],
      studiosRefreshed: true,
      tags: [],
      seasonYear: null,
      status: 'a_voir',
      note: null,
      excluded: false,
      watchedAt: null,
      comment: '',
    });
    expect(list[0].addedAt).toBeTruthy();
  });

  it('stores tags when provided', () => {
    const list = upsertAnime({ animeId: 21, title: 'One Piece', tags: ['Pirates', 'Time Skip'] });

    expect(list[0].tags).toEqual(['Pirates', 'Time Skip']);
  });

  it('merges fields into an existing entry on subsequent upsert', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    const list = upsertAnime({ animeId: 21, status: 'vu', note: 'coup_de_coeur' });

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ status: 'vu', note: 'coup_de_coeur', title: 'One Piece' });
  });

  it('removes an entry by animeId', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    const list = removeAnime(21);

    expect(list).toEqual([]);
  });

  it('persists across calls via localStorage', () => {
    upsertAnime({ animeId: 21, title: 'One Piece' });
    expect(getList()).toHaveLength(1);
  });
});
