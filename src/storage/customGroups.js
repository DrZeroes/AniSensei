export const STORAGE_KEY = 'aniSensei.customGroups';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `group-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function getCustomGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Groupes personnalisés illisibles, réinitialisation.', error);
    return [];
  }
}

export function saveCustomGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.warn('Impossible de sauvegarder les groupes personnalisés.', error);
  }
  return groups;
}

// entry: { id?, title, animeIds, coverAnimeId }. Creates a new group when id is
// absent, otherwise replaces the group with that id.
export function upsertCustomGroup(entry) {
  const groups = getCustomGroups();
  const id = entry.id ?? generateId();
  const group = { id, title: entry.title, animeIds: entry.animeIds, coverAnimeId: entry.coverAnimeId ?? null };
  const index = groups.findIndex((existing) => existing.id === id);
  const updated = index === -1 ? [...groups, group] : groups.map((existing, i) => (i === index ? group : existing));
  return saveCustomGroups(updated);
}

export function removeCustomGroup(id) {
  return saveCustomGroups(getCustomGroups().filter((group) => group.id !== id));
}
