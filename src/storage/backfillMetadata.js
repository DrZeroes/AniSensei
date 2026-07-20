import { getList, saveList } from './listStorage.js';
import { getAnimeDetails } from '../api/queries.js';

let inFlight = null;

// Refreshes list entries with legacy/incomplete metadata: entries added
// before tags were tracked (`tags === undefined`), and entries fetched
// before the AniList studios query was fixed to exclude producers/
// publishers/broadcasters (`studiosRefreshed !== true`). Safe to call from
// multiple pages at once — concurrent calls share the same in-flight fetch,
// and resolve to `null` (rather than re-saving an unchanged list) whenever
// there was nothing stale to begin with, so callers can skip re-rendering.
//
// Takes the list to check as a parameter (defaulting to a fresh getList())
// rather than always re-reading storage: a caller re-running this from a
// `useEffect` keyed on its own `list` state needs the staleness check to see
// its own just-applied update, which a fresh storage read may not reflect
// synchronously (e.g. in tests, where storage reads/writes are mocked).
export function backfillListMetadata(list = getList()) {
  if (inFlight) return inFlight;

  const stale = list.filter((entry) => entry.tags === undefined || entry.studiosRefreshed !== true);
  if (stale.length === 0) return Promise.resolve(null);

  inFlight = Promise.all(
    stale.map((entry) =>
      getAnimeDetails(entry.animeId)
        .then((details) => ({ animeId: entry.animeId, tags: details.tags, studios: details.studios }))
        .catch(() => null)
    )
  )
    .then((results) => {
      const fetched = results.filter(Boolean);
      if (fetched.length === 0) return null;
      let updated = getList();
      for (const { animeId, tags, studios } of fetched) {
        updated = updated.map((entry) =>
          entry.animeId === animeId ? { ...entry, tags, studios, studiosRefreshed: true } : entry
        );
      }
      saveList(updated);
      return updated;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
