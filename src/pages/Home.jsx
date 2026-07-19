import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import AnimeCard from '../components/AnimeCard.jsx';
import ChecklistSection from '../components/ChecklistSection.jsx';
import { fetchRecommendationData, fetchMoreCandidates, getExcludedIds } from '../recommend/fetchRecommendationData.js';
import { fetchDiscoveryPick, pickDominantGenre } from '../recommend/discovery.js';
import { pickWeighted } from '../recommend/pickResults.js';
import { explainMatch, buildScoreTooltip } from '../recommend/explain.js';
import { rarityFor } from '../recommend/scoring.js';
import { getList, upsertAnime } from '../storage/listStorage.js';
import { getGachaMode, setGachaMode } from '../storage/settings.js';

function bonusReasonFor(baseList) {
  const genre = pickDominantGenre(baseList);
  return genre
    ? `Pépite peu connue du genre "${genre}", en dehors du top des plus populaires — pour sortir des sentiers battus.`
    : 'Pépite peu connue, en dehors du top des plus populaires — pour sortir des sentiers battus.';
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Safety net so a "Voir d'autres" click can't loop through an unbounded number
// of AniList pages if the genre's catalogue is nearly exhausted of unseen anime.
const MAX_SUPPLEMENT_PAGES_PER_CLICK = 5;

function mergeCandidates(pool, extra) {
  const byId = new Map(pool.map((entry) => [entry.media.id, entry]));
  for (const entry of extra) {
    const existing = byId.get(entry.media.id);
    if (!existing || existing.score < entry.score) byId.set(entry.media.id, entry);
  }
  return Array.from(byId.values());
}

function entryToMediaSummary(entry) {
  return {
    id: entry.animeId,
    title: entry.title,
    coverImage: entry.coverImage,
    genres: entry.genres,
    studios: entry.studios,
    seasonYear: entry.seasonYear,
  };
}

function Home() {
  const navigate = useNavigate();
  const [baseAnimes, setBaseAnimes] = useState([]);
  const [baseList, setBaseList] = useState([]);
  const [favoritesList, setFavoritesList] = useState([]);
  const [pool, setPool] = useState([]);
  const [poolPage, setPoolPage] = useState(1);
  const [shownIds, setShownIds] = useState([]);
  const [results, setResults] = useState([]);
  const [discoveryPick, setDiscoveryPick] = useState(null);
  const [discoveryShownIds, setDiscoveryShownIds] = useState([]);
  const [status, setStatus] = useState('idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastBaseIds, setLastBaseIds] = useState([]);
  const [markedEntries, setMarkedEntries] = useState({});
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [seenExpanded, setSeenExpanded] = useState(false);
  const [gachaMode, setGachaModeState] = useState(() => getGachaMode());

  function toggleGachaMode() {
    setGachaModeState((prev) => {
      const next = !prev;
      setGachaMode(next);
      return next;
    });
  }

  const localList = getList();
  const byTitle = (a, b) => a.title.localeCompare(b.title);
  const favoriteEntries = localList.filter((entry) => entry.note === 'coup_de_coeur').sort(byTitle);
  // Anime already listed under "coups de cœur" aren't repeated here, even if also marked "vu".
  const seenEntries = localList
    .filter((entry) => entry.status === 'vu' && entry.note !== 'coup_de_coeur')
    .sort(byTitle);
  const selectedIds = baseAnimes.map((anime) => anime.id);

  function addBaseAnime(anime) {
    setBaseAnimes((prev) => (prev.some((a) => a.id === anime.id) ? prev : [...prev, anime]));
  }

  function removeBaseAnime(id) {
    setBaseAnimes((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleChecklistAnime(entry) {
    setBaseAnimes((prev) =>
      prev.some((a) => a.id === entry.animeId)
        ? prev.filter((a) => a.id !== entry.animeId)
        : [...prev, entryToMediaSummary(entry)]
    );
  }

  async function runRecommendation(baseAnimeIds) {
    setLastBaseIds(baseAnimeIds);
    setStatus('loading');
    try {
      const {
        pool: newPool,
        baseList: newBaseList,
        favoritesList: newFavoritesList,
        discoveryPick: newDiscoveryPick,
      } = await fetchRecommendationData(baseAnimeIds);
      const { picked } = pickWeighted(newPool, 5);
      setPool(newPool);
      setPoolPage(1);
      setBaseList(newBaseList);
      setFavoritesList(newFavoritesList);
      setShownIds(picked.map((entry) => entry.media.id));
      setResults(picked);
      setDiscoveryPick(newDiscoveryPick);
      setDiscoveryShownIds(newDiscoveryPick ? [newDiscoveryPick.media.id] : []);
      setStatus('idle');
    } catch (error) {
      setStatus(error.message === 'base_vide' ? 'empty_base' : 'error');
    }
  }

  function handleRecommend() {
    setFavoritesExpanded(false);
    setSeenExpanded(false);
    runRecommendation(baseAnimes.map((anime) => anime.id));
  }

  function handleReset() {
    setPool([]);
    setPoolPage(1);
    setShownIds([]);
    setResults([]);
    setDiscoveryPick(null);
    setDiscoveryShownIds([]);
    setStatus('idle');
  }

  async function handleSeeMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const excludeIds = getExcludedIds();
      let currentPool = pool;
      let page = poolPage;
      let { picked, exhausted } = pickWeighted(currentPool, 5, shownIds);

      // The initial pool (from AniList's community recommendations) is finite —
      // once it runs dry, keep pulling extra pages of popular genre-matched anime
      // so there's always something left to show.
      for (let attempt = 0; picked.length < 5 && exhausted && attempt < MAX_SUPPLEMENT_PAGES_PER_CLICK; attempt += 1) {
        const { candidates, genre } = await fetchMoreCandidates({ baseList, favoritesList, excludeIds, page });
        page += 1;
        if (!genre || candidates.length === 0) break;
        currentPool = mergeCandidates(currentPool, candidates);
        ({ picked, exhausted } = pickWeighted(currentPool, 5, shownIds));
      }

      setPool(currentPool);
      setPoolPage(page);

      const newShownIds = picked.map((entry) => entry.media.id);
      if (picked.length > 0) {
        setShownIds((prev) => [...prev, ...newShownIds]);
        setResults(picked);
      }
      setStatus(picked.length > 0 ? 'idle' : 'exhausted');

      // Always try to surface a fresh "Découverte" bonus alongside the new batch.
      const newDiscoveryPick = await fetchDiscoveryPick(baseList, favoritesList, [
        ...excludeIds,
        ...shownIds,
        ...newShownIds,
        ...discoveryShownIds,
      ]);
      if (newDiscoveryPick) {
        setDiscoveryPick(newDiscoveryPick);
        setDiscoveryShownIds((prev) => [...prev, newDiscoveryPick.media.id]);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  function handleAddSeen(anime) {
    upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      seasonYear: anime.seasonYear,
      status: 'vu',
    });
    setMarkedEntries((prev) => ({ ...prev, [anime.id]: { status: 'vu', excluded: false, note: null } }));
  }

  function handleExclude(anime) {
    upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      seasonYear: anime.seasonYear,
      excluded: true,
    });
    setMarkedEntries((prev) => ({
      ...prev,
      [anime.id]: { status: prev[anime.id]?.status ?? 'a_voir', excluded: true, note: null },
    }));
  }

  function renderCard(entry, { bonus = false } = {}) {
    return (
      <AnimeCard
        key={entry.media.id}
        anime={entry.media}
        listEntry={markedEntries[entry.media.id] ?? null}
        score={entry.score}
        reason={explainMatch(entry.media, baseList)}
        scoreDetail={buildScoreTooltip(entry.media, baseList, favoritesList)}
        bonus={bonus}
        bonusReason={bonus ? bonusReasonFor(baseList) : null}
        rarity={rarityFor(entry.score)}
        gacha={gachaMode}
        onAddSeen={handleAddSeen}
        onExclude={handleExclude}
        onClick={(anime) => navigate(`/anime/${anime.id}`)}
      />
    );
  }

  const hasSomethingToReset = results.length > 0 || discoveryPick !== null || status !== 'idle';

  // In gacha mode, the bonus card's position among the others is shuffled each
  // time the batch changes, so revealing it face-down gives no hint of where
  // it is. Outside gacha mode, order stays predictable (bonus card last).
  const displayedCards = useMemo(() => {
    const cards = [
      ...results.map((entry) => ({ entry, bonus: false })),
      ...(discoveryPick ? [{ entry: discoveryPick, bonus: true }] : []),
    ];
    return gachaMode ? shuffled(cards) : cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, discoveryPick, gachaMode]);

  return (
    <section>
      <h2>Recommandation</h2>

      <div className="base-picker">
        <SearchBar onSelect={addBaseAnime} onQuickAddSeen={handleAddSeen} />

        {baseAnimes.length > 0 && (
          <ul className="base-picker__selected">
            {baseAnimes.map((anime) => (
              <li key={anime.id}>
                {anime.title}
                <button
                  type="button"
                  onClick={() => removeBaseAnime(anime.id)}
                  aria-label={`Retirer ${anime.title}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="base-picker__checklists">
          <ChecklistSection
            title="Mes coups de cœur"
            entries={favoriteEntries}
            selectedIds={selectedIds}
            onToggle={toggleChecklistAnime}
            expanded={favoritesExpanded}
            onToggleExpanded={() => setFavoritesExpanded((prev) => !prev)}
          />
          <ChecklistSection
            title="Mes animes vus"
            entries={seenEntries}
            selectedIds={selectedIds}
            onToggle={toggleChecklistAnime}
            expanded={seenExpanded}
            onToggleExpanded={() => setSeenExpanded((prev) => !prev)}
          />
        </div>

        <div className="base-picker__actions">
          <button type="button" className="primary" onClick={handleRecommend} disabled={baseAnimes.length === 0}>
            Me conseiller un anime
          </button>
          {hasSomethingToReset && (
            <button type="button" onClick={handleReset}>
              Réinitialiser
            </button>
          )}
          <label className="gacha-toggle">
            <input type="checkbox" checked={gachaMode} onChange={toggleGachaMode} />
            Mode gacha
          </label>
        </div>
      </div>

      {status === 'loading' && <p>Recherche de suggestions...</p>}
      {status === 'empty_base' && <p>Ajoute d'abord des animes à ta liste pour ce mode.</p>}
      {status === 'error' && (
        <p role="alert">
          Impossible de contacter AniList, réessaie plus tard.{' '}
          <button type="button" onClick={() => runRecommendation(lastBaseIds)}>
            Réessayer
          </button>
        </p>
      )}

      <div className="results-grid">
        {displayedCards.map(({ entry, bonus }) => renderCard(entry, { bonus }))}
      </div>

      {results.length > 0 && status !== 'exhausted' && (
        <button type="button" onClick={handleSeeMore} disabled={loadingMore}>
          {loadingMore ? 'Recherche...' : "Voir d'autres"}
        </button>
      )}
      {status === 'exhausted' && <p>Plus de suggestions dans ce lot, relance une recherche.</p>}
    </section>
  );
}

export default Home;
