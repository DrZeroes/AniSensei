import { beforeEach, describe, expect, it } from 'vitest';
import { getGachaMode, setGachaMode } from './settings.js';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults gacha mode to true when nothing is stored', () => {
    expect(getGachaMode()).toBe(true);
  });

  it('persists an explicit false (turning it off) across calls', () => {
    setGachaMode(false);
    expect(getGachaMode()).toBe(false);

    setGachaMode(true);
    expect(getGachaMode()).toBe(true);
  });

  it('falls back to the default (true) when stored data is corrupted', () => {
    localStorage.setItem('aniSensei.settings', '{not valid json');
    expect(getGachaMode()).toBe(true);
  });
});
