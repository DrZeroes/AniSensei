import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import AnimeCard from '../components/AnimeCard.jsx';
import ChecklistSection from '../components/ChecklistSection.jsx';
import { fetchRecommendationData } from '../recommend/fetchRecommendationData.js';
import { pickWeighted } from '../recommend/pickResults.js';
import { explainMatch, buildScoreTooltip } from '../recommend/explain.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

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
  const [shownIds, setShownIds] = useState([]);
  const [results, setResults] = useState([]);
  const [discoveryPick, setDiscoveryPick] = useState(null);
  const [status, setStatus] = useState('idle');
  const [lastBaseIds, setLastBaseIds] = useState([]);
  const [markedEntries, setMarkedEntries] = useState({});

  const localList = getList();
  const favoriteEntries = localList.filter((entry) => entry.note === 'coup_de_coeur');
  // Anime already listed under "coups de cœur" aren't repeated here, even if also marked "vu".
  const seenEntries = localList.filter((entry) => entry.status === 'vu' && entry.note !== 'coup_de_coeur');
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
      setBaseList(newBaseList);
      setFavoritesList(newFavoritesList);
      setShownIds(picked.map((entry) => entry.media.id));
      setResults(picked);
      setDiscoveryPick(newDiscoveryPick);
      setStatus('idle');
    } catch (error) {
      setStatus(error.message === 'base_vide' ? 'empty_base' : 'error');
    }
  }

  function handleRecommend() {
    runRecommendation(baseAnimes.map((anime) => anime.id));
  }

  function handleReset() {
    setPool([]);
    setShownIds([]);
    setResults([]);
    setDiscoveryPick(null);
    setStatus('idle');
  }

  function handleSeeMore() {
    const { picked, exhausted } = pickWeighted(pool, 5, shownIds);
    setShownIds((prev) => [...prev, ...picked.map((entry) => entry.media.id)]);
    setResults(picked);
    setStatus(exhausted ? 'exhausted' : 'idle');
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

  function renderCard(entry) {
    return (
      <AnimeCard
        key={entry.media.id}
        anime={entry.media}
        listEntry={markedEntries[entry.media.id] ?? null}
        score={entry.score}
        reason={explainMatch(entry.media, baseList)}
        scoreDetail={buildScoreTooltip(entry.media, baseList, favoritesList)}
        onAddSeen={handleAddSeen}
        onExclude={handleExclude}
        onClick={(anime) => navigate(`/anime/${anime.id}`)}
      />
    );
  }

  const hasSomethingToReset = results.length > 0 || discoveryPick !== null || status !== 'idle';

  return (
    <section>
      <h2>Recommandation</h2>

      <div className="base-picker">
        <SearchBar onSelect={addBaseAnime} />

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
          />
          <ChecklistSection
            title="Mes animes vus"
            entries={seenEntries}
            selectedIds={selectedIds}
            onToggle={toggleChecklistAnime}
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

      <div className="results-grid">{results.map(renderCard)}</div>

      {discoveryPick && (
        <div className="discovery-pick">
          <h3>Découverte</h3>
          {renderCard(discoveryPick)}
        </div>
      )}

      {results.length > 0 && status !== 'exhausted' && (
        <button type="button" onClick={handleSeeMore}>
          Voir d'autres
        </button>
      )}
      {status === 'exhausted' && <p>Plus de suggestions dans ce lot, relance une recherche.</p>}
    </section>
  );
}

export default Home;
