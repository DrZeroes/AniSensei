import { beforeEach, describe, expect, it } from 'vitest';
import { getGachaMode, setGachaMode } from './settings.js';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults gacha mode to false when nothing is stored', () => {
    expect(getGachaMode()).toBe(false);
  });

  it('persists gacha mode across calls', () => {
    setGachaMode(true);
    expect(getGachaMode()).toBe(true);

    setGachaMode(false);
    expect(getGachaMode()).toBe(false);
  });

  it('falls back to defaults when stored data is corrupted', () => {
    localStorage.setItem('aniSensei.settings', '{not valid json');
    expect(getGachaMode()).toBe(false);
  });
});
