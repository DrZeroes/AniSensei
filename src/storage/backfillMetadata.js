import { getList, saveList } from './listStorage.js';
import { getAnimeDetails } from '../api/queries.js';

let inFlight = null;

// One request at a time, with a pause in between: AniList rate-limits
// anonymous requests, and in practice a 429 sometimes comes back with no
// CORS headers at all, which the browser reports as a plain failed fetch —
// indistinguishable from a real network error, and impossible to read a
// Retry-After from. Firing every stale entry's fetch at once via Promise.all
// got most of them 429'd and silently dropped (caught, then never retried),
// which is why large lists only ever got partially backfilled. Even at one
// request every 700ms this still happened, so the delay is deliberately
// conservative — and backs off further after a failure, since that's the
// clearest sign the current pace is still too fast.
const REQUEST_DELAY_MS = 2500;
const FAILURE_BACKOFF_MS = 5000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBackfill(stale) {
  // Tracks the last successfully saved list directly, rather than re-reading
  // getList() once at the end — storage reads/writes are mocked as plain
  // stubs in some tests (no real persistence), and even in production a
  // fresh read isn't needed here since each iteration already re-reads
  // before applying its own change.
  let latestList = null;
  for (let i = 0; i < stale.length; i += 1) {
    const entry = stale[i];
    let failed = false;
    // TEMPORARY DEBUG LOG — maps the anime id in the request log to a title.
    console.log(`[Backfill] ${i + 1}/${stale.length} — "${entry.title}" (id: ${entry.animeId})`);
    try {
      const details = await getAnimeDetails(entry.animeId);
      const updated = getList().map((item) =>
        item.animeId === entry.animeId
          ? { ...item, tags: details.tags, studios: details.studios, studiosRefreshed: true }
          : item
      );
      saveList(updated);
      latestList = updated;
    } catch {
      // Left as-is; picked up again by the next backfill run.
      failed = true;
    }
    if (i < stale.length - 1) await wait(failed ? FAILURE_BACKOFF_MS : REQUEST_DELAY_MS);
  }
  return latestList;
}

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

  inFlight = runBackfill(stale).finally(() => {
    inFlight = null;
  });

  return inFlight;
}
