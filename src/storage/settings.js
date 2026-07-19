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

export function getGachaMode() {
  return Boolean(readSettings().gachaMode);
}

export function setGachaMode(enabled) {
  writeSettings({ ...readSettings(), gachaMode: Boolean(enabled) });
}
