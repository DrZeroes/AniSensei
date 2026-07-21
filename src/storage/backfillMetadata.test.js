import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backfillListMetadata } from './backfillMetadata.js';
import { getList, saveList } from './listStorage.js';
import { getAnimeDetails } from '../api/queries.js';

vi.mock('../api/queries.js', () => ({
  getAnimeDetails: vi.fn(),
}));

const freshEntry = {
  animeId: 1,
  title: 'One Piece',
  tags: ['Pirates'],
  studios: ['Toei Animation'],
  studiosRefreshed: true,
};

describe('backfillListMetadata', () => {
  beforeEach(() => {
    localStorage.clear();
    getAnimeDetails.mockReset();
  });

  it('resolves to null and does not call the API when nothing is stale', async () => {
    saveList([freshEntry]);

    const result = await backfillListMetadata();

    expect(result).toBeNull();
    expect(getAnimeDetails).not.toHaveBeenCalled();
  });

  it('refreshes entries missing tags or not yet marked studiosRefreshed', async () => {
    const staleEntry = { ...freshEntry, animeId: 2, studiosRefreshed: undefined, studios: ['Toei Animation', 'Aniplex'] };
    saveList([freshEntry, staleEntry]);
    getAnimeDetails.mockResolvedValue({ tags: ['Pirates'], studios: ['Toei Animation'] });

    const result = await backfillListMetadata();

    expect(getAnimeDetails).toHaveBeenCalledTimes(1);
    expect(getAnimeDetails).toHaveBeenCalledWith(2);
    expect(result.find((entry) => entry.animeId === 2)).toMatchObject({
      studios: ['Toei Animation'],
      studiosRefreshed: true,
    });
    expect(getList()).toEqual(result);
  });

  it('processes every stale entry one at a time, not all at once', async () => {
    const staleEntries = [2, 3, 4].map((animeId) => ({
      ...freshEntry,
      animeId,
      studiosRefreshed: undefined,
      studios: ['Aniplex'],
    }));
    saveList([freshEntry, ...staleEntries]);
    getAnimeDetails.mockImplementation((animeId) =>
      Promise.resolve({ tags: ['Pirates'], studios: [`Real Studio ${animeId}`] })
    );

    const result = await backfillListMetadata();

    expect(getAnimeDetails).toHaveBeenCalledTimes(3);
    for (const animeId of [2, 3, 4]) {
      expect(result.find((entry) => entry.animeId === animeId)).toMatchObject({
        studios: [`Real Studio ${animeId}`],
        studiosRefreshed: true,
      });
    }
  });

  it('leaves an entry stale (for the next run) if fetching its details fails, without losing others', async () => {
    const staleEntries = [2, 3].map((animeId) => ({
      ...freshEntry,
      animeId,
      studiosRefreshed: undefined,
    }));
    saveList([...staleEntries]);
    getAnimeDetails.mockImplementation((animeId) =>
      animeId === 2 ? Promise.reject(new Error('network')) : Promise.resolve({ tags: [], studios: ['ufotable'] })
    );

    const result = await backfillListMetadata();

    expect(result.find((entry) => entry.animeId === 2).studiosRefreshed).not.toBe(true);
    expect(result.find((entry) => entry.animeId === 3)).toMatchObject({ studiosRefreshed: true });
  });

  it('shares a single in-flight fetch across concurrent calls', async () => {
    const staleEntry = { ...freshEntry, animeId: 2, studiosRefreshed: undefined };
    saveList([staleEntry]);
    let resolveDetails;
    getAnimeDetails.mockReturnValue(
      new Promise((resolve) => {
        resolveDetails = resolve;
      })
    );

    const first = backfillListMetadata();
    const second = backfillListMetadata();
    resolveDetails({ tags: ['Pirates'], studios: ['Toei Animation'] });

    await Promise.all([first, second]);

    expect(getAnimeDetails).toHaveBeenCalledTimes(1);
  });
});
