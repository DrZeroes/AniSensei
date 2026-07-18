import { describe, expect, it } from 'vitest';
import {
  serializeList,
  parseImportedList,
  mergeLists,
  applyConflictResolutions,
} from './exportImport.js';

const entryA = {
  animeId: 1,
  title: 'A',
  status: 'vu',
  note: null,
  excluded: false,
  watchedAt: null,
  comment: '',
  addedAt: 't',
};
const entryB = {
  animeId: 2,
  title: 'B',
  status: 'a_voir',
  note: null,
  excluded: false,
  watchedAt: null,
  comment: '',
  addedAt: 't',
};

describe('serializeList / parseImportedList', () => {
  it('round-trips a list through JSON', () => {
    const json = serializeList([entryA]);
    expect(parseImportedList(json)).toEqual([entryA]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseImportedList('{not json')).toThrow('Fichier invalide');
  });

  it('throws when the JSON is not an array of valid entries', () => {
    expect(() => parseImportedList(JSON.stringify({ foo: 'bar' }))).toThrow('Fichier invalide');
  });
});

describe('mergeLists', () => {
  it('adds entries that only exist in the import', () => {
    const { merged, conflicts } = mergeLists([entryA], [entryB]);
    expect(merged).toEqual([entryA, entryB]);
    expect(conflicts).toEqual([]);
  });

  it('keeps identical entries without raising a conflict', () => {
    const { merged, conflicts } = mergeLists([entryA], [entryA]);
    expect(merged).toEqual([entryA]);
    expect(conflicts).toEqual([]);
  });

  it('reports a conflict when the same animeId differs', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    expect(conflicts).toEqual([{ animeId: 1, existing: entryA, imported: importedA }]);
    expect(merged).toEqual([entryA]);
  });
});

describe('applyConflictResolutions', () => {
  it('replaces entries where the resolution picks the imported version', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    const result = applyConflictResolutions(merged, conflicts, { 1: 'imported' });

    expect(result).toEqual([importedA]);
  });

  it('keeps the existing entry when the resolution picks existing', () => {
    const importedA = { ...entryA, status: 'a_voir' };
    const { merged, conflicts } = mergeLists([entryA], [importedA]);

    const result = applyConflictResolutions(merged, conflicts, { 1: 'existing' });

    expect(result).toEqual([entryA]);
  });
});
