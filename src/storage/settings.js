const STORAGE_KEY = 'aniSensei.settings';

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Préférences locales illisibles, réinitialisation.', error);
    return {};
  }
}

function writeSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Impossible de sauvegarder les préférences locales.', error);
  }
}

// Defaults to on when the user has never touched the setting; an explicit
// `false` (they turned it off) is preserved via nullish coalescing.
export function getGachaMode() {
  return readSettings().gachaMode ?? true;
}

export function setGachaMode(enabled) {
  writeSettings({ ...readSettings(), gachaMode: Boolean(enabled) });
}
