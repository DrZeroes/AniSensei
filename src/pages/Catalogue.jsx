import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard.jsx';
import { browseCatalogue } from '../api/queries.js';
import { getList } from '../storage/listStorage.js';

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Popularité' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'START_DATE_DESC', label: 'Année' },
  { value: 'TITLE_ROMAJI', label: 'Titre' },
];

function Catalogue() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('POPULARITY_DESC');
  const [page, setPage] = useState(1);
  const [media, setMedia] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState('idle');

  async function loadPage(targetPage, replace) {
    setStatus('loading');
    try {
      const result = await browseCatalogue({
        page: targetPage,
        genre: genre || null,
        year: year ? Number(year) : null,
        sort: [sort],
      });
      setMedia((prev) => (replace ? result.media : [...prev, ...result.media]));
      setHasNextPage(result.hasNextPage);
      setStatus(result.media.length === 0 && replace ? 'empty' : 'idle');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, year, sort]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, false);
  }

  const localList = getList();
  function findListEntry(animeId) {
    return localList.find((entry) => entry.animeId === animeId) ?? null;
  }

  return (
    <section>
      <h2>Catalogue</h2>
      <div className="catalogue-filters">
        <input
          type="text"
          placeholder="Genre (ex: Action)"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          aria-label="Filtrer par genre"
        />
        <input
          type="number"
          placeholder="Année"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Filtrer par année"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Trier par">
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {status === 'error' && (
        <p role="alert">
          Impossible de charger le catalogue, réessaie plus tard.{' '}
          <button type="button" onClick={() => loadPage(page, page === 1)}>
            Réessayer
          </button>
        </p>
      )}
      {status === 'empty' && <p>Aucun anime trouvé.</p>}

      <div className="results-grid">
        {media.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            listEntry={findListEntry(anime.id)}
            onClick={(item) => navigate(`/anime/${item.id}`)}
          />
        ))}
      </div>

      {hasNextPage && (
        <button type="button" onClick={handleLoadMore} disabled={status === 'loading'}>
          Charger plus
        </button>
      )}
    </section>
  );
}

export default Catalogue;
