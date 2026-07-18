import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import AnimeCard from '../components/AnimeCard.jsx';
import { fetchRecommendationData } from '../recommend/fetchRecommendationData.js';
import { pickWeighted } from '../recommend/pickResults.js';
import { getList, upsertAnime } from '../storage/listStorage.js';

function Home() {
  const navigate = useNavigate();
  const [baseAnimes, setBaseAnimes] = useState([]);
  const [pool, setPool] = useState([]);
  const [shownIds, setShownIds] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [lastBaseIds, setLastBaseIds] = useState([]);

  function addBaseAnime(anime) {
    setBaseAnimes((prev) => (prev.some((a) => a.id === anime.id) ? prev : [...prev, anime]));
  }

  async function runRecommendation(baseAnimeIds) {
    setLastBaseIds(baseAnimeIds);
    setStatus('loading');
    try {
      const { pool: newPool } = await fetchRecommendationData(baseAnimeIds);
      const { picked } = pickWeighted(newPool, 5);
      setPool(newPool);
      setShownIds(picked.map((entry) => entry.media.id));
      setResults(picked);
      setStatus('idle');
    } catch (error) {
      setStatus(error.message === 'base_vide' ? 'empty_base' : 'error');
    }
  }

  function handleManualRecommend() {
    runRecommendation(baseAnimes.map((anime) => anime.id));
  }

  function handleFromSeen() {
    const ids = getList()
      .filter((entry) => entry.status === 'vu')
      .map((entry) => entry.animeId);
    runRecommendation(ids);
  }

  function handleFromFavorites() {
    const ids = getList()
      .filter((entry) => entry.note === 'coup_de_coeur')
      .map((entry) => entry.animeId);
    runRecommendation(ids);
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
  }

  return (
    <section>
      <h2>Recommandation</h2>
      <SearchBar onSelect={addBaseAnime} />
      <ul>
        {baseAnimes.map((anime) => (
          <li key={anime.id}>{anime.title}</li>
        ))}
      </ul>
      <button type="button" onClick={handleManualRecommend} disabled={baseAnimes.length === 0}>
        Me conseiller un anime
      </button>
      <button type="button" onClick={handleFromSeen}>
        Selon mes vus
      </button>
      <button type="button" onClick={handleFromFavorites}>
        Selon mes coups de cœur
      </button>

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
        {results.map((entry) => (
          <AnimeCard
            key={entry.media.id}
            anime={entry.media}
            onAddSeen={handleAddSeen}
            onExclude={handleExclude}
            onClick={(anime) => navigate(`/anime/${anime.id}`)}
          />
        ))}
      </div>

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
