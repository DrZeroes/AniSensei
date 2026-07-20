function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.animeId === 'number' &&
    typeof entry.title === 'string'
  );
}

export function serializeList(list, customGroups = []) {
  return JSON.stringify({ list, customGroups }, null, 2);
}

export function parseImportedList(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Fichier invalide');
  }

  // Older exports were a bare array of entries, with no custom groups.
  if (Array.isArray(parsed)) {
    if (!parsed.every(isValidEntry)) throw new Error('Fichier invalide');
    return { list: parsed, customGroups: [] };
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.list) || !parsed.list.every(isValidEntry)) {
    throw new Error('Fichier invalide');
  }

  return { list: parsed.list, customGroups: Array.isArray(parsed.customGroups) ? parsed.customGroups : [] };
}

export function mergeLists(currentList, importedList) {
  const merged = [...currentList];
  const conflicts = [];

  for (const imported of importedList) {
    const index = merged.findIndex((item) => item.animeId === imported.animeId);

    if (index === -1) {
      merged.push(imported);
      continue;
    }

    const existing = merged[index];
    if (JSON.stringify(existing) === JSON.stringify(imported)) {
      continue;
    }

    conflicts.push({ animeId: imported.animeId, existing, imported });
  }

  return { merged, conflicts };
}

export function applyConflictResolutions(merged, conflicts, resolutions) {
  return merged.map((entry) => {
    const conflict = conflicts.find((c) => c.animeId === entry.animeId);
    if (!conflict) return entry;

    const choice = resolutions[entry.animeId];
    return choice === 'imported' ? conflict.imported : conflict.existing;
  });
}
