import { beforeEach, describe, expect, it } from 'vitest';
import { getCustomGroups, upsertCustomGroup, removeCustomGroup, STORAGE_KEY } from './customGroups.js';

describe('customGroups', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getCustomGroups()).toEqual([]);
  });

  it('returns an empty array when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(getCustomGroups()).toEqual([]);
  });

  it('creates a new group with a generated id on first upsert', () => {
    const groups = upsertCustomGroup({ title: 'Fate', animeIds: [1, 2, 3], coverAnimeId: 2 });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ title: 'Fate', animeIds: [1, 2, 3], coverAnimeId: 2 });
    expect(groups[0].id).toBeTruthy();
  });

  it('replaces an existing group when the same id is upserted again', () => {
    const [created] = upsertCustomGroup({ title: 'Fate', animeIds: [1, 2] });
    const updated = upsertCustomGroup({ id: created.id, title: 'Fate/', animeIds: [1, 2, 3] });

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: created.id, title: 'Fate/', animeIds: [1, 2, 3] });
  });

  it('removes a group by id', () => {
    const [created] = upsertCustomGroup({ title: 'Fate', animeIds: [1, 2] });
    const groups = removeCustomGroup(created.id);

    expect(groups).toEqual([]);
  });

  it('persists across calls via localStorage', () => {
    upsertCustomGroup({ title: 'Fate', animeIds: [1, 2] });
    expect(getCustomGroups()).toHaveLength(1);
  });
});
