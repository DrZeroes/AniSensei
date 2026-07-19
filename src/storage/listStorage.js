export const STORAGE_KEY = 'aniSensei.list';

export function getList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Liste locale illisible, réinitialisation.', error);
    return [];
  }
}

export function saveList(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn('Impossible de sauvegarder la liste locale.', error);
  }
}

export function upsertAnime(entry) {
  const list = getList();
  const index = list.findIndex((item) => item.animeId === entry.animeId);

  if (index === -1) {
    const newEntry = {
      animeId: entry.animeId,
      title: entry.title ?? '',
      coverImage: entry.coverImage ?? null,
      genres: entry.genres ?? [],
      studios: entry.studios ?? [],
      seasonYear: entry.seasonYear ?? null,
      status: entry.status ?? 'a_voir',
      note: entry.note ?? null,
      excluded: entry.excluded ?? false,
      watchedAt: entry.watchedAt ?? null,
      comment: entry.comment ?? '',
      addedAt: new Date().toISOString(),
    };
    const updated = [...list, newEntry];
    saveList(updated);
    return updated;
  }

  const updated = [...list];
  updated[index] = { ...updated[index], ...entry };
  saveList(updated);
  return updated;
}

export function removeAnime(animeId) {
  const updated = getList().filter((item) => item.animeId !== animeId);
  saveList(updated);
  return updated;
}
