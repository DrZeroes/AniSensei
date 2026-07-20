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
