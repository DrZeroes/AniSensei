import { useEffect, useState } from 'react';
import { searchAnime } from '../api/queries.js';

const DEBOUNCE_MS = 300;

function SearchBar({ onSelect, onQuickAddSeen }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [markedSeenIds, setMarkedSeenIds] = useState(new Set());

  useEffect(() => {
    if (term.trim().length === 0) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }

    let ignore = false;
    setStatus('loading');
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchAnime(term);
        if (ignore) return;
        setResults(data);
        setStatus('idle');
      } catch {
        if (ignore) return;
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [term]);

  function handleSelect(anime) {
    onSelect(anime);
    setTerm('');
  }

  function handleQuickAddSeen(anime) {
    onQuickAddSeen(anime);
    setMarkedSeenIds((prev) => new Set(prev).add(anime.id));
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Rechercher un anime..."
        aria-label="Rechercher un anime"
      />
      {status === 'error' && <p role="alert">Recherche indisponible, réessaie plus tard.</p>}
      {status === 'idle' && term.trim().length > 0 && results.length === 0 && (
        <p>Aucun anime trouvé.</p>
      )}
      {results.length > 0 && (
        <ul>
          {results.map((anime) => {
            const isMarkedSeen = markedSeenIds.has(anime.id);
            return (
              <li key={anime.id} className={isMarkedSeen ? 'search-bar__item search-bar__item--seen' : 'search-bar__item'}>
                <button type="button" className="search-bar__title" onClick={() => handleSelect(anime)}>
                  {anime.title}
                </button>
                {onQuickAddSeen && (
                  <button
                    type="button"
                    className="search-bar__quick-add"
                    onClick={() => handleQuickAddSeen(anime)}
                    aria-label={`Marquer ${anime.title} comme vu`}
                    title="Ajouter directement à mes animes vus"
                    disabled={isMarkedSeen}
                  >
                    {isMarkedSeen ? 'Vu ✓' : '+ Vu'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
