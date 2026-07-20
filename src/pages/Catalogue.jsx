import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard.jsx';
import { browseCatalogue, getGenreCollection, getTagCollection } from '../api/queries.js';
import { getList, upsertAnime } from '../storage/listStorage.js';
import { translateGenre } from '../i18n/genreLabels.js';
import { translateTag } from '../i18n/tagLabels.js';

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Popularité' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'START_DATE_DESC', label: 'Année' },
  { value: 'TITLE_ROMAJI', label: 'Titre' },
];

const SEARCH_DEBOUNCE_MS = 300;
// If everything popular has already been marked "vu"/excluded, a single page
// could come back almost entirely hidden — keep pulling more pages until
// there's a decent number of visible results, capped so this can't spiral
// into dozens of requests for someone who's marked nearly everything.
const MIN_VISIBLE_PER_LOAD = 10;
const MAX_PAGES_PER_LOAD = 5;

function Catalogue() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availableGenres, setAvailableGenres] = useState([]);
  const [genres, setGenres] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagQuery, setTagQuery] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('POPULARITY_DESC');
  const [page, setPage] = useState(1);
  const [media, setMedia] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState('idle');
  const [markedEntries, setMarkedEntries] = useState({});
  const [includeSeen, setIncludeSeen] = useState(false);
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const requestIdRef = useRef(0);

  function getHiddenIds() {
    const list = getList();
    return {
      seenIds: new Set(list.filter((entry) => entry.status === 'vu').map((entry) => entry.animeId)),
      excludedIds: new Set(list.filter((entry) => entry.excluded).map((entry) => entry.animeId)),
    };
  }

  async function loadPage(targetPage, replace) {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    try {
      const { seenIds, excludedIds } = getHiddenIds();
      const isHidden = (anime) =>
        (!includeSeen && seenIds.has(anime.id)) || (!includeExcluded && excludedIds.has(anime.id));

      let currentPage = targetPage;
      let fetchedMedia = [];
      let hasMore = false;

      for (let attempt = 0; attempt < MAX_PAGES_PER_LOAD; attempt += 1) {
        const result = await browseCatalogue({
          page: currentPage,
          search: debouncedSearch,
          genres,
          tags,
          year: year ? Number(year) : null,
          sort: [sort],
        });
        if (requestIdRef.current !== requestId) return; // a newer request has since been issued; discard this stale response
        fetchedMedia = [...fetchedMedia, ...result.media];
        hasMore = result.hasNextPage;

        const visibleCount = fetchedMedia.filter((anime) => !isHidden(anime)).length;
        if (visibleCount >= MIN_VISIBLE_PER_LOAD || !hasMore) break;
        currentPage += 1;
      }

      setPage(currentPage);
      setMedia((prev) => (replace ? fetchedMedia : [...prev, ...fetchedMedia]));
      setHasNextPage(hasMore);
      setStatus(fetchedMedia.length === 0 && replace ? 'empty' : 'idle');
    } catch {
      if (requestIdRef.current !== requestId) return;
      setStatus('error');
    }
  }

  useEffect(() => {
    getGenreCollection().then(setAvailableGenres);
    getTagCollection().then(setAvailableTags);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, genres, tags, year, sort]);

  function toggleGenre(genre) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  function addTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagQuery('');
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  // Combobox: the datalist below handles suggesting/autocompleting as the user
  // types (native browser behaviour). As soon as the value is an exact tag
  // match — whether picked from the suggestion list or typed by hand — it's
  // committed immediately, no Enter keypress required.
  function handleTagQueryChange(event) {
    const value = event.target.value.trim().toLowerCase();
    // The suggestion list shows French labels, but the underlying AniList tag
    // (English) is what's actually stored/filtered on — match against either.
    const match = availableTags.find(
      (tag) => translateTag(tag).toLowerCase() === value || tag.toLowerCase() === value
    );
    if (match) {
      addTag(match);
    } else {
      setTagQuery(event.target.value);
    }
  }

  function handleLoadMore() {
    if (status === 'loading') return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, false);
  }

  function handleResetFilters() {
    setSearch('');
    setGenres([]);
    setTags([]);
    setTagQuery('');
    setYear('');
    setSort('POPULARITY_DESC');
    setIncludeSeen(false);
    setIncludeExcluded(false);
  }

  const hasActiveFilters =
    search !== '' ||
    genres.length > 0 ||
    tags.length > 0 ||
    year !== '' ||
    sort !== 'POPULARITY_DESC' ||
    includeSeen ||
    includeExcluded;

  const localList = getList();
  function findListEntry(animeId) {
    return markedEntries[animeId] ?? localList.find((entry) => entry.animeId === animeId) ?? null;
  }

  // Hidden by default so the catalogue surfaces things you haven't seen (or
  // explicitly don't want recommended) yet; each checkbox opts back in.
  const { seenIds, excludedIds } = getHiddenIds();
  const visibleMedia = media.filter((anime) => {
    if (!includeSeen && seenIds.has(anime.id)) return false;
    if (!includeExcluded && excludedIds.has(anime.id)) return false;
    return true;
  });

  function handleAddSeen(anime) {
    upsertAnime({
      animeId: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      genres: anime.genres,
      studios: anime.studios,
      tags: anime.tags,
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
      tags: anime.tags,
      seasonYear: anime.seasonYear,
      excluded: true,
    });
    setMarkedEntries((prev) => ({
      ...prev,
      [anime.id]: { status: prev[anime.id]?.status ?? 'a_voir', excluded: true, note: null },
    }));
  }

  return (
    <section>
      <h2>Catalogue</h2>
      <div className="catalogue-filters">
        <input
          type="text"
          className="catalogue-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un anime par titre..."
          aria-label="Rechercher un anime par titre"
        />
        <fieldset className="genre-filter">
          <legend>Genres</legend>
          <div className="genre-filter__options">
            {availableGenres.map((genre) => (
              <label key={genre} className="genre-chip">
                <input
                  type="checkbox"
                  checked={genres.includes(genre)}
                  onChange={() => toggleGenre(genre)}
                />
                {translateGenre(genre)}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tag-filter">
          <legend>Tags</legend>
          {tags.length > 0 && (
            <div className="tag-filter__selected">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tag-chip tag-chip--selected"
                  onClick={() => removeTag(tag)}
                  aria-label={`Retirer le tag ${translateTag(tag)}`}
                >
                  {translateTag(tag)} ×
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            list="tag-options"
            value={tagQuery}
            onChange={handleTagQueryChange}
            placeholder="Ajouter un tag..."
            aria-label="Ajouter un tag"
          />
          <datalist id="tag-options">
            {availableTags
              .filter((tag) => !tags.includes(tag))
              .map((tag) => (
                <option key={tag} value={translateTag(tag)} />
              ))}
          </datalist>
        </fieldset>
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
        <label className="catalogue-toggle">
          <input
            type="checkbox"
            checked={includeSeen}
            onChange={(event) => setIncludeSeen(event.target.checked)}
          />
          Inclure les animes déjà vus
        </label>
        <label className="catalogue-toggle">
          <input
            type="checkbox"
            checked={includeExcluded}
            onChange={(event) => setIncludeExcluded(event.target.checked)}
          />
          Inclure les animes exclus
        </label>
        {hasActiveFilters && (
          <button type="button" onClick={handleResetFilters}>
            Réinitialiser les filtres
          </button>
        )}
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
        {visibleMedia.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            listEntry={findListEntry(anime.id)}
            onAddSeen={handleAddSeen}
            onExclude={handleExclude}
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
