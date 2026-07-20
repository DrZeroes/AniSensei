// Only groups entries that the user has explicitly put together in a custom
// group (see src/storage/customGroups.js) — no automatic title-guessing, since
// that used to merge unrelated anime that happened to share a common word.
// Entries within a group are ordered by the group's own animeIds order (the
// user can reorder them), not by their position in the input list.
export function applyCustomGroups(entries, customGroups) {
  const customByAnimeId = new Map();
  for (const group of customGroups) {
    for (const animeId of group.animeIds) customByAnimeId.set(animeId, group);
  }

  const seenGroupIds = new Set();
  const blocks = [];
  for (const entry of entries) {
    const group = customByAnimeId.get(entry.animeId);
    if (!group) {
      blocks.push({ key: `entry-${entry.animeId}`, entries: [entry], custom: null });
      continue;
    }
    if (seenGroupIds.has(group.id)) continue;
    seenGroupIds.add(group.id);
    const members = group.animeIds
      .map((animeId) => entries.find((entry_) => entry_.animeId === animeId))
      .filter(Boolean);
    blocks.push({ key: `custom-${group.id}`, entries: members, custom: group });
  }
  return blocks;
}
